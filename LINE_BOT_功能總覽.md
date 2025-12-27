# 🤖 LINE Bot 整合功能總覽

## ✅ 已完成功能

### 1. 自動回覆機器人 🗣️

**核心功能：**
- ✅ 關鍵字辨識（查詢訂單、幫助等）
- ✅ 智能回覆系統
- ✅ 按鈕式功能選單
- ✅ 綁定碼自動處理

**實現位置：**
- `functions/handlers/line-bot.js` → `handleAutoReply()`

**支援指令：**
| 輸入 | 回應 |
|------|------|
| 6位數字 | 綁定 LINE 帳號 |
| 查詢、訂單、交易 | 顯示進行中的交易列表 |
| 幫助、功能、help | 功能說明 |
| 其他文字 | 功能選單（按鈕） |

---

### 2. 系統通知（開立明細後自動傳 LINE）📋

**觸發時機：**
賣家在聊天室發送「開立明細」訊息時

**通知內容：**
- 📋 精美的 Flex Message 交易明細卡片
- 📝 包含買家、賣家、書籍、價格資訊
- 📅 面交時間和地點
- 🎯 互動式按鈕（確認成功/回報失敗）

**實現流程：**
```
前端發送明細訊息
    ↓
chatService.sendMessage(invoiceData)
    ↓
Firestore 更新 invoiceSentAt
    ↓
Cloud Function onTransactionUpdate 觸發
    ↓
sendInvoiceNotification() 發送 LINE Flex Message
    ↓
買賣雙方收到通知
```

**實現位置：**
- `functions/handlers/transaction.js` → `onTransactionUpdate`
- `functions/handlers/line-bot.js` → `sendInvoiceNotification()`

---

### 3. 面交成功確認 ✅

**用戶操作：**
1. 收到明細通知
2. 面交完成後點擊「✅ 面交成功」按鈕
3. 系統自動記錄確認

**系統處理：**
- 記錄 `buyerConfirmed` 或 `sellerConfirmed`
- 雙方都確認後 → 交易狀態變更為 `Completed`
- 自動加 +5 信用積分
- 發送完成通知給雙方

**實現位置：**
- `functions/handlers/line-bot.js` → `handlePostback()` (action = `confirm_success`)
- `functions/handlers/transaction.js` → `onTransactionUpdate` (status → Completed)

**Postback Data：**
```
action=confirm_success&transactionId=xxx&userId=yyy
```

---

### 4. 面交失敗回報 ❌

**用戶操作：**
1. 收到明細通知
2. 面交失敗時點擊「❌ 面交失敗」按鈕
3. 輸入失敗原因（例如：「對方未出現」）
4. 系統記錄並通知管理員

**系統處理：**
- 建立 `pending_inputs` 記錄等待用戶輸入
- 下一則文字訊息作為失敗原因
- 更新交易狀態為 `Failed`
- 記錄 `failReason`、`failedBy`、`failedAt`

**實現位置：**
- `functions/handlers/line-bot.js` → `handlePostback()` (action = `input_fail_reason`)
- `functions/handlers/line-bot.js` → 文字訊息處理（檢查 pending_inputs）

**Firestore 更新：**
```javascript
{
  status: 'Failed',
  failedBy: 'user_uid',
  failedAt: Timestamp,
  failReason: '用戶輸入的原因'
}
```

---

## 📁 檔案結構

```
functions/
├── handlers/
│   ├── line-bot.js          ← ⭐ 主要 LINE Bot 邏輯
│   └── transaction.js       ← 交易觸發器（偵測明細開立）
├── services/
│   └── line-service.js      ← LINE API 封裝
├── test_line_bot.js         ← 測試腳本
└── .env                     ← 環境變數（LINE Token）

frontend/src/
└── services/
    └── chat-service.js      ← 發送明細訊息
```

---

## 🚀 快速開始

### 1. 安裝依賴
```bash
cd functions
npm install @line/bot-sdk
```

### 2. 設定環境變數
在 `functions/.env` 中加入：
```env
LINE_CHANNEL_ACCESS_TOKEN=你的_Token
LINE_CHANNEL_SECRET=你的_Secret
```

### 3. 本地測試
```bash
# Terminal 1: 啟動 Firebase Emulators
firebase emulators:start

# Terminal 2: 啟動 ngrok
ngrok http 5001

# Terminal 3: 測試腳本
cd functions
node test_line_bot.js
```

### 4. 設定 LINE Webhook
在 LINE Developers Console 設定 Webhook URL：
```
https://your-ngrok-url.ngrok.io/your-project-id/us-central1/lineWebhook
```

### 5. 部署到正式環境
```bash
firebase deploy --only functions
```

---

## 📊 資料流程圖

