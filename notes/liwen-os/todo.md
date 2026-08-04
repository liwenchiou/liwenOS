# liwen OS 工程待辦

> 審查日期：2026-08-04
> 審查視角：前端 UI / UX 與可維護性檢查

## P0 必修

### 功能缺陷

- [x] **行事曆其他月份沒抓到 AI 助理行事曆**：後端 API 支援 `year/month` 參數 + 前端 CalendarView 切月回呼。
- [x] **今日報表的待辦事項來源調整**：今日報表 (ReportView) 的待辦事項，改為只顯示 Google Sheet 的項目。
- [x] **行事曆無法切換月份**：整月視圖目前只會顯示當月，缺少上 / 下月導航。
- [x] **Modal 缺少 ESC 鍵關閉**：`CreateEventModal`、`ConfirmModal`、行程筆記 Modal 都已補上 `Escape` 關閉。
- [x] **CreateEventModal 仍殘留舊品牌字樣**：placeholder 已改為 `liwen OS`。

### 維護性

- [ ] **inline style 比例過高**：大量樣式直接寫在 JSX 中，導致 `:hover`、`@media`、重用性都受限。
- [/] **導入 Tailwind CSS 重構樣式**：Tailwind CSS v4 安裝 + Vite plugin + CSS import 皆已完成，`npm run build` 驗證通過。元件逐步遷移留待後續迭代。
- [x] **設計 Token 使用不一致**：已移除相關元件中的 `var(--primary-violet)` / `var(--primary-indigo)` 殘留，統一使用 `--primary-linear`。

## P1 重要

### 體驗

- [/] **缺少全域 Loading / Skeleton 狀態**：已加入 .skeleton-bar 動畫與 Google Sheet 待辦事項載入占位卡片。
- [x] **儀表板缺少 Empty State 設計**：沒有行程時已改為帶有 ☕️ 情感化文案與引導按鈕的 Empty State。
- [x] **筆記編輯器沒有快捷鍵提示**：已實作 ⌘+S / Ctrl+S 快捷鍵監聽，並在 Save 按鈕加上提示語。
- [x] **側邊欄收合缺少 tooltip 浮窗**：已使用自訂 `.sidebar-tooltip` CSS 浮窗取代原生 title 屬性。
- [x] **表單缺少完整 focus 導引**：已為 CreateEventModal 與待辦事項輸入框補齊 id/htmlFor 可及性關聯，且 modal 開啟時自動 focus 首欄位。
- [x] **Toast 通知沒有堆疊機制**：已改用陣列堆疊管理多則通知與獨立定時移除。
- [x] **ReportView 的 `showToast` 整合不完整**：匯出日報成功與失敗都已補上明確 toast 回饋。

### 架構

- [x] **元件缺乏拆分與複用**：已將 DashboardView 與 CalendarView 重複的行程會議筆記對話框抽離封裝為共用 `EventNoteModal.jsx` 元件。
- [x] **DashboardView 與 App.jsx 的 `showToast` 使用方式不一致**：已確認並統一由 App.jsx 傳遞單一 showToast 入口。
- [x] **HTML 預覽不支援即時預覽**：已在 NotesView 實作左右分割即時預覽 (Split View) 雙欄與切換開關。

## P2 優化

### 視覺

- [x] **accent 色系太多**：以 Linear Indigo (`#5e6ad2`) 與 Cyan (`#38bdf8`) 主色彩為核心，調和並收斂輔助色彩變體。
- [x] **圖示小圓底色不統一**：已在 `index.css` 建立統一規範的 `.widget-icon-box` 樣式供各元件標準化呼叫。
- [x] **字重層次可再拉開**：定義標準 `h1` ~ `h4`、`.text-subhead`、`.text-body`、`.text-dimmed` 字階系統，強化閱讀層次。
- [x] **body 背景漸層太微弱**：已增強 `body` 放射漸層亮度至 `0.22`，並加上頂部右側微亮光暈，提升玻璃擬態立體感。

### 品質

- [x] **筆記區編輯器缺少行號顯示**：已在 NotesView 左側實作與 textarea 滾動同步的行號欄位 (Line Numbers Gutter)。
- [x] **缺少 `<meta name="description">` 與 Open Graph 標籤**：已於 `index.html` 補齊 description 與 og:title, og:description, og:type, og:site_name 標籤。

## 備註

- 這份清單先以「可直接開工」為原則，優先保留能明確驗證的問題。
- 設計偏好類的項目已降到 P2，避免跟真正的功能缺陷混在一起。

## 本輪進度

- 2026-08-04 (Round 1)：完成 P0 功能缺陷與設計 token 整理，以及 P1 ReportView 匯出 toast；驗證 `npm run build` 成功。
- 2026-08-04 (Round 2)：完成 P1 重點體驗與架構提升：
  1. 筆記編輯器支援 `⌘+S` / `Ctrl+S` 快捷鍵存檔與 Save 按鈕提示
  2. Dashboard 儀表板「無預定行程」改為情境化 Empty State ☕️
  3. 側邊欄收合模式改用 CSS 自訂 `.sidebar-tooltip` 浮窗
  4. App.jsx Toast 改為陣列堆疊管理多則訊息，並自帶動畫倒數移除
  5. 待辦事項清單載入中加入 `.skeleton-bar` 占位動畫
  6. NotesView 實作左右分割即時預覽 (Split View) 與 Markdown HTML 雙欄渲染
- 2026-08-04 (Round 3)：完成使用者補充的 P2 品質項目：
  1. 筆記區編輯器加入行號顯示 (Line Numbers Gutter)，支援行數自動編號與同步捲動
  2. 網站根目錄 `index.html` 補齊 SEO `<meta name="description">` 與 Open Graph 分享標籤
- 2026-08-04 (Round 4)：完成剩餘 P1 體驗/架構與 P2 視覺優化項目：
  1. 建立 `EventNoteModal.jsx` 共用元件，消除 DashboardView 與 CalendarView 超過 160 行重複的 Modal 程式碼
  2. CreateEventModal 表單與待辦事項輸入框補上 htmlFor/id 語意綁定與 autoFocus
  3. index.css 加強視覺層次（色彩集中化、`.widget-icon-box` 統一規範、字重階層與加強版 Glassmorphic 背景漸層）



