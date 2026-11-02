# dsh-session-deliverables

[中文](README.md) · [English](README.en.md)

A DeepSeek Harness (DSH) Web plugin: adds a **文件 / Files** view to every Session header that lists the files the Session delivered, and downloads any of them as an attachment — over the intranet or through a public reverse proxy.

## What it does

- **Files view in the Session header** — next to Gallery / Team, lists the deliverables declared with the `present` tool: Word, Excel, PPT, PDF, Markdown, images, video, audio, archives.
- **One-click attachment download** — click a row (or its 下载 / Download button); the Host streams the bytes with `Content-Disposition: attachment`, correct `Content-Type`, Chinese filenames included.
- **Optional workspace outputs** — tick 含工作区成果 to also list document/media files created in the Session workspace while it ran (code, scripts, logs, uploads are never listed).
- **Sidebar preview button** — a 下载 button in the native DSH document-preview header (Excel, PDF, images, and other files rendered by the native preview).

## Why it stays small

The list is derived from the durable Session log (`deliverables/presented`) plus, on request, a bounded workspace walk. Downloads are scoped to the Session workspace or to files the Session's own log names; anything else is `403`. The plugin registers two authenticated Fetch routes on the DSH Connection fence, so it inherits the GUI's login and Host/Origin checks and needs no separate service.

## Install

```bash
dsh plugin --profile web add dsh-session-deliverables
```

Or straight from this repository:

```bash
dsh plugin --profile web add github:xiaoran0829/dsh-session-deliverables
```

or install it from a source checkout:

```bash
dsh plugin --profile web add /path/to/dsh-session-deliverables
```

Restart `dsh web` after the first install. The plugin has no configuration.

## Requirements

- DSH Web (tested on `0.2.1-rc.3`).
- Linux/macOS/Windows Host with Node.js 20+.
- A Session that uses the built-in `present` tool for its final deliverables (that is what the view lists).

## Security model

- Both routes are registered on `ctx.connection.fetch`, so only the authenticated owner browser passes the fence; the public login proxy keeps working unchanged.
- `GET /api/session-files.list?sessionId=…` returns metadata only.
- `GET /api/session-files.download?sessionId=…&path=…` resolves the path through the composed filesystem and refuses anything outside the Session workspace unless the Session log itself declared that exact file.
- No writes, no background jobs, no third-party requests.

## Development

```bash
node --check index.js
node --check client.js
```

The Host half is plain ESM; the browser half is a lazy `window.__ModuleLoader__` factory that depends only on React.

## License

MIT
