# 🚀 liwen OS - 個人數位大腦與行程管理系統規格書 (System Specification)

> **版本**：v1.0.0
> **更新日期**：2026-08-03
> **系統定位**：專為高效工作者打造的雙軌（Docker / Local）個人數位大腦 (Second Brain)，整合 Google 行事曆、iCloud 日曆訂閱與 Google Sheet 待辦事項。

- --

## 🏛️ 1. 系統整體架構 (System Architecture)

### 1.1 前後端 3-Tier 分層架構
- **前端 (Client)**：React 18 + Vite + Lucide Icons + HSL Linear Dark Obsidian 設計系統 (本地 `3000` / Docker `3001`)
- **後端 API Server**：Node.js + Express 3-Tier Architecture (`Routes -> Controller -> Service -> Utils`)
- **資料儲存 (Data Storage)**：
  - **本地 Markdown 筆記庫**：`./notes/` 目錄 (實體檔存取與 Git 版控)
  - **Google Sheet 直連 (To-Dos 分頁)**：`SPREADSHEET_ID=1VMHoGReOtWN-TB9N38U-QXowb7Xiiyna-AHclq2kO_o`
  - **Google Calendar API & iCloud ICS 訂閱**：雙向行程連動與自動串接

- --

## 🌟 2. 核心功能模組 (Core Modules)

### 2.1 首頁儀表板 (Dashboard)
- **今日 Google 行事曆 Widget**：即時顯示今日行程，點擊可一鍵產出對應會議 Markdown 筆記 (`./notes/daily/meeting-[名稱].md`)。
- **待辦事項 Widget (Google Sheet To-Dos 分頁直連)**：
  - 雙向 CRUD 直連試算表 `To-Dos` 分頁 (標準欄位: `ID, User ID, Content, Target Date, Is Done, Created At, Completed At`)。
  - **未完成事項自動置頂** 排序。
  - **一鍵「隱藏已完成」** 切換按鈕 (預設隱藏)。
- **快捷隨手筆記 (Scratchpad)**：自動防抖 (Debounce 800ms) 實時同步至 `./notes/scratchpad.md`。
- **同步與系統狀態 Widget**：監控 API 連線狀態、Git 版本控制與本地沙盒。

### 2.2 行事曆時間軸 (Calendar View)
- **雙檢視模式**：
  - **整月全寬視圖 (Month View)**：全月份事件高亮，當日獨享紫藍漸層與光圈高亮。
  - **當日行程時間軸 (Day View)**：當前時間點即時閃爍呼吸紅線 (Red Line Indicator)。
- **多源日曆融合**：
  - **AI 助理專用日曆** (`1e8b19f8...@group.calendar.google.com`)
  - **安大 iCloud 訂閱** (`ANDAL_ICLOUD_URL`)
  - **貝貝 iCloud 訂閱** (`BEIBEI_ICLOUD_URL`)
- **專屬來源色系標籤**：
  - `AI 助理行事曆`: 紫藍漸層標籤 (`#c4b5fd`)
  - `安大`: 青天藍漸層標籤 (`#7dd3fc`)
  - `貝貝`: 玫瑰粉漸層標籤 (`#fda4af`)

### 2.3 專案 MD 筆記 (Notes View)
- **實體檔案系統**：實時存取與管理本機 `./notes/` 下的所有 `.md` 檔案與子目錄。
- **分頁式 HTML 獨立預覽**：支援將 Markdown 即時轉譯為獨立 HTML 標籤頁預覽。
- **行程任務一鍵同步**：自動掃描筆記內 `- [ ]` 語法，一鍵拉起 Google 行事曆新增 Modal。

### 2.4 今日自動日報 (Report View)
- **自動交叉整合**：自動匯集「今日行事曆」、「Google Sheet 待辦」、「本地 Markdown 未完成事項」與「今日反思心得」。
- **實體 .md 日報匯出**：一鍵生成並儲存至 `./notes/daily/daily-report-YYYY-MM-DD.md`。

- --

## 🎨 3. UI/UX 設計系統 (Linear Dark Obsidian Style)

- **設計風格**：Linear.app / Raycast 極簡黑曜石風格 (`#08090d`)
- **全域通知**：移除所有 `alert()`，全面採用浮動 Glassmorphic Toast 通知系統。
- **響應式佈局 (RWD)**：全站 2x2 網格自動縮放 (`minmax(320px, 1fr)`)，中小螢幕不掉卡片。
- **動態收合側邊欄**：支援 `230px` ⟷ `64px` 平滑動畫縮放，極致放大主工作區。

- --

## 🛠️ 4. 環境與 API 端點規範

### 4.1 環境變數 (`.env`)
```env
GOOGLE_CREDENTIALS='{...}'
GOOGLE_TOKEN='{...}'
SPREADSHEET_ID=1VMHoGReOtWN-TB9N38U-QXowb7Xiiyna-AHclq2kO_o
MY_DISCORD_ID=422392321812725770
CALENDAR_IDS=1e8b19f83fa0ae12eaec36584ae4d90a5e5259f1682cb2761a15a4d312a81225@group.calendar.google.com
ANDAL_ICLOUD_URL=webcal://...
BEIBEI_ICLOUD_URL=webcal://...
```

### 4.2 RESTful API 端點
- `GET /api/calendar/events` - 撈取整月行事曆與 iCloud 事件
- `POST /api/calendar/events` - 新增行程至 Google Calendar
- `GET /api/todos` - 撈取 Google Sheet `To-Dos` 分頁待辦
- `POST /api/todos` - 新增待辦至 Google Sheet
- `PATCH /api/todos/:rowNumber` - 切換待辦完成狀態
- `DELETE /api/todos/:rowNumber` - 刪除待辦
- `GET /api/notes/tree` - 撈取本地 `./notes` 目錄樹
- `GET /api/notes/file` - 讀取實體 `.md` 內容
- `POST /api/notes/file` - 儲存實體 `.md` 內容
- `POST /api/notes/create` - 新增筆記/資料夾
- `DELETE /api/notes/file` - 刪除實體筆記/資料夾
