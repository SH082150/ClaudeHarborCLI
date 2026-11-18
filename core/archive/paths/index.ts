/**
 * 路径定位：全项目所有路径的唯一出处。
 *
 * 纪律：任何模块禁止自行拼路径，一律从这里取；新增路径先在此登记。
 * home 可注入——测试时传临时目录即可一行换全盘。
 */

import { homedir } from "node:os";
import { join } from "node:path";

/** Harbor 侧（~/.claudeharbor）的全部路径。 */
export interface HarborPaths {
  /** `~/.claudeharbor` 根目录。 */
  readonly harborHome: string;
  /** providers 目录（一家供应商一个 <UUID>.json，含密钥，权限 600）。 */
  readonly providersDir: string;
  /** profiles 目录（sidecar 底账，文件名 = ProfileID）。 */
  readonly profilesDir: string;
  /** providers/_meta.json 全路径（供应商索引）。 */
  readonly providersMeta: string;
  /** profiles/_meta.json 全路径（profile 索引 + 激活记录）。 */
  readonly profilesMeta: string;
}

/** Claude 侧（Desktop configLibrary）的全部路径。macOS 实测路径。 */
export interface ClaudePaths {
  /** Claude-3p 的 configLibrary 目录（<ProfileID>.json 与 Desktop 同名）。 */
  readonly configLibrary: string;
  /** configLibrary/_meta.json 全路径（profile 名单 + appliedId）。 */
  readonly meta: string;
}

/** Harbor 侧路径表；home 缺省取 os.homedir()。纯计算，无副作用。 */
export function harborPaths(home: string = homedir()): HarborPaths {
  const harborHome = join(home, ".claudeharbor");
  const providersDir = join(harborHome, "providers");
  const profilesDir = join(harborHome, "profiles");
  return {
    harborHome,
    providersDir,
    profilesDir,
    providersMeta: join(providersDir, "_meta.json"),
    profilesMeta: join(profilesDir, "_meta.json"),
  };
}

/** Claude 侧路径表；home 缺省取 os.homedir()。纯计算，无副作用。 */
export function claudePaths(home: string = homedir()): ClaudePaths {
  const configLibrary = join(
    home,
    "Library",
    "Application Support",
    "Claude-3p",
    "configLibrary",
  );
  return {
    configLibrary,
    meta: join(configLibrary, "_meta.json"),
  };
}
