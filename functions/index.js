/**
 * ============================================
 * Firebase Cloud Functions 主入口檔案
 * ============================================
 *
 * Pseudocode:
 * 1. 初始化 Firebase Admin SDK（必須在所有 handler 之前執行）
 * 2. 載入所有功能模組（handlers）
 * 3. 將各模組的函數匯出為 Cloud Functions
 *
 * 架構設計：
 * - 使用模組化設計，將不同功能拆分至 handlers/ 目錄
 * - 統一在此檔案進行匯出，避免重複初始化
 * - 每個 function 名稱全域唯一，不可重複
 */

// TODO: 考慮使用動態載入機制，減少冷啟動時間
// TODO: 加入 function 版本管理和棄用標記系統
// TODO: 實作統一的錯誤處理和日誌記錄中介層

// ============================================
// 1. Firebase Admin SDK 初始化
// ============================================
// Pseudocode:
// - 檢查是否已經初始化過 Admin SDK
// - 如果未初始化，則執行初始化（使用預設憑證）
const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp();
}

const functions = require("firebase-functions");

// ============================================
// 2. 載入所有功能模組（Handlers）
// ============================================
// Pseudocode:
// - 統一在此處 require 所有 handlers
// - 避免在各個 handler 中重複 require，防止循環依賴
// - 每個 handler 負責特定領域的業務邏輯

// TODO: 實作 handler 懶加載機制，只在實際呼叫時才載入
const authHandlers = require("./handlers/auth"); // 使用者認證與註冊
const transactionHandlers = require("./handlers/transaction");// 書籍交易流程
const calendarHandlers = require("./handlers/calendar"); // 行事曆和考試倒數
const reviewHandlers = require("./handlers/review"); // 評論系統
const lineHandlers = require("./handlers/line-bot"); // LINE Bot 整合
const storeHandlers = require("./handlers/store"); // 積分商店
const bookHandlers = require("./handlers/book"); // 書籍管理
const schedulerHandlers = require("./handlers/scheduler"); // 定時任務

// ============================================
// 3. 匯出 Cloud Functions
// ============================================
// Pseudocode:
// - 將各 handler 的函數匯出為對應的 Cloud Function
// - 每個匯出的名稱對應一個可呼叫的 Function
// - 分類整理：Auth、Transactions、Calendar、LINE Bot、Store 等

// --- 使用者認證 ---
exports.checkSchoolEmail = authHandlers.checkSchoolEmail; // 驗證學校信箱
exports.completeProfile = authHandlers.completeProfile; // 完成個人資料設定

// --- 書籍交易流程 ---
exports.handleBookTransaction = transactionHandlers.handleBookTransaction; // 處理交易請求
exports.onTransactionCreate = transactionHandlers.onTransactionCreate; // 監聽交易建立
exports.onTransactionUpdate = transactionHandlers.onTransactionUpdate; // 監聽交易更新（獎懲邏輯）
exports.updateTransactionStatus = transactionHandlers.updateTransactionStatus; // 更新交易狀態
exports.requestReschedule = transactionHandlers.requestReschedule; // 請求改時間
exports.respondToReschedule = transactionHandlers.respondToReschedule; // 回應改時間請求
exports.confirmTransactionTime = transactionHandlers.confirmTransactionTime; // 確認交易時間
exports.onMessageCreate = transactionHandlers.onMessageCreate; // 監聽聊天訊息
exports.debugInvoice = transactionHandlers.debugInvoice; // Debug 工具：測試發票通知

// --- 行事曆與評論 ---
exports.getExamCountdown = calendarHandlers.getExamCountdown; // 取得考試倒數
exports.addReview = reviewHandlers.addReview; // 新增評論
exports.onReviewCreated = reviewHandlers.onReviewCreated; // 監聽評論建立（觸發通知）

// --- LINE Bot 整合 ---
exports.generateBindingCode = lineHandlers.generateBindingCode; // 產生 LINE 綁定碼
exports.lineWebhook = lineHandlers.lineWebhook; // LINE Webhook 接收訊息
exports.unbindLineAccount = lineHandlers.unbindLineAccount; // 解除 LINE 綁定

// --- 積分商店與書籍管理 ---
exports.purchaseItem = storeHandlers.purchaseItem; // 購買商店道具
exports.dailyCheckIn = storeHandlers.dailyCheckIn; // 每日簽到
exports.deleteBook = bookHandlers.deleteBook; // 刪除書籍

// --- 定時排程任務 ---
exports.checkMeetingReminders = schedulerHandlers.checkMeetingReminders; // 檢查面交提醒
exports.debugMeetingReminders = schedulerHandlers.debugMeetingReminders; // 手動觸發 Debug 提醒

// TODO: 加入健康檢查 endpoint
// TODO: 實作 function 使用統計和效能監控
// TODO: 加入 rate limiting 保護機制

console.log("🚀 Functions loaded! GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Present" : "Missing");
