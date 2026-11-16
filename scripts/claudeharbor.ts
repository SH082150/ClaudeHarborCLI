/**
 * CLI 入口（scripts/claudeharbor.ts，契约 scripts/claudeharbor.md）。
 *
 * 薄壳：解析全局选项（--home 注入）、按子命令分发到命令组
 * （provider/profile/gateway-run）、统一错误处理与输出风格——成功简短
 * 确认、list/show 表格化、失败打印中文消息 + 非零退出码。不含任何业务
 * 逻辑；core 只认 core/index（由命令组模块负责具体调用），以便将来
 * Electron UI 直接替换本层。
 *
 * 退出码：0 = 成功；1 = 运行时失败（校验不过、core 结构化错误）；
 * 2 = 用法错误（参数个数/未知命令）。
 */

import { pathToFileURL } from "node:url";

/** 全局选项：home 注入（测试/多环境时指向临时目录，缺省用 ~/.claudeharbor）。 */
export interface GlobalOptions {
  readonly home?: string;
}

const HELP = `用法：claudeharbor [--home <目录>] <命令> [参数]

命令：
  provider add <名称> <baseUrl> <密钥> [authScheme]   添加供应商（authScheme 默认 x-api-key）
  provider list | remove <名称> | rename <旧名> <新名>
  profile create <名称> --mode standard|advanced [--port --token --auth-scheme]
  profile list | show <id或名> | import <UUID> | check <id或名> | remove <id或名>
  profile route-add <profile> --name <假名> --provider <供应商名> [--upstream <真模型>]
  profile route-remove <profile> <假名>
  profile route-update <profile> <假名> [--label --tier --upstream --provider]
  activate <id或名>        激活 profile（检查一致性并更新 appliedId；不启动网关）
  gateway-run <id或名>     启动 advanced profile 的本地网关（不写 Claude 目录）
  status                  查看激活状态、两侧一致性与网关运行状态

全局选项：
  --home <目录>   指定用户主目录（用于测试/隔离；仅接受在命令之前）
`;

/** 从 thrown 值里取出中文可读消息；core 的结构化错误都带 message。 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (
    typeof err === "object" && err !== null &&
    "message" in err && typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return String(err);
}

/** 解析全局选项（只接受子命令之前），返回剩余参数与 home。 */
function parseGlobalOptions(argv: readonly string[]): { rest: string[]; home?: string } {
  const rest = [...argv];
  let home: string | undefined;
  for (;;) {
    const head = rest[0];
    if (head === "--home") {
      const value = rest[1];
      if (value === undefined) {
        throw new UsageError("--home 需要一个目录参数");
      }
      home = value;
      rest.splice(0, 2);
    } else if (head !== undefined && head.startsWith("--home=")) {
      home = head.slice("--home=".length);
      if (home.length === 0) throw new UsageError("--home= 后面需要一个目录参数");
      rest.shift();
    } else {
      break;
    }
  }
  return home === undefined ? { rest } : { rest, home };
}

/** 用法错误：打印用法提示，退出码 2。 */
class UsageError extends Error {}

function printUsageError(message: string): number {
  console.error(`错误：${message}`);
  console.error('输入 "claudeharbor --help" 查看用法。');
  return 2;
}

/** 惰性加载命令组模块；兄弟模块尚未交付时给出中文提示而不是模块解析崩溃。 */
async function importGroup(specifier: string): Promise<Record<string, unknown>> {
  try {
    return (await import(specifier)) as Record<string, unknown>;
  } catch (err) {
    if ((err as NodeJS.ErrnoException | null)?.code === "ERR_MODULE_NOT_FOUND") {
      const file = specifier.replace(/^\.\//, "scripts/");
      throw new Error(`命令组尚未就绪：${file} 不存在（待集成后可用）`);
    }
    throw err;
  }
}

type GroupRunner = (args: readonly string[], opts: GlobalOptions) => Promise<number> | number;

async function dispatch(command: string, args: readonly string[], opts: GlobalOptions): Promise<number> {
  switch (command) {
    case "provider": {
      const mod = await importGroup("./provider.ts");
      return (mod.runProvider as GroupRunner)(args, opts);
    }
    case "profile": {
      const mod = await importGroup("./profile.ts");
      return (mod.runProfile as GroupRunner)(args, opts);
    }
    case "activate": {
      const mod = await importGroup("./activate.ts");
      return (mod.runActivate as GroupRunner)(args, opts);
    }
    case "gateway-run": {
      const mod = await importGroup("./gateway-run.ts");
      return (mod.runGatewayRun as GroupRunner)(args, opts);
    }
    case "status": {
      const mod = await importGroup("./status.ts");
      return (mod.runStatus as GroupRunner)(args, opts);
    }
    default:
      throw new UsageError(`未知命令 "${command}"`);
  }
}

/** CLI 主入口：返回进程退出码（0 成功；非 0 失败，消息已打印到 stderr）。 */
export async function main(argv: readonly string[]): Promise<number> {
  let opts: GlobalOptions;
  let rest: readonly string[];
  try {
    const parsed = parseGlobalOptions(argv);
    rest = parsed.rest;
    if (parsed.home !== undefined) {
      // core 的路径表缺省取 os.homedir()（POSIX 下读 $HOME 环境变量），
      // 且模块内惰性缓存：--home 只能经 env 注入，且必须在 core 首次加载前。
      process.env.HOME = parsed.home;
    }
    opts = parsed.home === undefined ? {} : { home: parsed.home };
  } catch (err) {
    if (err instanceof UsageError) return printUsageError(err.message);
    throw err;
  }

  const [command, ...args] = rest;
  if (command === undefined || command === "--help" || command === "-h" || command === "help") {
    console.log(HELP);
    return 0;
  }

  try {
    return await dispatch(command, args, opts);
  } catch (err) {
    if (err instanceof UsageError) return printUsageError(err.message);
    console.error(`错误：${errorMessage(err)}`);
    return 1;
  }
}

// 直接作为脚本运行时（node scripts/claudeharbor.ts ...）进入 main；
// 被测试 import 时只导出符号，不产生副作用。
const invokedAsScript =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedAsScript) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (err: unknown) => {
      console.error(`错误：${errorMessage(err)}`);
      process.exitCode = 1;
    },
  );
}
