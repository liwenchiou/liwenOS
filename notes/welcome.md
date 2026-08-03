# ✦ liwen OS — Personal Second Brain

> 一套專為高效工作者量身打造的「個人數位大腦」系統，把你散落在 Google Calendar、Google Sheet 與本地 Markdown 筆記裡的所有資訊，收攏在一個乾淨、安靜的介面裡。

---

## 為什麼做這個？

工程師的日常工具鏈通常長這樣：行事曆開一個分頁、待辦清單開另一個分頁、筆記又散在 Notion 或本地資料夾，每天光是在視窗之間切換就浪費了大量注意力。liwen OS 想解決的問題很簡單——**讓你打開一個頁面，就能掌握今天所有該做的事、該開的會、該記的東西**，然後專心去執行。

---

## 核心模組

### 🏠 首頁儀表板 (Dashboard)
四個 Widget 一目了然：
- **今日行事曆**：從 Google Calendar 即時撈取今日行程，點擊任一行程可一鍵產出對應的會議 Markdown 筆記。
- **待辦事項 (Google Sheet 直連)**：雙向 CRUD 直連你的 Google Sheet `To-Dos` 分頁，未完成事項自動置頂，已完成預設收合不干擾視線。
- **快捷隨手筆記 (Scratchpad)**：靈感來了直接打，800ms 防抖自動存進本地 `scratchpad.md`，不怕丟失。
- **同步與系統狀態**：即時顯示 API 連線、資料庫與 Git 版控的健康狀態。

### 📅 行事曆時間軸 (Calendar)
- **整月全寬視圖 (Month View)**：當日高亮，事件標記一覽無遺。
- **當日時間軸 (Day View)**：當前時刻有一條會呼吸的紅色指標線，幫你定位「現在該做什麼」。
- **多源日曆融合**：Google Calendar、iCloud 訂閱通通整合進同一條時間軸，並以不同色系標籤區分來源（AI 助理 / 安大 / 貝貝）。

### 📝 專案 Markdown 筆記 (Notes)
- 所有筆記都是實體 `.md` 檔，存放在本機 `./notes/` 目錄底下，天生就能用 Git 做版控、推到 GitHub 備份。
- 支援資料夾分類、即時編輯、分頁式 HTML 獨立預覽。
- 系統內部的 `daily/` 與 `scratchpad.md` 自動隱藏，檔案樹只保留你的專案筆記，保持視覺極簡。

### 📊 今日自動日報 (Report)
- 自動交叉整合今日行事曆、Google Sheet 待辦、本地 Markdown 未完成任務與個人反思。
- 一鍵匯出成 `daily-report-YYYY-MM-DD.md`，複製貼上就能發給團隊或留存紀錄。

---

## 技術選型

| 層級 | 技術 |
|------|------|
| 前端 | React 18 + Vite + Lucide Icons |
| 後端 | Node.js + Express（3-Tier：Routes → Controller → Service） |
| 資料 | 本地 Markdown 檔案 + Google Sheet API + Google Calendar API + iCloud ICS |
| 部署 | Docker Compose 一鍵啟動，也支援本地 `npm run dev` |
| 設計系統 | Linear Dark Obsidian — 極簡黑曜石風格 |

---

## 設計語言：Linear Dark Obsidian

UI 風格致敬 Linear.app 與 Raycast，以純黑底 (`#08090d`) 搭配 Linear 紫 (`#5e6ad2`) 作為主視覺，1px 銳利邊框替代陰影擴散，呈現高密度資訊卻不顯雜亂的閱讀體驗。全站不使用任何原生瀏覽器彈窗（`alert` / `confirm`），統一採用自製的 Glassmorphic Toast 通知與 ConfirmModal 對話框。

---

## 快速啟動

```bash
# 1. 複製環境變數設定檔並填入 Google API 金鑰
cp .env.example .env

# 2. Docker 一鍵啟動（推薦）
docker compose -f docker-compose.dev.yml up

# 3. 打開瀏覽器
open http://localhost:3001
```

---

*liwen OS — 讓你的第二大腦安靜地運轉。*
