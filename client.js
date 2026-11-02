window.__ModuleLoader__.load({
  id: 'dsh-session-deliverables',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace owned by this plugin. */
    const NS = 'session-files'

    const zh = {
      'view.label': '文件',
      'view.subtitle': '本会话交付的文件（Word / Excel / PPT / 图片 / 视频等）',
      'view.count': '{count} 个文件',
      'view.refresh': '刷新',
      'view.loading': '正在读取文件…',
      'view.empty': '本会话还没有交付文件',
      'view.emptyHint': '文件通过 present 交付后会出现在这里。',
      'view.error': '读取文件列表失败',
      'view.retry': '重试',
      'view.download': '下载',
      'view.downloadNamed': '下载 {name}',
      'view.includeWorkspace': '含工作区成果',
      'kind.presented': '交付',
      'kind.workspace': '工作区',
    }
    const en = {
      'view.label': 'Files',
      'view.subtitle': 'Files this session delivered (Word, Excel, PPT, images, video)',
      'view.count': '{count} files',
      'view.refresh': 'Refresh',
      'view.loading': 'Reading files…',
      'view.empty': 'No delivered files yet',
      'view.emptyHint': 'Files delivered with present appear here.',
      'view.error': 'Could not read the file list',
      'view.retry': 'Retry',
      'view.download': 'Download',
      'view.downloadNamed': 'Download {name}',
      'view.includeWorkspace': 'Workspace outputs',
      'kind.presented': 'Delivered',
      'kind.workspace': 'Workspace',
    }

    const CSS = [
      '.dsf-root{display:flex;flex-direction:column;gap:14px;max-width:960px;width:100%;margin:0 auto;padding:20px 24px 40px;box-sizing:border-box;color:var(--dsw-alias-label-primary);font-size:13px}',
      '.dsf-head{display:flex;align-items:baseline;gap:10px}',
      '.dsf-title{font-size:15px;font-weight:600;margin:0;line-height:22px}',
      '.dsf-count{font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.dsf-spacer{flex:1}',
      '.dsf-check{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary);cursor:pointer;user-select:none;white-space:nowrap}',
      '.dsf-check input{accent-color:var(--dsw-alias-brand-primary);width:13px;height:13px;margin:0;cursor:pointer}',
      '.dsf-refresh{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:0;align-self:center}',
      '.dsf-refresh:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dsf-refresh[disabled]{opacity:.5;cursor:default}',
      '.dsf-sub{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:-8px}',
      '.dsf-list{border:.5px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}',
      '.dsf-row{display:flex;align-items:center;gap:12px;padding:9px 14px;cursor:pointer;border:0;border-top:.5px solid var(--dsw-alias-border-l1);color:inherit;background:transparent;width:100%;text-align:left;font:inherit}',
      '.dsf-row:first-child{border-top:0}',
      '.dsf-row:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dsf-row:focus-visible{background:var(--dsw-alias-bg-layer-2);outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
      '.dsf-ext{flex:none;width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700;letter-spacing:.02em;color:#fff;user-select:none}',
      '.dsf-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}',
      '.dsf-name{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsf-meta{font-size:11px;color:var(--dsw-alias-label-secondary);display:flex;gap:6px;align-items:center;min-width:0}',
      '.dsf-display{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
      '.dsf-dot{flex:none;width:2px;height:2px;border-radius:50%;background:currentColor;opacity:.6}',
      '.dsf-kind{flex:none}',
      '.dsf-kind[data-kind=presented]{color:var(--dsw-alias-brand-primary)}',
      '.dsf-dl{flex:none;display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dsw-alias-label-primary);text-decoration:none;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 9px;background:transparent;cursor:pointer;line-height:16px}',
      '.dsf-dl:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dsf-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:56px 16px;color:var(--dsw-alias-label-secondary);font-size:13px;text-align:center}',
      '.dsf-state-title{color:var(--dsw-alias-label-primary);font-size:13px}',
      '.dsf-error{color:var(--dsw-alias-state-error-primary)}',
      '.dsf-action{display:inline-flex;align-items:center;justify-content:center;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;padding:4px 12px;cursor:pointer;font-family:inherit}',
      '.dsf-action:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dsf-docbtn{flex:none;align-self:center;display:inline-flex;align-items:center;gap:4px;height:24px;box-sizing:border-box;padding:3px 6px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:11px;line-height:16px;font-family:inherit;cursor:pointer;white-space:nowrap}',
      '.dsf-docbtn:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dsf-docbtn:focus-visible{background:var(--dsw-alias-bg-layer-2);outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.dsf-docbtn-text{display:inline}',
    ].join('\n')

    const EXTENSION_COLORS = {
      image: '#2f8f5b',
      video: '#7a52cc',
      audio: '#b04a8a',
      document: '#2f6fd0',
      sheet: '#2f8f5b',
      archive: '#c47b2f',
      code: '#5b6472',
      other: '#6b7280',
    }

    /** Visual category for one filename. */
    function categoryOf(name) {
      const dot = String(name).lastIndexOf('.')
      const extension = dot === -1 ? '' : String(name).slice(dot + 1).toLowerCase()
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'tif', 'tiff', 'heic'].includes(extension)) return 'image'
      if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'].includes(extension)) return 'video'
      if (['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac'].includes(extension)) return 'audio'
      if (['xlsx', 'xls', 'csv', 'tsv'].includes(extension)) return 'sheet'
      if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'md', 'markdown', 'txt', 'rtf'].includes(extension)) return 'document'
      if (['zip', 'gz', 'tar', '7z', 'rar', 'xz'].includes(extension)) return 'archive'
      if (['js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'json', 'py', 'sh', 'bash', 'css', 'html', 'htm', 'yml', 'yaml', 'toml', 'go', 'rs', 'java', 'c', 'cpp', 'swift', 'sql'].includes(extension)) return 'code'
      return 'other'
    }

    /** Short extension badge text. */
    function extensionLabel(name) {
      const dot = String(name).lastIndexOf('.')
      if (dot === -1 || dot === String(name).length - 1) return 'FILE'
      const extension = String(name).slice(dot + 1).toUpperCase()
      return extension.length > 4 ? extension.slice(0, 4) : extension
    }

    /** Human-readable byte size. */
    function formatBytes(bytes) {
      if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return ''
      if (bytes < 1024) return `${String(Math.round(bytes))} B`
      const units = ['KB', 'MB', 'GB', 'TB']
      let value = bytes
      let unit = -1
      while (value >= 1024 && unit < units.length - 1) {
        value /= 1024
        unit += 1
      }
      return `${value >= 10 ? String(Math.round(value)) : value.toFixed(1)} ${units[unit]}`
    }

    /** Short local date-time for one event timestamp. */
    function formatTime(time) {
      if (typeof time !== 'number' || time <= 0) return ''
      try {
        return new Intl.DateTimeFormat(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(time))
      } catch {
        return ''
      }
    }

    /** Programmatic download for one listed file. */
    function triggerDownload(sessionId, file) {
      const query = new URLSearchParams({ sessionId, path: String(file.path ?? '') })
      const anchor = document.createElement('a')
      anchor.href = `/api/session-files.download?${query.toString()}`
      anchor.rel = 'noopener'
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    }

    function FileTypeBadge({ name }) {
      const category = categoryOf(name)
      return h('span', {
        className: 'dsf-ext',
        style: { background: EXTENSION_COLORS[category] },
        'aria-hidden': true,
      }, extensionLabel(name))
    }

    function DownloadGlyph() {
      return h('svg', {
        width: 13,
        height: 13,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      }, h('path', { d: 'M8 2.5v7.5' }), h('path', { d: 'm5 7.5 3 3 3-3' }), h('path', { d: 'M3.5 12v1.5h9V12' }))
    }

    function RefreshGlyph() {
      return h('svg', {
        width: 13,
        height: 13,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      }, h('path', { d: 'M13 8a5 5 0 1 1-1.46-3.54' }), h('path', { d: 'M13 2.5V5h-2.5' }))
    }

    function FolderGlyph() {
      return h('svg', {
        width: 28,
        height: 28,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'var(--dsw-alias-state-idle-primary)',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      }, h('path', { d: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2h7a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 17.5 18h-13A1.5 1.5 0 0 1 3 16.5z' }))
    }

    /** One row; the whole row downloads, the button is the explicit control. */
    function FileRow({ sessionId, file, t }) {
      const size = formatBytes(file.size)
      const time = formatTime(file.time)
      const kindLabel = t(`kind.${file.kind}`)
      const onRow = () => {
        triggerDownload(sessionId, file)
      }
      return h('button', {
        type: 'button',
        className: 'dsf-row',
        title: file.path ?? file.name,
        onClick: onRow,
        'data-session-file': file.name,
      },
      h(FileTypeBadge, { name: file.name }),
      h('span', { className: 'dsf-main' },
        h('span', { className: 'dsf-name' }, file.name),
        h('span', { className: 'dsf-meta' },
          h('span', { className: 'dsf-display' }, file.display ?? file.name),
          size === '' ? null : h('span', { className: 'dsf-dot', 'aria-hidden': true }),
          size === '' ? null : h('span', null, size),
          h('span', { className: 'dsf-dot', 'aria-hidden': true }),
          h('span', { className: 'dsf-kind', 'data-kind': file.kind }, kindLabel),
          time === '' ? null : h('span', { className: 'dsf-dot', 'aria-hidden': true }),
          time === '' ? null : h('span', null, time),
        ),
      ),
      h('span', {
        className: 'dsf-dl',
        'aria-hidden': true,
      }, h(DownloadGlyph), t('view.download')))
    }

    function SessionFilesView(props) {
      const sessionId = props.sessionId
      const t = props.t
      const [state, setState] = React.useState({ status: 'loading', files: [], error: null })
      const [withWorkspace, setWithWorkspace] = React.useState(false)
      const generation = React.useRef(0)
      const load = React.useCallback(() => {
        if (typeof sessionId !== 'string' || sessionId === '') {
          setState({ status: 'ready', files: [], error: null })
          return
        }
        generation.current += 1
        const mine = generation.current
        setState((previous) => ({ ...previous, status: 'loading', error: null }))
        const workspace = withWorkspace ? '&workspace=1' : ''
        fetch(`/api/session-files.list?sessionId=${encodeURIComponent(sessionId)}${workspace}`, { headers: { accept: 'application/json' } })
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${String(response.status)}`)
            return response.json()
          })
          .then((payload) => {
            if (mine !== generation.current) return
            const files = Array.isArray(payload?.files) ? payload.files : []
            setState({ status: 'ready', files, error: null })
          })
          .catch((error) => {
            if (mine !== generation.current) return
            setState({ status: 'error', files: [], error: error instanceof Error ? error.message : String(error) })
          })
      }, [sessionId, withWorkspace])

      React.useEffect(() => {
        load()
        return () => {
          generation.current += 1
        }
      }, [load])

      const files = state.files
      const downloading = state.status === 'loading'
      return h('div', { className: 'dsf-root', 'data-session-files-view': true },
        h('style', null, CSS),
        h('div', { className: 'dsf-head' },
          h('h2', { className: 'dsf-title' }, t('view.label')),
          files.length === 0 ? null : h('span', { className: 'dsf-count' }, t('view.count', { count: files.length })),
          h('span', { className: 'dsf-spacer' }),
          h('label', { className: 'dsf-check' },
            h('input', {
              type: 'checkbox',
              checked: withWorkspace,
              onChange: (event) => {
                setWithWorkspace(event.target.checked)
              },
            }),
            t('view.includeWorkspace')),
          h('button', {
            type: 'button',
            className: 'dsf-refresh',
            title: t('view.refresh'),
            'aria-label': t('view.refresh'),
            disabled: downloading,
            onClick: load,
          }, h(RefreshGlyph)),
        ),
        h('div', { className: 'dsf-sub' }, t('view.subtitle')),
        state.status === 'error'
          ? h('div', { className: 'dsf-state' },
            h('span', { className: 'dsf-error' }, t('view.error')),
            h('span', null, state.error ?? ''),
            h('button', { type: 'button', className: 'dsf-action', onClick: load }, t('view.retry')))
          : state.status === 'loading' && files.length === 0
            ? h('div', { className: 'dsf-state' }, h('span', null, t('view.loading')))
            : files.length === 0
              ? h('div', { className: 'dsf-state' },
                h(FolderGlyph),
                h('span', { className: 'dsf-state-title' }, t('view.empty')),
                h('span', null, t('view.emptyHint')))
              : h('div', { className: 'dsf-list' },
                files.map((file, index) => h(FileRow, {
                  key: `${String(file.kind)}:${String(file.path ?? file.attachmentId ?? index)}`,
                  sessionId,
                  file,
                  t,
                }))),
      )
    }

    /** Compact download control for the document preview header. */
    function DownloadAction(props) {
      const absolutePath = props.absolutePath
      const sessionId = props.sessionId
      const t = props.t
      if (typeof absolutePath !== 'string' || absolutePath === '') return null
      const name = absolutePath.split(/[\\/]/).pop() || absolutePath
      const file = { kind: 'written', path: absolutePath, name }
      return h('button', {
        type: 'button',
        className: 'dsf-docbtn',
        title: t('view.downloadNamed', { name }),
        'aria-label': t('view.downloadNamed', { name }),
        onClick: () => {
          triggerDownload(sessionId, file)
        },
      }, h(DownloadGlyph), h('span', { className: 'dsf-docbtn-text' }, t('view.download')))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-files: dictionaries')
        ctx.slots.inject('conversation.view', () => ctx.slots.register({
          name: 'conversation.view',
          id: 'session-files',
          order: 25,
          locale: NS,
          label: () => ctx.locale.bind(NS)('view.label'),
        }, SessionFilesView))
        ctx.slots.inject('sidebar.right.tab.document.actions', () => ctx.slots.register({
          name: 'sidebar.right.tab.document.actions',
          id: 'session-files:download',
          order: 40,
          locale: NS,
        }, DownloadAction))
      },
    }
  },
})
