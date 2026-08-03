# liwen OS 工程待辦

> 審查日期：2026-08-04
> 審查視角：前端 UI / UX 與可維護性檢查

## P0 必修

### 功能缺陷

- [x] **行事曆無法切換月份**：整月視圖目前只會顯示當月，缺少上 / 下月導航。
- [x] **Modal 缺少 ESC 鍵關閉**：`CreateEventModal`、`ConfirmModal`、行程筆記 Modal 都已補上 `Escape` 關閉。
- [x] **CreateEventModal 仍殘留舊品牌字樣**：placeholder 已改為 `liwen OS`。

### 維護性

- [ ] **inline style 比例過高**：大量樣式直接寫在 JSX 中，導致 `:hover`、`@media`、重用性都受限。
- [x] **設計 Token 使用不一致**：已移除相關元件中的 `var(--primary-violet)` / `var(--primary-indigo)` 殘留，統一使用 `--primary-linear`。

## P1 重要

### 體驗

- [ ] **缺少全域 Loading / Skeleton 狀態**：Dashboard 與資料卡片首次載入時會有明顯閃爍感。
- [ ] **儀表板缺少 Empty State 設計**：沒有行程時只顯示文字，缺少引導與情境化呈現。
- [ ] **筆記編輯器沒有快捷鍵提示**：缺少 `Ctrl+S` / `⌘+S` 儲存提示與綁定。
- [ ] **側邊欄收合缺少 tooltip 浮窗**：目前只有 `title`，可考慮改成自訂 tooltip。
- [ ] **表單缺少完整 focus 導引**：label / input 關聯與 Tab 流程可再整理。
- [ ] **Toast 通知沒有堆疊機制**：多則訊息會互相覆蓋。
- [x] **ReportView 的 `showToast` 整合不完整**：匯出日報成功與失敗都已補上明確 toast 回饋。

### 架構

- [ ] **元件缺乏拆分與複用**：DashboardView 與 CalendarView 都偏大，行程筆記 Modal 應抽成共用元件。
- [ ] **DashboardView 與 App.jsx 的 `showToast` 使用方式不一致**：建議統一成單一 toast 入口。
- [ ] **HTML 預覽不支援即時預覽**：目前只有開新分頁，缺少 Split View。

## P2 優化

### 視覺

- [ ] **accent 色系太多**：目前 cyan / emerald / amber / rose 同時存在，品牌主色不夠集中。
- [ ] **圖示小圓底色不統一**：各 Widget 的 icon container 色彩差異偏大。
- [ ] **字重層次可再拉開**：標題 / 副標題 / 正文 / dim 文字可建立更明確階層。
- [ ] **body 背景漸層太微弱**：可評估加強或簡化。

### 品質

- [ ] **筆記區編輯器缺少行號顯示**：對 Markdown 使用者有實際幫助。
- [ ] **缺少 `<meta name=\"description\">` 與 Open Graph 標籤**：如果要做分享或 SEO，需補齊。

## 備註

- 這份清單先以「可直接開工」為原則，優先保留能明確驗證的問題。
- 設計偏好類的項目已降到 P2，避免跟真正的功能缺陷混在一起。

## 本輪進度

- 2026-08-04：完成 P0 功能缺陷與設計 token 整理，以及 P1 ReportView 匯出 toast。
- 驗證：`client` 執行 `npm run build` 成功。
