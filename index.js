/**
 * Host half of the session-files bundle.
 *
 * Two authenticated Fetch routes on the Connection fence:
 *  - GET /api/session-files.list     — the deliverables this Session declared
 *  - GET /api/session-files.download — one of them as a download
 *
 * The list is the Session's declared deliverables (`deliverables/presented`),
 * plus, only when the caller asks, documents and media created in the Session
 * workspace while it ran. Code and other working files are never offered, and
 * uploaded attachments are not part of this view. Nothing is cached; a deleted
 * file simply drops out. Downloads are scoped to the Session workspace or to
 * files the Session's own log names.
 */
import { basename, extname, join, relative, sep } from 'node:path'
import { readdir, stat as fsStat } from 'node:fs/promises'

/** Log prefix for this plugin. */
const PLUGIN_ID = 'dsh-session-deliverables'

/** Route: JSON list of one Session's deliverables. */
const LIST_PATH = '/api/session-files.list'
/** Route: one deliverable as a download. */
const DOWNLOAD_PATH = '/api/session-files.download'
/** Delivery rank when several events name one file. */
const KIND_RANK = { presented: 1, workspace: 0 }
/** Bytes per streamed response chunk. */
const CHUNK_BYTES = 1024 * 1024
/** Directory names never walked by the recent-workspace supplement. */
const WORKSPACE_SKIP = new Set(['node_modules', '__pycache__', '.venv', 'venv', '.cache', '.pnpm-store', '.next', '.turbo'])
/** Most recently modified workspace files the supplement adds to one list. */
const WORKSPACE_MAX_FILES = 200
/** Most directory entries the supplement probes in one request. */
const WORKSPACE_MAX_STAT = 20000
/** Wall-clock budget for the supplement. */
const WORKSPACE_DEADLINE_MS = 3000
/** Deepest directory level the supplement walks. */
const WORKSPACE_MAX_DEPTH = 12
/** Deliverable-style extensions the workspace supplement may offer: documents, media, archives. */
const DELIVERABLE_EXTENSIONS = new Set([
  '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx', '.pdf', '.rtf', '.odt', '.ods', '.odp',
  '.md', '.markdown', '.txt',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tif', '.tiff', '.heic', '.avif',
  '.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v',
  '.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg',
  '.zip', '.7z', '.tar', '.gz',
])
/** Media types served with a download; everything else is octet-stream. */
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.markdown': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.csv': 'text/csv; charset=utf-8',
  '.tsv': 'text/tab-separated-values; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',
  '.7z': 'application/x-7z-compressed',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
}

/** Services this Host plugin needs before it activates. */
export const inject = ['connection', 'sessionQuery', 'sessions', 'fs']

/** Validate the optional Session argument. */
function requireSessionId(query) {
  const sessionId = query.get('sessionId')
  return sessionId !== null && sessionId.trim() !== '' ? sessionId : undefined
}

/** One plain JSON response. */
function jsonResponse(status, value) {
  return Response.json(value, { status, headers: { 'cache-control': 'no-store' } })
}

/** One plain-text failure. */
function textResponse(status, text) {
  return new Response(text, { status, headers: { 'cache-control': 'no-store' } })
}

/** The Session's working directory, live when available, else from storage. */
async function sessionCwd(ctx, sessionId) {
  const live = ctx.sessions.get(sessionId)
  if (live !== undefined) return live.header.cwd
  const snapshot = await ctx.sessionQuery.readSession(sessionId)
  return snapshot.session.cwd
}

/** Whether one extension belongs to the deliverable-style set. */
function isDeliverableExtension(name) {
  return DELIVERABLE_EXTENSIONS.has(extname(String(name ?? '')).toLowerCase())
}

/** Deliverable rows one Session log yields, before filesystem resolution. */
function collectCandidates(events) {
  const rows = []
  for (const event of events) {
    if (event.type !== 'deliverables/presented') continue
    const data = event.data
    if (data === undefined || data === null || typeof data !== 'object') continue
    const files = Array.isArray(data.files) ? data.files : []
    for (const file of files) {
      if (file === null || typeof file !== 'object' || typeof file.path !== 'string') continue
      rows.push({
        pathArg: file.path,
        time: typeof event.time === 'number' ? event.time : 0,
        description: typeof file.description === 'string' ? file.description : undefined,
      })
    }
  }
  return rows
}

