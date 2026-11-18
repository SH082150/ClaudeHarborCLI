# 实施计划（IMPL-PLAN）

> 施工顺序与验收标准。每一步交付物 = 代码 + 单测 + typecheck 通过。
> 对照契约树（../ClaudeHarborCLI-format/）施工；每步结束向 owner 演示。

## 全局约定

- 工作目录：`ClaudeHarborCLI-TEST/`；命令 `npm test` / `npm run typecheck` 必须常绿。
- 测试一律用注入 home / 临时目录 / 假上游，**不碰真实 ~/.claudeharbor 与 Claude 目录**（M5 除外）。
- 写完每个模块，回契约树核对"接收/调用/输出"三栏，不一致以契约为准改实现（或提理由改契约）。

## M1 — 地基 + 供应商库 ✅ 已完成（2026-11-16）

交付：
- `core/types.ts`（全量类型）
- `core/archive/paths/index.ts`、`core/archive/fs/index.ts`
- `core/validate/provider.ts`（+ `index.ts` 导出）
- `core/archive/providers/index.ts`
- `scripts/claudeharbor.ts`（最小分发）+ `scripts/provider-*.ts`
- `test/`：paths 注入测试、fs 原子写与权限测试、providers CRUD/查重/引用拒绝/_meta 重建测试

验收：在临时 home 里完成 add → list → rename → remove 全流程；
重复名拒绝；被引用删除拒绝；`_meta.json` 删掉后能自愈重建。

## M2 — profile 库 + 校验 ✅ 已完成（2026-11-16）

> 交付实录：types/paths/fs/validate/providers/profiles + provider/profile
> CLI；112 测试 111 过 1 跳过（集成占位项），typecheck 0 错。集成期修复：
> _meta 缺失自愈、readline 行缓冲、flag 白名单、validatePort 字符串适配、
> 打码与 ★ 列。

交付：
- `core/validate/route-id.ts`、`core/validate/profile.ts`（并入 index 导出）
- `core/archive/profiles/index.ts`（create/list/show/remove/rename/updateEntries；readOnly 拒绝写）
- `scripts/profile-*.ts`（create/list/show/remove）
- 测试：三种 mode 的 CRUD、routeId 四规则用例（含黑名单/尾 8 位数字）、单供应商规则、条目引用 provider 存在性

验收：临时 home 里建 advanced profile 并加两条不同供应商的路由；
readOnly（手工造一个）的一切写操作被拒。

## M3 — 生成器 + Claude 侧 + 检查门禁 + import + activate ✅ 已完成（2026-11-16）

> 交付实录：generate/claude-meta/check + profiles.importFromClaude + activate/gateway-run
> CLI；148 测试 147 过 1 占位跳过，typecheck 0 错。集成期修复：upsertEntry 对象参数、
> standard 激活的供应商解析、Provider 类型无 id 字段（UUID 在文件名/_meta）。

交付：
- `core/archive/generate/index.ts`（standard/advanced 两条路径）
- `core/archive/claude-meta/index.ts`
- `core/check/index.ts`（gate）
- `core/archive/profiles` 增 `import`
- `scripts/`：`profile import/check`、`activate`、`gateway-run` 骨架
- 测试：generate 快照对照（用 file-formats §4 的示例）；check 的差异枚举
  （含 sealed 只查存在性、数组顺序敏感、Claude 侧缺失三情形）；
  import 生成 readOnly；activate 全链在"假 Claude 目录"（注入路径）跑通

验收：假目录里 activate 一个 advanced profile → Claude 侧文件与
`_meta` 完全符合 file-formats §4.1；check 先报差异、对齐后通过。

## M4 — 网关（0 → 7）✅ 已完成（2026-11-16）

> 交付实录：gateway 全线（errors/probe/models/1-receive/2-auth/3-route-out/
> 4-send/5-receive-upstream/6-route-back/7-reply/0-server）+ gateway-run 真启动
> 接线；204 测试 202 过 2 占位跳过，typecheck 0 错。契约裁决：models 清单含
> 全部条目（含失效路由）、description 缺省=假名、base 兜底仅限「/」、
> 未知路径 404。

