# KanColle Agent 工作区规则

## 游戏分析规则

1. 加载 `kancolle-main` Skill。
2. **只使用二期（2023 服务器迁移后）数据与攻略**，禁止采用一期旧机制/旧数值。
3. 玩家状态使用 Poi MCP。
4. 静态游戏数据使用 KanColle Data MCP。
5. 最新机制、攻略价值与 Data 缺项优先查询官方 Wiki 来源；具备 researcher 子 Agent 的客户端可委派 `.opencode/agents/kcwiki-researcher.md` 的工作流程。无法在线核实时标明不确定性，不用记忆补值。
6. 不根据模型记忆猜测精确游戏数据（改造等级、任务奖励/前置、装备数值、活动信息等）。
7. **凡输出出现具体改造形态（改 / 改二 / 改二乙等），必须先用 Data MCP `kc_ship_remodel` 或 `kc_search` 核实。本回合未查询则禁止当作可执行目标；若仍要提及，必须标注「未核实，可能不存在」。禁止编造不存在的改二。**

职责边界：

- Poi MCP：玩家现在有什么
- Data MCP：游戏数据库是什么（二期）
- kcwiki-researcher：游戏应该怎么玩（二期）
- Main Agent：结合上述信息给出针对当前账号的建议

输出风格：默认中文，先结论、再原因、最后下一步。决策类问题必须给出明确优先级，不要只说“各有优缺点”。

## 工作区与安全规则

- 本仓库包含 `packages/kancolle-data-mcp`、Poi 插件 `packages/poi-plugin-mcp`、共享类型，以及 `.agents/skills/*/SKILL.md` 工作流说明。
- 复杂游戏分析按需读取 `.agents/skills/kancolle-main/SKILL.md` 和对应专项 Skill；不支持原生 Skills 的客户端应显式读取这些文件。
- MCP 和 Poi 插件默认只读。禁止通过代码、脚本或工具自动出击、改装、装备、远征、建造、改修或领取任务。
- 不读取、输出、记录或提交 Poi Cookie、游戏会话、MCP Token、`.env` 与本地私有配置。
- 修改 MCP 工具时，同步更新 `docs/MCP_TOOLS.md`；`npm run check:tool-docs` 必须通过。
- 修改功能后运行 `npm run verify`；若环境无法运行，说明具体阻塞和未验证项。
- 避免无目的的大范围重构；先补回归测试，再按功能边界小步整理。