### 綁定流程
```
用戶登入網頁 → 產生綁定碼 (generateBindingCode)
              ↓
    在 LINE 輸入 6 位數
              ↓
    lineWebhook 驗證 → 綁定成功
              ↓
    更新 users.lineUserId, isLineNotifyEnabled
```

### 明細通知流程
```
賣家點擊「開立明細」
       ↓
chatService.sendMessage(invoiceData)
       ↓
Firestore: transactions.invoiceSentAt 更新
       ↓
onTransactionUpdate 觸發
       ↓
sendInvoiceNotification()
       ↓
[賣家 LINE]  [買家 LINE]
    ↓            ↓
 Flex Message + 確認按鈕
```

### 面交確認流程
```
用戶點擊「✅ 面交成功」
        ↓
   Postback 事件
        ↓
handlePostback(action=confirm_success)
        ↓
更新 buyerConfirmed / sellerConfirmed
        ↓
[檢查] 雙方都確認了嗎？
    Yes ↓         No → 等待另一方確認
status = Completed
        ↓
  +5 信用積分
        ↓
發送完成通知
```

### 面交失敗流程
```
用戶點擊「❌ 面交失敗」
        ↓
   Postback 事件
        ↓
handlePostback(action=input_fail_reason)
        ↓
建立 pending_inputs 記錄
        ↓
系統回覆：「請輸入失敗原因」
        ↓
用戶輸入文字（例：「對方未出現」）
        ↓
lineWebhook 偵測到 pending_inputs
        ↓
更新 transaction:
  - status = Failed
  - failReason = 用戶輸入
        ↓
刪除 pending_inputs
        ↓
系統回覆：「已記錄」
```

---

## 🧪 測試方法

### 自動化測試
```bash
cd functions
node test_line_bot.js
```

測試項目：
- ✅ 檢查環境變數
- ✅ 查詢綁定用戶
- ✅ 測試發送訊息
- ✅ 測試 Flex Message

### 手動測試

| 功能 | 測試步驟 | 預期結果 |
|------|---------|---------|
| 綁定帳號 | 1. 網頁產生綁定碼<br>2. LINE 輸入碼 | 收到「綁定成功」訊息 |
| 自動回覆 | 輸入「查詢訂單」 | 顯示交易列表 |
| 明細通知 | 賣家開立明細 | 雙方收到 Flex Message |
| 面交成功 | 點擊成功按鈕 | 收到確認訊息 |
| 面交失敗 | 點擊失敗按鈕 → 輸入原因 | 狀態更新為 Failed |

---

## 🔍 除錯指南

### 常見問題

**Q: 沒收到 LINE 通知？**
```bash
# 檢查 Cloud Functions Logs
firebase functions:log

# 檢查用戶綁定狀態
# 在 Firestore Console 查看 users collection
```

**Q: Webhook 無反應？**
1. 確認 Webhook URL 正確
2. 確認「Use webhook」已啟用
3. 檢查 LINE Bot 是否已加好友

**Q: Postback 按鈕點擊無效？**
```javascript
// 檢查 Postback data 格式
console.log event.postback.data;
// 應為: action=xxx&transactionId=yyy&userId=zzz
```

### 查看 Logs

**本地（Emulator）：**
```bash
# Emulator 輸出會直接顯示在 terminal
```

**正式環境：**
```bash
firebase functions:log --only lineWebhook,onTransactionUpdate
```

---

## 📈 效能監控

### 建議監控指標

| 指標 | 工具 | 目的 |
|------|------|------|
| Function 執行時間 | Firebase Console | 確保回應速度 |
| 錯誤率 | Cloud Functions Logs | 偵測異常 |
| LINE API 呼叫次數 | LINE Developers Console | 避免超過配額 |
| 綁定成功率 | Firestore 查詢 | 優化綁定流程 |

---

## 🎯 未來優化

### 建議增強項目

1. **Rich Menu 常駐選單**
   - 快速查詢訂單
   - 前往平台
   - 聯繫客服

2. **主動提醒**
   - 面交前 1 小時提醒
   - 長時間未回應提醒
   - 評價提醒

3. **進階互動**
   - Carousel 輪播卡片（多筆交易）
   - Quick Reply 快速回覆
   - 圖片辨識（書籍封面）

4. **安全性**
   - Webhook Signature 驗證
   - Rate Limiting
   - 異常偵測

---

## 📚 參考資源

- [LINE Messaging API 官方文檔](https://developers.line.biz/en/docs/messaging-api/)
- [Flex Message 設計工具](https://developers.line.biz/flex-simulator/)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [專案完整說明](./LINE_BOT_整合說明.md)

---

**版本：** 1.0.0  
**最後更新：** 2025-12-26  
**開發者：** SchoolBookExchange Team
