# LINE Bot 整合功能說明

本文檔說明如何設置和使用校園二手書循環平台的 LINE Bot 整合功能。

## 功能概覽

### ✅ 已實現功能

1. **自動回覆機器人**
   - 關鍵字辨識（查詢訂單、幫助等）
   - 功能選單（按鈕式互動）
   - 綁定碼處理

2. **系統通知（開立明細後傳 LINE）**
   - 使用 Flex Message 精美展示交易明細
   - 自動發送給買賣雙方
   - 包含時間、地點、價格等完整資訊

3. **面交成功回報**
   - 直接在 LINE 點擊按鈕確認
   - 雙方確認後自動完成交易
   - 自動發送完成通知

4. **面交失敗回報**
   - 點擊按鈕觸發
   - 可輸入失敗原因
   - 系統記錄供管理員處理

---

## 環境設置

### 1. 申請 LINE Bot

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 創建 Provider（例如：SchoolBookExchange）
3. 創建 Messaging API Channel
4. 記錄以下資訊：
   - **Channel Access Token** (長期)
   - **Channel Secret**

### 2. 設定環境變數

在 `functions/.env` 檔案中加入：

```env
LINE_CHANNEL_ACCESS_TOKEN=你的_Channel_Access_Token
LINE_CHANNEL_SECRET=你的_Channel_Secret
```

### 3. 設定 Webhook URL

在 LINE Developers Console 中設定 Webhook URL：

**本地測試（使用 ngrok）：**
```
https://your-ngrok-url.ngrok.io/your-project-id/us-central1/lineWebhook
```

**正式環境：**
```
https://us-central1-your-project-id.cloudfunctions.net/lineWebhook
```

記得啟用「Use webhook」選項。

---

## 功能使用流程

### A. 綁定 LINE 帳號

**用戶端操作：**
1. 登入網頁平台
2. 進入「個人專區」
3. 點擊「綁定 LINE 通知」
4. 系統產生 6 位數綁定碼（有效期 10 分鐘）
5. 在 LINE 聊天室輸入綁定碼

**系統處理：**
- Cloud Function `generateBindingCode` 產生綁定碼
- 儲存至 Firestore `line_codes` collection
- LINE Webhook 接收輸入，驗證並綁定帳號
- 更新用戶資料：`lineUserId`, `isLineNotifyEnabled`

### B. 自動回覆機器人

**觸發方式：**
用戶在 LINE 聊天室輸入文字訊息

**支援關鍵字：**
- `查詢`、`訂單`、`交易` → 顯示進行中的交易列表
- `幫助`、`功能`、`help` → 顯示功能說明
- 其他文字 → 顯示功能選單（按鈕式）

**功能選單：**
- 查詢我的訂單
- 功能說明  
- 前往平台（URI 連結）

### C. 系統通知（開立明細觸發）

**觸發時機：**
賣家在聊天室發送「開立明細」訊息（包含時間、地點資訊）

**實現邏輯：**
1. 前端 `ChatRoom` 組件偵測「開立明細」按鈕
2. `chatService.sendMessage()` 傳入 `invoiceData`
3. Firestore transaction 更新 `invoiceSentAt` 欄位
4. Cloud Function `onTransactionUpdate` 觸發器偵測變化
5. 呼叫 `sendInvoiceNotification()` 發送 LINE Flex Message

**通知內容（Flex Message）：**
```
📋 交易明細
━━━━━━━━━
書籍：《XXX》
買家：OO同學
賣家：XX同學
價格：NT$ XXX
━━━━━━━━━
時間：12/26 14:30
地點：圖書館門口
━━━━━━━━━
[按鈕] ✅ 面交成功
[按鈕] ❌ 面交失敗
```

### D. 面交成功回報

**操作流程：**
1. 用戶收到明細通知
2. 面交完成後點擊「✅ 面交成功」按鈕
3. 系統記錄確認：`buyerConfirmed` 或 `sellerConfirmed`
4. 雙方都確認後，交易狀態更新為 `Completed`
5. 自動發送完成通知，加 +5 信用積分

**Postback Data 格式：**
```
action=confirm_success&transactionId=xxx&userId=yyy
```

### E. 面交失敗回報

**操作流程：**
1. 用戶點擊「❌ 面交失敗」按鈕
2. 系統要求輸入失敗原因
3. 用戶輸入原因文字（例如：「對方未出現」）
4. 系統更新交易狀態為 `Failed`，記錄原因

**實現細節：**
- 點擊按鈕時，Postback action = `input_fail_reason`
- 系統在 `pending_inputs` collection 建立等待記錄
- 下一則文字訊息被視為失敗原因
- 處理後刪除等待記錄

**Firestore 結構：**
```javascript
{
  status: 'Failed',
  failedBy: 'user_uid',
  failedAt: Timestamp,
  failReason: '用戶輸入的原因'
}
```

