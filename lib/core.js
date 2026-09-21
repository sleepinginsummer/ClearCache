const BROWSING_DATA_KEYS = new Set([
  "cache",
  "cacheStorage",
  "cookies",
  "indexedDB",
  "localStorage",
  "serviceWorkers"
]);

export function getPageContext(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("当前页面不支持站点数据清理");
  }

  return {
    hostname: parsed.hostname,
    origin: parsed.origin,
    url: parsed.href
  };
}

export function buildRemovalData(selectedIds) {
  return Object.fromEntries(
    selectedIds
      .filter((id) => BROWSING_DATA_KEYS.has(id))
      .map((id) => [id, true])
  );
}

export function getMetricState(metric) {
  if (!metric || metric.available === false) {
    return "unknown";
  }
  return metric.count > 0 ? "present" : "empty";
}

export function formatMetric(metric, unit = "项") {
  if (!metric || metric.available === false) {
    return metric?.reason || "无法统计";
  }
  return metric.count > 0 ? `有 · ${metric.count} ${unit}` : `无 · 0 ${unit}`;
}
