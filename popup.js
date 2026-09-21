import {
  buildRemovalData,
  formatMetric,
  getMetricState,
  getPageContext
} from "./lib/core.js";

const DATA_TYPES = [
  {
    id: "cacheStorage",
    label: "Cache Storage",
    description: "Service Worker 保存的离线请求与响应",
    selected: true
  },
  {
    id: "cache",
    label: "HTTP 缓存",
    description: "浏览器保存的页面、脚本与图片资源"
  },
  {
    id: "cookies",
    label: "Cookie",
    description: "登录状态与服务器写入的站点数据"
  },
  {
    id: "localStorage",
    label: "Local Storage",
    description: "页面长期保存的键值数据"
  },
  {
    id: "sessionStorage",
    label: "Session Storage",
    description: "当前标签页会话中的临时键值数据"
  },
  {
    id: "indexedDB",
    label: "IndexedDB",
    description: "页面使用的结构化本地数据库"
  },
  {
    id: "serviceWorkers",
    label: "Service Worker",
    description: "在后台代理请求的站点工作线程"
  }
];

const elements = {
  aboutButton: document.querySelector("#about-button"),
  aboutCloseButton: document.querySelector("#about-close-button"),
  aboutDialog: document.querySelector("#about-dialog"),
  aboutVersion: document.querySelector("#about-version"),
  clearButton: document.querySelector("#clear-button"),
  refreshButton: document.querySelector("#refresh-button"),
  reloadAfterClear: document.querySelector("#reload-after-clear"),
  selectAllButton: document.querySelector("#select-all-button"),
  siteLabel: document.querySelector("#site-label"),
  storageList: document.querySelector("#storage-list"),
  notice: document.querySelector("#notice")
};

let activeTab;
let pageContext;
let busy = false;

function createStorageRows() {
  const fragment = document.createDocumentFragment();

  for (const type of DATA_TYPES) {
    const row = document.createElement("label");
    row.className = "storage-row";
    row.htmlFor = `storage-${type.id}`;

    const checkbox = document.createElement("input");
    checkbox.id = `storage-${type.id}`;
    checkbox.type = "checkbox";
    checkbox.dataset.storageId = type.id;
    checkbox.checked = Boolean(type.selected);
    checkbox.addEventListener("change", updateSelectionState);

    const copy = document.createElement("span");
    copy.className = "storage-copy";

    const name = document.createElement("span");
    name.className = "storage-name";
    name.textContent = type.label;

    const description = document.createElement("span");
    description.className = "storage-description";
    description.textContent = type.description;

    const statistic = document.createElement("span");
    statistic.className = "storage-stat";
    statistic.dataset.statisticId = type.id;
    statistic.textContent = "读取中...";

    copy.append(name, description);
    row.append(checkbox, copy, statistic);
    fragment.append(row);
  }

  elements.storageList.replaceChildren(fragment);
  updateSelectionState();
}

function getSelectedIds() {
  return [...document.querySelectorAll("[data-storage-id]:checked")]
    .map((checkbox) => checkbox.dataset.storageId);
}

function updateSelectionState() {
  const checkboxes = [...document.querySelectorAll("[data-storage-id]")];
  const allSelected = checkboxes.length > 0 && checkboxes.every((checkbox) => checkbox.checked);
  elements.selectAllButton.textContent = allSelected ? "取消全选" : "全选";
  elements.clearButton.disabled = busy || !pageContext || getSelectedIds().length === 0;
}

function setBusy(nextBusy, label = "清除所选数据") {
  busy = nextBusy;
  elements.refreshButton.disabled = nextBusy;
  elements.selectAllButton.disabled = nextBusy;

  for (const checkbox of document.querySelectorAll("[data-storage-id]")) {
    checkbox.disabled = nextBusy;
  }

  elements.clearButton.querySelector("span").textContent = label;
  updateSelectionState();
}

function showNotice(message, tone = "neutral") {
  elements.notice.hidden = !message;
  elements.notice.dataset.tone = tone;
  elements.notice.textContent = message;
}

function formatStatistic(id, metric) {
  if (id === "cacheStorage" && metric?.available) {
    const hasData = metric.cacheCount > 0 || metric.entryCount > 0;
    return {
      state: hasData ? "present" : "empty",
      text: `${metric.cacheCount} 库 / ${metric.entryCount} 项`
    };
  }

  const units = {
    cookies: "项",
    indexedDB: "个库",
    localStorage: "项",
    serviceWorkers: "个",
    sessionStorage: "项"
  };

  return {
    state: getMetricState(metric),
    text: formatMetric(metric, units[id] || "项")
  };
}

function renderStatistics(statistics) {
  for (const type of DATA_TYPES) {
    const statistic = document.querySelector(`[data-statistic-id="${type.id}"]`);
    const formatted = formatStatistic(type.id, statistics[type.id]);
    statistic.dataset.state = formatted.state;
    statistic.textContent = formatted.text;
  }
  elements.storageList.setAttribute("aria-busy", "false");
}