---

## Firestore 資料結構

### transactions (Collection)

```javascript
{
  id: 'auto_generated_id',
  bookId: 'book_id',
  bookTitle: '書籍名稱',
  buyerId: 'buyer_uid',
  sellerId: 'seller_uid',
  agreedPrice: 100,
  status: 'Pending' | 'Completed' | 'Canceled' | 'Failed',
  
  // 面交資訊（開立明細時設定）
  meetingTime: Timestamp,
  meetingLocation: '圖書館門口',
  invoiceSentAt: Timestamp,  // 關鍵：觸發 LINE 通知
  
  // 面交確認（雙方回報）
  buyerConfirmed: true,
  buyerConfirmedAt: Timestamp,
  sellerConfirmed: true,
  sellerConfirmedAt: Timestamp,
  
  // 失敗記錄
  failedBy: 'user_uid',
  failedAt: Timestamp,
  failReason: '對方未出現'
}
```

### pending_inputs (Collection)

```javascript
{
  id: 'line_user_id',  // Document ID
  type: 'fail_reason',
  transactionId: 'trans_id',
  userId: 'firebase_uid',
  timestamp: Timestamp
}
```

### users (Collection)

```javascript
{
  uid: 'firebase_uid',
  lineUserId: 'U1234567890abcdef',  // LINE User ID
  isLineNotifyEnabled: true,
  lineBoundAt: Timestamp
}
```

---

## 測試流程

### 本地測試（使用 Firebase Emulator）

1. **啟動 Emulators：**
```bash
cd d:/SchoolBookExchange
firebase emulators:start
```

2. **使用 ngrok 建立公開 URL：**
```bash
ngrok http 5001
```

3. **設定 LINE Webhook：**
將 ngrok URL 設定到 LINE Developers Console

4. **測試流程：**
   - 在 LINE 加入你的 Bot
   - 在網頁平台產生綁定碼
   - 在 LINE 輸入綁定碼
   - 測試自動回覆（輸入「查詢訂單」）
   - 建立交易並開立明細
   - 測試面交確認按鈕

### 正式部署

```bash
firebase deploy --only functions
```

---

## Cloud Functions 清單

| Function Name | Type | 觸發方式 | 功能 |
|--------------|------|---------|------|
| `generateBindingCode` | Callable | 前端呼叫 | 產生 LINE 綁定碼 |
| `lineWebhook` | HTTP | LINE Platform | 處理所有 LINE 事件 |
| `onTransactionUpdate` | Firestore Trigger | `transactions/{id}` 更新 | 偵測明細開立，發送通知 |
| `sendInvoiceNotification` | Internal | 被其他 function 呼叫 | 發送 Flex Message |

---

## 常見問題

### Q1: 為什麼沒收到 LINE 通知？

**檢查清單：**
1. 確認用戶已綁定 LINE (`lineUserId` 存在)
2. 確認 `isLineNotifyEnabled = true`
3. 檢查 `LINE_CHANNEL_ACCESS_TOKEN` 是否正確
4. 查看 Cloud Functions Logs

### Q2: Postback 按鈕點擊無反應？

**可能原因：**
1. Webhook URL 未正確設定
2. LINE Bot 的 Webhook 未啟用
3. Cloud Function 執行錯誤（查看 Logs）

### Q3: 如何自訂 Flex Message 樣式？

**修改位置：**
`functions/handlers/line-bot.js` → `createInvoiceFlexMessage()`

可使用 [LINE Flex Message Simulator](https://developers.line.biz/flex-simulator/) 設計樣式。

### Q4: 如何追蹤面交失敗原因？

**查詢方式：**
```javascript
db.collection('transactions')
  .where('status', '==', 'Failed')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`失敗原因: ${data.failReason}`);
    });
  });
```

---

## 後續優化建議

1. **安全性增強：**
   - 實現 LINE Webhook Signature 驗證
   - 限制 API 呼叫頻率（Rate Limiting）

2. **功能擴充：**
   - Rich Menu（底部常駐選單）
   - 改期提醒（面交前 1 小時通知）
   - 交易評價系統整合

3. **使用者體驗：**
   - 多語言支援
   - 個人化訊息範本
   - 交易進度追蹤

4. **資料分析：**
   - 統計 LINE 通知開啟率
   - 面交成功/失敗比例
   - Bot 互動紀錄

---

## 相關連結

- [LINE Messaging API 文檔](https://developers.line.biz/en/docs/messaging-api/)
- [Flex Message 設計工具](https://developers.line.biz/flex-simulator/)
- [Firebase Cloud Functions 文檔](https://firebase.google.com/docs/functions)
- [ngrok 官網](https://ngrok.com/)

---

**更新時間：** 2025-12-26
**版本：** 1.0.0