/** Relative display path inside the Session working directory, else the absolute path. */
function displayPathOf(cwd, absolutePath) {
  if (typeof cwd !== 'string' || cwd === '') return absolutePath
  const rel = relative(cwd, absolutePath)
  if (rel === '') return basename(absolutePath)
  if (rel.startsWith(`..${sep}`) || rel === '..' || rel.startsWith(sep)) return absolutePath
  return rel
}

/** Resolve presented candidates against the composed filesystem and merge them by file. */
async function resolveCandidates(ctx, rows, cwd) {
  const files = new Map()
  const remember = (key, entry) => {
    const previous = files.get(key)
    if (previous === undefined) {
      files.set(key, entry)
      return
    }
    const winner = KIND_RANK[entry.kind] > KIND_RANK[previous.kind] ? entry : previous
    const loser = winner === entry ? previous : entry
    files.set(key, {
      ...winner,
      time: Math.max(winner.time, loser.time),
      description: winner.description ?? loser.description,
      size: winner.size ?? loser.size,
    })
  }
  for (const row of rows) {
    let target
    try {
      target = await ctx.fs.resolve(row.pathArg, cwd === undefined ? undefined : { cwd })
    } catch {
      continue
    }
    let info
    try {
      info = await ctx.fs.stat(target)
    } catch {
      continue
    }
    if (info === undefined || info.type !== 'file') continue
    let absolutePath
    try {
      absolutePath = ctx.fs.processPath(target)
    } catch {
      continue
    }
    remember(absolutePath, {
      kind: 'presented',
      path: absolutePath,
      display: displayPathOf(cwd, absolutePath),
      name: basename(absolutePath),
      size: typeof info.size === 'number' ? info.size : null,
      time: row.time,
      description: row.description,
    })
  }
  return sortByNewest([...files.values()])
}

/** Recently created deliverable-style files under the Session working directory. */
async function scanRecentWorkspaceFiles(cwd, sinceMs, excludedRoots = []) {
  if (typeof cwd !== 'string' || cwd === '') return []
  const files = []
  const startedAt = Date.now()
  let probed = 0
  const pending = [{ directory: cwd, depth: 0 }]
  while (pending.length > 0 && files.length < WORKSPACE_MAX_FILES) {
    if (probed >= WORKSPACE_MAX_STAT || Date.now() - startedAt > WORKSPACE_DEADLINE_MS) break
    const { directory, depth } = pending.pop()
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (files.length >= WORKSPACE_MAX_FILES || probed >= WORKSPACE_MAX_STAT) break
      if (Date.now() - startedAt > WORKSPACE_DEADLINE_MS) break
      if (entry.name.startsWith('.')) continue
      if (entry.isDirectory()) {
        if (depth >= WORKSPACE_MAX_DEPTH || WORKSPACE_SKIP.has(entry.name)) continue
        const childDirectory = join(directory, entry.name)
        // Another registered workspace is its own Session's working area, never this one's output.
        if (excludedRoots.some((root) => childDirectory === root)) continue
        pending.push({ directory: childDirectory, depth: depth + 1 })
        continue
      }
      if (!entry.isFile()) continue
      probed += 1
      if (!isDeliverableExtension(entry.name)) continue
      const absolutePath = join(directory, entry.name)
      let info
      try {
        info = await fsStat(absolutePath)
      } catch {
        continue
      }
      if (info.mtimeMs < sinceMs) continue
      // Created during this Session: an appended or rewritten pre-existing file keeps its
      // original birth time and stays out, so unrelated background output does not fill the view.
      const born = typeof info.birthtimeMs === 'number' && info.birthtimeMs > 0 ? info.birthtimeMs : info.mtimeMs
      if (born < sinceMs) continue
      files.push({ path: absolutePath, name: entry.name, size: info.size, time: info.mtimeMs })
    }
  }
  return files
}

/** Registered workspace roots nested under this Session's directory, other than its own. */
function otherWorkspaceRoots(ctx, cwd) {
  if (typeof cwd !== 'string' || cwd === '') return []
  const registry = ctx.get('workspaceRegistry')
  if (registry === undefined) return []
  const roots = []
  for (const workspace of registry.list()) {
    if (workspace.path === cwd) continue
    if (!workspace.path.startsWith(`${cwd}${sep}`)) continue
    roots.push(workspace.path)
  }
  return roots
}

