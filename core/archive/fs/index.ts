/**
 * 文件原语：所有档案写的唯一底层。
 *
 * 三道闸都装在这层：
 * - 防断电：先写同目录临时文件，再 rename 原子替换目标，目标路径上
 *   永远不会出现半份内容。
 * - 防泄密：写前 chmod 设定权限，含密钥文件用 SECRET_MODE 仅本人可读。
 * - 防半份 JSON：临时文件改名前先完整序列化，读方只可能看到整份或没有。
 *
 * 本层不认业务——不知道什么是 provider/profile，只做"安全地写 JSON"。
 * 依据：core/archive/fs/README.md、core/archive/fs/index.md。
 */

import { chmodSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** 含密钥文件（providers、advanced sidecar）的权限：仅本人可读。 */
export const SECRET_MODE = 0o600;

/** 无密钥文件的权限：所有人可读。 */
export const NORMAL_MODE = 0o644;

/**
 * 原子写 JSON：序列化 → 同目录临时文件 → chmod(mode) → rename 覆盖目标。
 * 不创建目录结构（调用方保证父目录存在）。
 * 成功返回 void，任何异常上抛（临时文件尽力清理后）。
 */
export function atomicWriteJson(path: string, obj: unknown, mode: number): void {
  const json = JSON.stringify(obj, null, 2) + "\n";
  // 同目录临时文件：rename 原子性只在同一文件系统内成立，绝不能跨目录。
  const tmp = join(
    dirOf(path),
    `.${baseOf(path)}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`,
  );
  try {
    writeFileSync(tmp, json, { encoding: "utf8", mode });
    chmodSync(tmp, mode);
    renameSync(tmp, path);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // 临时文件已不存在（如 rename 已成功后别的步骤失败）则无需清理。
    }
    throw err;
  }
}

/**
 * 容错读 JSON：文件不存在返回 null；JSON 损坏抛带路径的中文错误，
 * 由调用方决定语义；其余读异常同样上抛。
 */
export function readJson(path: string): unknown {
  if (!existsSync(path)) return null;
  const text = readFileSync(path, "utf8");
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`档案文件损坏，无法解析 JSON：${path}（${(err as Error).message}）`, {
      cause: err,
    });
  }
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  if (i < 0) return ".";
  return i === 0 ? "/" : path.slice(0, i);
}

function baseOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? path : path.slice(i + 1);
}
