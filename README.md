# ClearCache

ClearCache 是一个 Chrome / Edge Manifest V3 扩展，用于统计并选择性清理当前网站的数据，不影响无关网站。

## 功能

- 统计 Cache Storage 的缓存库数量和请求条目数量
- 统计 Cookie、Local Storage、Session Storage、IndexedDB 和 Service Worker
- 单独选择一种或多种数据后清理
- 可选在清理完成后刷新当前页面
- 用户点击扩展后，读取并处理当前 HTTP 或 HTTPS 网站的数据

Chrome 不提供按网站查询 HTTP 缓存条目数量的接口，因此扩展会将其显示为“无法统计”，但仍支持按当前 origin 请求清理。Cookie 的清理范围遵循 Chrome `browsingData` API 规则，可能覆盖同一可注册域。

## 本地安装

1. 打开 `chrome://extensions/`（Edge 使用 `edge://extensions/`）。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目目录。
5. 打开任意 HTTP 或 HTTPS 网站，点击工具栏中的 ClearCache 图标。

## 开发

项目不依赖第三方运行库，也不需要构建步骤。

```bash
npm test
npm run check
```

## 权限

| 权限 | 用途 |
| --- | --- |
| `activeTab` | 用户点击扩展后临时读取当前网站的统计信息 |
| `scripting` | 在当前页面统计或清理页面级存储 |
| `browsingData` | 按当前 origin 清理所选浏览数据 |
| `cookies` | 统计当前 URL 可访问的 Cookie，包括 `HttpOnly` Cookie |
| `http://*/*`、`https://*/*` | 允许 Cookie API 查询任意当前网站；数据仍只在弹窗打开时读取 |

扩展不会上传、同步或远程保存任何网站数据。

## 参考

- [Chrome browsingData API](https://developer.chrome.com/docs/extensions/reference/api/browsingData)
- [Chrome activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome cookies API](https://developer.chrome.com/docs/extensions/reference/api/cookies)

界面中的操作图标遵循 [Lucide](https://lucide.dev/) 图标设计，Lucide 使用 ISC License。

## License

[MIT](LICENSE)
