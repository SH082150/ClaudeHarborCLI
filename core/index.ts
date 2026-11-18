/**
 * 内核统一出口（契约 core/index.md）：汇总导出各子模块公共 API。
 * CLI（scripts/）与将来的 Electron UI 只从这里取货，不允许越过它
 * import 深层文件。
 *
 * 当前已就绪：types、validate、archive/providers。gateway / check /
 * archive 其余子模块由兄弟模块实现，就绪后在此登记导出
 * （契约要求汇总 types、gateway、archive、check、validate）。
 */

export * from "./types.ts";
export * as validate from "./validate/index.ts";
export * as providers from "./archive/providers/index.ts";
export * as profiles from "./archive/profiles/index.ts";
export * as generate from "./archive/generate/index.ts";
export * as claudeMeta from "./archive/claude-meta/index.ts";
export * as check from "./check/index.ts";
export * as fs from "./archive/fs/index.ts";
export * as paths from "./archive/paths/index.ts";
export * as gateway from "./gateway/0-server/index.ts";
export * as usage from "./usage/index.ts";
