# dsh-session-deliverables · 会话文件

一个 DeepSeek Harness（DSH）Web 插件：在**每个会话顶栏**增加「文件」视图，列出该会话交付的文件，并支持一键按附件下载——内网直连或经公网反向代理都可用。

## 功能

- **顶栏「文件」视图**：位于「画廊 / 团队」旁，列出通过 `present` 工具声明的交付物：Word、Excel、PPT、PDF、Markdown、图片、视频、音频、压缩包。
- **一键下载附件**：点击整行或其「下载」按钮，Host 以 `Content-Disposition: attachment` 流式返回文件，`Content-Type` 正确，中文文件名也能正常保存。
- **可选「含工作区成果」**：勾选后额外列出会话运行期间在工作区创建的文档 / 媒体文件；代码、脚本、日志、上传文件不会出现在列表里。
- **侧栏预览下载按钮**：在 DSH 原生文档预览页（Excel、PDF、图片及其他原生预览支持的文件）头部增加「下载」按钮。

## 为什么能做到很小

列表来源是可持久化的会话日志（`deliverables/presented`），勾选「含工作区成果」后再做一次有界的工作区扫描。下载范围限定在会话工作区，或会话日志中明确声明过的文件，其他路径一律返回 `403`。插件在 DSH Connection 上注册两个需要鉴权的 Fetch 路由，直接继承 GUI 的登录态与 Host/Origin 校验，不需要单独起服务。

## 安装

从 npm 安装：

```bash
dsh plugin --profile web add dsh-session-deliverables
```

或直接从本仓库安装：

```bash
dsh plugin --profile web add github:xiaoran0829/dsh-session-deliverables
```

也可以从源码目录安装：

```bash
dsh plugin --profile web add /path/to/dsh-session-deliverables
```

首次安装后重启 `dsh web`。插件没有配置项。

## 环境要求

- DSH Web（在 `0.2.1-rc.3` 上测试通过）。
- Linux / macOS / Windows Host，Node.js 20+。
- 会话需要经内置 `present` 工具声明最终交付物——「文件」视图列的就是这些文件。

## 安全模型

- 两个路由都注册在 `ctx.connection.fetch` 上，只有已登录的所有者浏览器能通过这道栅栏；公网登录反向代理无需任何改动。
- `GET /api/session-files.list?sessionId=…` 只返回元数据。
- `GET /api/session-files.download?sessionId=…&path=…` 通过组合后的文件系统解析路径；除非会话日志本身声明过该文件，否则拒绝会话工作区以外的任何路径。
- 不写文件、不跑后台任务、不发起第三方请求。

## 开发

```bash
node --check index.js
node --check client.js
```

Host 侧是纯 ESM；浏览器侧是惰性的 `window.__ModuleLoader__` 工厂，只依赖 React。

## 接入方式（引导接入）

- 形态：DSH Web Cordis 插件（`dsh.bundle.patch` + `dsh.client`），在 DSH Connection 上注册两个需登录态的 Fetch 路由。
- `package.json#dshWorkshop` 声明为 `harness-cordis` + `third-party` adapter 的 guided 接入；当前没有事务安装、没有 Registry 安装权限，也没有可执行安装步骤。上面「安装」一节的命令是作者本机经验，不构成 Workshop 安装能力。
- 安装或升级插件后需重启 DSH Web 的 profile 才生效。
- 未在 Workshop 官方基线 `@deepseek-ai/dsh@0.1.0-rc.6` 上验证；`evidence` 的安装、失败隔离、热重载、卸载四项均为 `null`（尚无证据）。

## 权限与外部副作用

| 能力 | 事实 |
|---|---|
| 文件读取 | 只读会话日志（`deliverables/presented`）与会话工作区内有界扫描（最多 200 个文件、3 秒预算、深度 12，跳过 node_modules 等目录）；不写文件 |
| HTTP | 在 DSH Connection fence 上注册 `/api/session-files.list` 与 `/api/session-files.download`，继承 GUI 登录态与 Host/Origin 校验 |
| 越界保护 | 下载只允许会话工作区内、或会话日志明确声明过的文件，其余返回 403 |
| 网络外发 | 无。插件不发第三方请求 |
| 进程 | 不起子进程、不跑后台任务、无 install script |
| 不可 generation 回滚 | 下载行为无持久化副作用；插件不修改任何交付物 |

## 兼容与测试

- 作者本机：DSH Web `0.2.1-rc.3`（当前安装版本）。
- 已有检查：`node --check index.js client.js` 通过；无单元/集成测试、无官方基线生命周期测试、无失败注入或热重载证据。

## 已知限制

- 列表只认会话日志里 `present` 声明过的交付物；「含工作区成果」是有界补充，超出预算的文件不会出现。
- 插件没有 dispose 证据，`dshWorkshop.lifecycle.dispose` 如实写 `unknown`。

## 许可证

MIT