// 该函数在页面主执行环境运行，按类型隔离错误，避免单项读取失败阻断全部统计。
async function inspectPageStorage() {
  const unavailable = (reason = "读取失败") => ({ available: false, reason });
  const countStorage = (storage) => {
    try {
      return { available: true, count: storage.length };
    } catch (error) {
      console.error("ClearCache: Web Storage 统计失败", error);
      return unavailable();
    }
  };

  const statistics = {
    cache: unavailable("数量未知"),
    localStorage: countStorage(window.localStorage),
    sessionStorage: countStorage(window.sessionStorage)
  };

  try {
    const cacheNames = await window.caches.keys();
    const entryCounts = await Promise.all(
      cacheNames.map(async (cacheName) => {
        const cache = await window.caches.open(cacheName);
        return (await cache.keys()).length;
      })
    );
    statistics.cacheStorage = {
      available: true,
      cacheCount: cacheNames.length,
      count: entryCounts.reduce((total, count) => total + count, 0),
      entryCount: entryCounts.reduce((total, count) => total + count, 0)
    };
  } catch (error) {
    console.error("ClearCache: Cache Storage 统计失败", error);
    statistics.cacheStorage = unavailable();
  }

  try {
    if (typeof window.indexedDB.databases !== "function") {
      statistics.indexedDB = unavailable("浏览器不支持统计");
    } else {
      statistics.indexedDB = {
        available: true,
        count: (await window.indexedDB.databases()).length
      };
    }
  } catch (error) {
    console.error("ClearCache: IndexedDB 统计失败", error);
    statistics.indexedDB = unavailable();
  }

  try {
    if (!("serviceWorker" in navigator)) {
      statistics.serviceWorkers = unavailable("浏览器不支持统计");
    } else {
      statistics.serviceWorkers = {
        available: true,
        count: (await navigator.serviceWorker.getRegistrations()).length
      };
    }
  } catch (error) {
    console.error("ClearCache: Service Worker 统计失败", error);
    statistics.serviceWorkers = unavailable();
  }

  return statistics;
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || typeof tab.id !== "number" || !tab.url) {
    throw new Error("无法获取当前标签页");
  }
  return tab;
}

async function readStatistics() {
  setBusy(true, "正在读取...");
  showNotice("");
  elements.storageList.setAttribute("aria-busy", "true");

  try {
    activeTab = await getCurrentTab();
    pageContext = getPageContext(activeTab.url);
    elements.siteLabel.textContent = pageContext.hostname;
    elements.siteLabel.title = pageContext.origin;

    const [injectionResult, cookieMetric] = await Promise.all([
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        world: "MAIN",
        func: inspectPageStorage
      }),
      chrome.cookies.getAll({ domain: pageContext.hostname })
        .then((cookies) => ({ available: true, count: cookies.length }))
        .catch((error) => {
          console.error("ClearCache: Cookie 统计失败", error);
          return { available: false, reason: "读取失败" };
        })
    ]);

    const statistics = injectionResult[0]?.result;
    if (!statistics) {
      throw new Error("页面未返回可用的统计结果");
    }
    statistics.cookies = cookieMetric;
    renderStatistics(statistics);
  } catch (error) {
    console.error("ClearCache: 读取当前网站数据失败", error);
    pageContext = undefined;
    elements.siteLabel.textContent = "不支持当前页面";
    showNotice(error.message || "无法读取当前网站数据", "error");
    renderStatistics(Object.fromEntries(
      DATA_TYPES.map(({ id }) => [id, { available: false, reason: "不可用" }])
    ));
  } finally {
    setBusy(false);
  }
}

async function clearSessionStorage() {
  await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    world: "MAIN",
    func: () => window.sessionStorage.clear()
  });
}

async function clearSelectedData() {
  const selectedIds = getSelectedIds();
  if (!pageContext || selectedIds.length === 0) {
    return;
  }

  setBusy(true, "正在清理...");
  showNotice("");
  console.info("ClearCache: 开始清理", {
    origin: pageContext.origin,
    selectedIds
  });

  try {
    const tasks = [];
    const removalData = buildRemovalData(selectedIds);

    if (Object.keys(removalData).length > 0) {
      tasks.push(chrome.browsingData.remove(
        { origins: [pageContext.origin] },
        removalData
      ));
    }
    if (selectedIds.includes("sessionStorage")) {
      tasks.push(clearSessionStorage());
    }

    await Promise.all(tasks);
    console.info("ClearCache: 清理完成", {
      origin: pageContext.origin,
      selectedIds
    });

    if (elements.reloadAfterClear.checked) {
      await chrome.tabs.reload(activeTab.id);
      window.close();
      return;
    }

    showNotice(`已清除 ${selectedIds.length} 类站点数据`, "success");
    await readStatistics();
    showNotice(`已清除 ${selectedIds.length} 类站点数据`, "success");
  } catch (error) {
    console.error("ClearCache: 清理当前网站数据失败", error);
    showNotice(error.message || "清理失败，请重试", "error");
  } finally {
    setBusy(false);
  }
}

function toggleAll() {
  const checkboxes = [...document.querySelectorAll("[data-storage-id]")];
  const shouldSelect = !checkboxes.every((checkbox) => checkbox.checked);
  for (const checkbox of checkboxes) {
    checkbox.checked = shouldSelect;
  }
  updateSelectionState();
}

elements.aboutVersion.textContent =
  globalThis.chrome?.runtime?.getManifest?.().version || elements.aboutVersion.textContent;
elements.aboutButton.addEventListener("click", () => elements.aboutDialog.showModal());
elements.aboutCloseButton.addEventListener("click", () => elements.aboutDialog.close());
elements.aboutDialog.addEventListener("click", (event) => {
  if (event.target === elements.aboutDialog) {
    elements.aboutDialog.close();
  }
});
elements.refreshButton.addEventListener("click", readStatistics);
elements.selectAllButton.addEventListener("click", toggleAll);
elements.clearButton.addEventListener("click", clearSelectedData);

createStorageRows();
readStatistics();