/** Newest-first ordering shared by every file kind. */
function sortByNewest(list) {
  list.sort((left, right) => {
    if (right.time !== left.time) return right.time - left.time
    return String(left.name).localeCompare(String(right.name))
  })
  return list
}

/** GET /api/session-files.list */
async function handleList(ctx, request) {
  const query = new URL(request.url).searchParams
  const sessionId = requireSessionId(query)
  if (sessionId === undefined) return textResponse(400, 'sessionId is required.')
  let snapshot
  try {
    snapshot = await ctx.sessionQuery.readSession(sessionId)
  } catch {
    return textResponse(404, 'Session not found.')
  }
  const cwd = snapshot.session.cwd
  const rows = collectCandidates(snapshot.events)
  const files = await resolveCandidates(ctx, rows, cwd)
  const createdAt = snapshot.session.createdAt
  const includeWorkspace = query.get('workspace') === '1'
  if (includeWorkspace && cwd !== undefined && typeof createdAt === 'number') {
    const recent = await scanRecentWorkspaceFiles(cwd, createdAt, otherWorkspaceRoots(ctx, cwd))
    const known = new Set(files.map((file) => file.path))
    for (const file of recent) {
      if (known.has(file.path)) continue
      known.add(file.path)
      files.push({
        kind: 'workspace',
        path: file.path,
        display: displayPathOf(cwd, file.path),
        name: file.name,
        size: file.size,
        time: file.time,
      })
    }
  }
  sortByNewest(files)
  return jsonResponse(200, {
    sessionId,
    cwd: cwd ?? null,
    generatedAt: Date.now(),
    files,
  })
}

