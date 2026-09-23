# KanColle Agent

面向《艦隊これくしょん -艦これ-》的个人 AI 助手（Analysis Assistant）。

## 核心原则

```text
Poi MCP              = 玩家现在有什么
KanColle Data MCP    = 游戏数据库是什么
Wiki Researcher      = 游戏应该怎么玩
Main Agent           = 根据这个玩家的情况，现在应该怎么做
```

**不使用** Vector DB / Embedding / RAG / Wiki MCP。

## 组件

| 包 | 说明 |
|----|------|
| `@kancolle-agent/shared` | 共享 Ref / Result / Types |
| `@kancolle-agent/data-mcp` | 静态数据 MCP（stdio） |
| `poi-plugin-kancolle-mcp` | Poi 插件 + 玩家数据 MCP（localhost HTTP） |
| `AGENTS.md` + `.agents/skills/` | 跨客户端工作区规则与可复用 Skills |
| `.opencode/` | OpenCode 专用 Agent 和 MCP 配置 |

## 快速开始

```bash
npm install
npm run build
npm test
npm run verify
```

## 安装到 OpenCode

```bash
npm run setup
```

会检查 OpenCode Agent、共享 Skills 和 MCP 配置文件是否齐备，并打印启动提示。

## 在 Codex Desktop 中使用

在 Codex Desktop 打开本仓库即可开发。根目录 `AGENTS.md` 提供通用规则，Skills 位于 `.agents/skills/`，Codex 可按需发现。MCP 首次配置见 [部署文档](./docs/DEPLOYMENT.md)；Poi MCP 需要 Poi 正在运行并已登录。

## Poi 插件

1. 在 Poi 中安装 `packages/poi-plugin-mcp`
2. 首次运行会在插件数据目录生成 MCP Access Token
3. 将 Token 写入环境变量 `KANCOLLE_POI_MCP_TOKEN`（勿提交 Git）
4. MCP 监听 `http://127.0.0.1:<port>/mcp`（默认端口见 `config/kancolle.json`）

## 数据可靠性

所有服务遵守：

- 不知道 ≠ 没有
- 没有加载 ≠ 数量 0
- 找不到 ≠ 系统错误
- 数据不足 ≠ 可以推测

## 质量检查

```bash
npm run verify
npm run check:tool-docs
```

GitHub Actions 在 Linux/Windows 与 Node.js 20/22 上执行构建、类型检查、单测和 MCP 文档契约检查。

## 文档

- [系统设计](./KanColle%20AI%20Agent%20完整系统设计文档.md)
- [Poi MCP](./docs/POI_MCP.md)
- [Data MCP](./docs/DATA_MCP.md)
- [MCP Tools](./docs/MCP_TOOLS.md)
- [Skills](./docs/SKILLS.md)
- [部署](./docs/DEPLOYMENT.md)

## V1 不实现

自动游戏、自动出击/远征/改修、RAG、Vector DB、云账号同步、网页管理后台。

## License

MIT
