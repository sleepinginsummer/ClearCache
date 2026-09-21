import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildRemovalData,
  formatMetric,
  getMetricState,
  getPageContext
} from "../lib/core.js";

const projectRoot = new URL("../", import.meta.url);

test("getPageContext 接受 HTTP 和 HTTPS 页面", () => {
  assert.deepEqual(getPageContext("https://example.com/path?q=1"), {
    hostname: "example.com",
    origin: "https://example.com",
    url: "https://example.com/path?q=1"
  });
  assert.equal(getPageContext("http://localhost:8080/").origin, "http://localhost:8080");
});

test("getPageContext 拒绝浏览器内部页面", () => {
  assert.throws(() => getPageContext("chrome://extensions"), /不支持/);
});

test("buildRemovalData 仅保留 browsingData 支持的类型", () => {
  assert.deepEqual(
    buildRemovalData(["cacheStorage", "sessionStorage", "cookies"]),
    { cacheStorage: true, cookies: true }
  );
});

test("统计文案区分有、无和无法统计", () => {
  assert.equal(formatMetric({ available: true, count: 3 }, "个"), "有 · 3 个");
  assert.equal(formatMetric({ available: true, count: 0 }, "个"), "无 · 0 个");
  assert.equal(formatMetric({ available: false, reason: "无法统计" }), "无法统计");
  assert.equal(getMetricState({ available: true, count: 1 }), "present");
  assert.equal(getMetricState({ available: true, count: 0 }), "empty");
});

test("Manifest 使用最小权限集合并包含图标", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", projectRoot), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), [
    "activeTab",
    "browsingData",
    "cookies",
    "scripting"
  ]);
  assert.equal(manifest.host_permissions, undefined);

  for (const iconPath of Object.values(manifest.icons)) {
    const icon = await readFile(new URL(iconPath, projectRoot));
    assert.ok(icon.length > 0);
  }
});