交付：`core/gateway/` 全部（errors → probe → models → 0-server →
1-receive → 2-auth → 3-route-out → 4-send → 5 → 6 → 7）；
`activate` 接入真启动。
测试：假上游集成测试——用 gateway-formats.md 的每个示例当用例
（鉴权双头、model 改写、query 保留、SSE 逐块透传与 ping 保留、
客户端中断掐断、404/502 矩阵、models 本地包装、探针 200）。

验收：假上游 + 真网关进程跑通"Desktop（模拟）→ 网关 → 假上游"全链路；
`npm test` 全绿。

## M5 — 真机联调（owner 参与）✅ 已完成（2026-11-17）

> 七项全过：模型列表/发现/连接检查/E3b 假型号对话/Kimi 编程订阅/5 子智能体
> 工作流/"最便宜"→haiku 档分工（E4 实锤）。文件证据：Desktop 自动密封明文 key；
> 会话存储记假名（统计图显示假名 → A 方案完胜，B 方案关闭）；check 门禁对
> Desktop 重写后的真实文件比对通过。Test connection 之谜解开：实测为
> 1-token completion 探测（"Inference — 1-token completion in 497ms"）。

顺序：
1. sealed key：CLI 写明文 → Desktop 是否接受/自动密封
2. E3b：假型号（claude-sonnet-9-9）能否真实发请求
3. E4：多智能体任务观察分档（档位关键字 vs anthropicFamilyTier）
4. Test connection 抓包：Desktop 到底探测什么端点
5. 响应 model 字段 A/B 实验（统计图显示什么）→ 拍板 B 方案与否
6. 真实供应商 key 全流程（DeepSeek 或 Kimi）

验收：owner 用真实 Claude Desktop 完成一次多供应商对话。

## 里程碑之后（不在本计划）

故障转移（fallbacks 字段）、超时兜底、用量统计、Electron UI、
app 级配置、Windows、恢复官方模式。

## 完善批次（2026-11-17）

Owner 拍板的架构决策（整体改，不打补丁；被取代的旧逻辑整体移除）：

1. **创建即同步**：sidecar 创建/条目修改时即按 file-formats §4 推导
   Claude profile 写入 configLibrary（standard 无条目时延迟到有条目再同步）。
   check 门禁只管"激活/启动前两侧一致"，不再代为生成。
   → 首次激活补丁、activate 生成/改写 Claude profile 的步骤整体移除。
2. **激活与网关完全分离**：activate = 对齐名字（claude-meta syncNames）→
   gate → apply（appliedId）→ profiles 侧镜像，干净退出，不启动网关；
   gateway-run 启动前自己做 gate。killOnGatewayBanner 整体移除。
3. **profiles 生命周期收紧**：remove 双侧清理（Claude configLibrary 文件 +
   Claude _meta 条目，配套新增 `claude-meta.removeEntry`）；rename 两侧同步。
4. **新命令**：route-add / route-remove / route-update（条目维护，重推导
   Claude profile）、status（appliedId 状态 + 一致性概览）。
5. **gateway/0-server 新增 `GET /health`**：本地 200 空体，供 status 探活。
6. **封装三件套**：package.json bin + `bin/claudeharbor.ts` 可执行入口
   （npm link 后 `claudeharbor` 直接可用）；README 总目刷新；契约树回同步
   （profiles / claude-meta / gateway-run / scripts / 0-server / check）。


### 完善批次补记（2026-11-17 收尾）
- **meta 先行**：create 无论 mode 都立即登记 Claude _meta 条目；文件是派生物
  （standard 无条目时延迟生成）。根治了 scan 会误删"未同步 standard"的
  结构矛盾。
- **三情形探测产品化**：core/check/scan.ts，activate/gateway-run/status 前置
  自动处置（孤儿删/外来建只读/文件缺失重建）。
- E5 实验结论落档：Desktop 对 dangling appliedId 不自愈不清清理、回退官方
  模式（区域屏）——工具链必须保证永不制造该状态。