/** One ReadableStream over a bounded byte-chunk walk of a regular file. */
function byteChunkStream(fs, target, size, signal) {
  const known = typeof size === 'number' && Number.isFinite(size) && size >= 0
  let offset = 0
  return new ReadableStream({
    async pull(controller) {
      try {
        if (known && offset >= size) {
          controller.close()
          return
        }
        const length = known ? Math.min(CHUNK_BYTES, size - offset) : CHUNK_BYTES
        const chunk = await fs.readByteRange(target, { offset, length }, signal)
        if (chunk.length === 0) {
          controller.close()
          return
        }
        offset += chunk.length
        controller.enqueue(chunk)
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

/** Sanitize one suggested download filename. */
function safeFileName(name) {
  const leaf = String(name ?? '')
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '_')
    .trim()
  return leaf === '' ? 'download' : leaf
}

/** Content-Disposition for one attachment filename, ASCII fallback plus RFC 5987. */
function contentDisposition(name) {
  const safe = safeFileName(name)
  const ascii = safe.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  const encoded = encodeURIComponent(safe).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${ascii === '' ? 'download' : ascii}"; filename*=UTF-8''${encoded}`
}

/** Media type for one filename. */
function contentTypeOf(name) {
  const extension = extname(String(name ?? '')).toLowerCase()
  return CONTENT_TYPES[extension] ?? 'application/octet-stream'
}

/** Download headers for one file. */
function downloadHeaders(name, size) {
  const headers = {
    'content-type': contentTypeOf(name),
    'content-disposition': contentDisposition(name),
    'cache-control': 'no-store',
  }
  if (typeof size === 'number' && Number.isFinite(size) && size >= 0) headers['content-length'] = String(size)
  return headers
}

/** Whether this Session may read the resolved target: inside its workspace or named by its own log. */
async function isDownloadAllowed(ctx, sessionId, cwd, target) {
  let targetPath
  try {
    targetPath = ctx.fs.processPath(target)
  } catch {
    return false
  }
  if (typeof cwd === 'string' && cwd !== '') {
    try {
      const root = await ctx.fs.resolve(cwd)
      if (ctx.fs.contains(root, target)) return true
    } catch {
      // Fall through to the Session-declared file check.
    }
  }
  let snapshot
  try {
    snapshot = await ctx.sessionQuery.readSession(sessionId)
  } catch {
    return false
  }
  for (const row of collectCandidates(snapshot.events)) {
    let candidate
    try {
      candidate = await ctx.fs.resolve(row.pathArg, snapshot.session.cwd === undefined ? undefined : { cwd: snapshot.session.cwd })
    } catch {
      continue
    }
    try {
      if (ctx.fs.processPath(candidate) === targetPath) return true
    } catch {
      continue
    }
  }
  return false
}

/** GET /api/session-files.download for one deliverable file. */
async function handleDownload(ctx, request) {
  const query = new URL(request.url).searchParams
  const sessionId = requireSessionId(query)
  if (sessionId === undefined) return textResponse(400, 'sessionId is required.')
  const rawPath = query.get('path')
  if (rawPath === null || rawPath.trim() === '') return textResponse(400, 'path is required.')
  let cwd
  try {
    cwd = await sessionCwd(ctx, sessionId)
  } catch {
    return textResponse(404, 'Session not found.')
  }
  let target
  try {
    target = await ctx.fs.resolve(rawPath, cwd === undefined ? undefined : { cwd })
  } catch {
    return textResponse(404, 'File not found.')
  }
  let info
  try {
    info = await ctx.fs.stat(target)
  } catch {
    info = undefined
  }
  if (info === undefined || info.type !== 'file') return textResponse(404, 'File not found.')
  if (!(await isDownloadAllowed(ctx, sessionId, cwd, target))) {
    return textResponse(403, 'Outside this Session workspace.')
  }
  const name = safeFileName(rawPath)
  const size = typeof info.size === 'number' ? info.size : undefined
  const stream = byteChunkStream(ctx.fs, target, size, request.signal)
  return new Response(stream, { headers: downloadHeaders(name, size) })
}


/** Route surfaces differ by DSH line: 0.2.x exposes connection.fetch.register,
 *  0.1.x exposes webServer.register with a Node-style handler. Prefer whichever
 *  exists so one build runs on both; when neither exists, stay loaded and skip. */
function registerRoute(ctx, spec) {
  const fetchSurface = ctx.connection && ctx.connection.fetch
  if (fetchSurface && typeof fetchSurface.register === 'function') {
    const run = () => fetchSurface.register(spec)
    return typeof ctx.effect === 'function' ? ctx.effect(run) : run()
  }
  const serverSurface = ctx.webServer
  if (serverSurface && typeof serverSurface.register === 'function') {
    const run = () => serverSurface.register({ kind: 'exact', path: spec.path, handler: nodeHandler(spec) })
    return typeof ctx.effect === 'function' ? ctx.effect(run) : run()
  }
  const message = `[${PLUGIN_ID}] no HTTP route surface on this DSH; ${spec.path} was not registered`
  if (ctx.logger && typeof ctx.logger.warn === 'function') ctx.logger.warn(message)
  else console.warn(message)
  return () => {}
}

/** Adapt one Fetch handler to the Node request/response pair webServer.register takes. */
function nodeHandler(spec) {
  return async (req, res) => {
    try {
      const host = (req.headers && req.headers.host) || '127.0.0.1'
      const url = new URL(req.url === undefined ? '/' : req.url, `http://${host}`)
      const method = (req.method === undefined ? 'GET' : req.method).toUpperCase()
      const allowed = Array.isArray(spec.methods) ? spec.methods : []
      if (!allowed.includes(method)) {
        if (!res.headersSent) res.writeHead(405)
        res.end()
        return
      }
      let body
      if (spec.requestBody === 'buffered' && method !== 'GET' && method !== 'HEAD') {
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        body = Buffer.concat(chunks)
      }
      const response = await spec.fetch(new Request(url, { method, headers: req.headers, body }))
      const headers = {}
      response.headers.forEach((value, key) => { headers[key] = value })
      if (!res.headersSent) res.writeHead(response.status, headers)
      if (response.body === null) res.end()
      else res.end(Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('internal error')
    }
  }
}

/** Register both routes through whichever route surface this DSH exposes. */
export function apply(ctx) {
  registerRoute(ctx, {
    path: LIST_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: (request) => handleList(ctx, request),
  })
  registerRoute(ctx, {
    path: DOWNLOAD_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: (request) => handleDownload(ctx, request),
  })
}
