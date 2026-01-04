# 🎓 SchoolBook Exchange - 校園書籍循環平台

![Environment](https://img.shields.io/badge/Environment-Production-green)
![React](https://img.shields.io/badge/Frontend-React%2018-blue)
![Firebase](https://img.shields.io/badge/Backend-Firebase%20Functions-orange)
![LINE](https://img.shields.io/badge/Integration-LINE%20Messaging%20API-00B900)

這是一個為 **正心高級中學 (SHSH)** 量身打造的二手書交易平台。結合虛擬貨幣機制與 LINE Bot 即時通訊，讓校園內的知識循環變得更安全、有趣且高效。

<img width="949" height="499" alt="image" src="https://github.com/user-attachments/assets/f30e2c18-a257-4b21-ad0d-630f21df7f18" />


## ✨ 核心特色

### 1. 嚴謹的校園身份認證
- **信箱鎖定**：僅限 `@shsh.tw` 或 `@shsh.ylc.edu.tw` 信箱註冊。
- **學號綁定**：註冊過程自動提取學號，確保買賣雙方皆為校內真實成員，降低詐騙風險。

### 2. 全方位交易生態
- **多樣化模式**：支援「一般販售」與「愛心贈送」。
- **書香幣系統**：透過每日簽到獲得貨幣，可在「頭像商店」購買稀有頭像（如：熬夜貓貓、限定小馬）。
- **信用評分機制**：每位使用者擁有初始信用分，交易成功與否將直接影響評價，建立誠信社群。

### 3. LINE Bot 深度整合 (重點功能)
- **即時通知**：當雙方達成協議，賣家開立明細後，系統自動推播 Flex Message 至雙方 LINE。
- **一鍵回報**：面交完成後，可直接在 LINE 點擊按鈕確認成功。
- **智能自動回覆**：可透過 LINE 查詢目前進行中的所有訂單狀態。

### 4. 校園生活工具
- **考試倒數**：串接學校 Google 行事曆，首頁即時顯示段考、模擬考剩餘天數。
- **許願池**：圖文互動佈告欄，讓學生尋找特定講義或考古題筆記。

## 🛠 技術架構

- **前端 (Frontend)**: 
  - React 18 + Vite
  - Tailwind CSS + Lucide React (UI/UX)
  - Firebase Client SDK (Real-time Snapshots)
- **後端 (Backend)**: 
  - Firebase Cloud Functions (Node.js)
  - Firestore (NoSQL Database)
- **外部 API**:
  - LINE Messaging API
  - Google Calendar API (Exam Countdown)
  - Dicebear API (Avatar Generation)
