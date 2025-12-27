// 1. 必須最先初始化 Admin SDK
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}

const functions = require("firebase-functions");


// 2. 統一在此處引入所有 Handlers (避免重複 require)
const authHandlers = require("./handlers/auth");
const transactionHandlers = require("./handlers/transaction");
const calendarHandlers = require("./handlers/calendar");
const reviewHandlers = require("./handlers/review");
const lineHandlers = require("./handlers/line-bot");
const storeHandlers = require("./handlers/store");
const bookHandlers = require("./handlers/book");

// 3. 匯出功能 (每個名稱只能出現一次)

// --- Auth ---
exports.checkSchoolEmail = authHandlers.checkSchoolEmail;
exports.completeProfile = authHandlers.completeProfile;

// --- Transactions ---
exports.handleBookTransaction = transactionHandlers.handleBookTransaction;
exports.onTransactionCreate = transactionHandlers.onTransactionCreate;
exports.onTransactionUpdate = transactionHandlers.onTransactionUpdate;
exports.updateTransactionStatus = transactionHandlers.updateTransactionStatus;
exports.requestReschedule = transactionHandlers.requestReschedule;
exports.respondToReschedule = transactionHandlers.respondToReschedule;
exports.confirmTransactionTime = transactionHandlers.confirmTransactionTime;
exports.onMessageCreate = transactionHandlers.onMessageCreate;
exports.debugInvoice = transactionHandlers.debugInvoice;

// --- Calendar & Review ---
exports.getExamCountdown = calendarHandlers.getExamCountdown;
exports.addReview = reviewHandlers.addReview;
exports.onReviewCreated = reviewHandlers.onReviewCreated;

// --- LINE Bot ---
exports.generateBindingCode = lineHandlers.generateBindingCode;
// 注意：這裡直接使用 lineHandlers 裡的邏輯，不要在 index.js 重寫
exports.lineWebhook = lineHandlers.lineWebhook;

// --- Store & Book ---
exports.purchaseItem = storeHandlers.purchaseItem;
exports.dailyCheckIn = storeHandlers.dailyCheckIn;
exports.deleteBook = bookHandlers.deleteBook;

// --- Scheduler ---
const schedulerHandlers = require("./handlers/scheduler");
exports.checkMeetingReminders = schedulerHandlers.checkMeetingReminders;

console.log("🚀 Functions loaded! GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Present" : "Missing");
