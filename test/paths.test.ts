/**
 * paths 模块单测：用临时 home 注入，断言两侧路径拼接正确。
 *
 * 运行：node --test test/paths.test.ts
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { claudePaths, harborPaths } from "../core/archive/paths/index.ts";

/** 每个用例独立临时目录，结束后清理。 */
function withTempHome(fn: (home: string) => void): void {
  const home = mkdtempSync(join(tmpdir(), "harbor-paths-test-"));
  try {
    fn(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

test("harborPaths：注入 home 后拼出 ~/.claudeharbor 全部路径", () => {
  withTempHome((home) => {
    const p = harborPaths(home);
    assert.equal(p.harborHome, join(home, ".claudeharbor"));
    assert.equal(p.providersDir, join(home, ".claudeharbor", "providers"));
    assert.equal(p.profilesDir, join(home, ".claudeharbor", "profiles"));
    assert.equal(
      p.providersMeta,
      join(home, ".claudeharbor", "providers", "_meta.json"),
    );
    assert.equal(
      p.profilesMeta,
      join(home, ".claudeharbor", "profiles", "_meta.json"),
    );
  });
});

test("claudePaths：注入 home 后拼出 Claude-3p configLibrary 路径", () => {
  withTempHome((home) => {
    const c = claudePaths(home);
    assert.equal(
      c.configLibrary,
      join(home, "Library", "Application Support", "Claude-3p", "configLibrary"),
    );
    assert.equal(
      c.meta,
      join(
        home,
        "Library",
        "Application Support",
        "Claude-3p",
        "configLibrary",
        "_meta.json",
      ),
    );
  });
});

test("缺省 home 使用 os.homedir()，与注入 home 一致", () => {
  assert.deepEqual(harborPaths(), harborPaths(homedir()));
  assert.deepEqual(claudePaths(), claudePaths(homedir()));
});
