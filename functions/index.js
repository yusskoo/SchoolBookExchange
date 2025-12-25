const admin = require('firebase-admin');

// Initialize Firebase Admin first
if (admin.apps.length === 0) {
    admin.initializeApp();
    console.log("Firebase Admin Initialized");
}

console.log("🚀 Functions loaded! GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Present" : "Missing");

// Import handlers
const authHandlers = require('./handlers/auth');
const transactionHandlers = require('./handlers/transaction');
const calendarHandlers = require('./handlers/calendar');

// Export functions
exports.checkSchoolEmail = authHandlers.checkSchoolEmail;
exports.completeProfile = authHandlers.completeProfile; // Export new function
exports.handleBookTransaction = transactionHandlers.handleBookTransaction;
exports.onTransactionCreate = transactionHandlers.onTransactionCreate; // New Trigger
exports.onTransactionUpdate = transactionHandlers.onTransactionUpdate;
exports.updateTransactionStatus = transactionHandlers.updateTransactionStatus;
exports.requestReschedule = transactionHandlers.requestReschedule;
exports.respondToReschedule = transactionHandlers.respondToReschedule;
exports.confirmTransactionTime = transactionHandlers.confirmTransactionTime;
exports.getExamCountdown = calendarHandlers.getExamCountdown;

// Review Handlers
const reviewHandlers = require('./handlers/review');
exports.addReview = reviewHandlers.addReview;
exports.onReviewCreated = reviewHandlers.onReviewCreated;


// LINE Handlers
const lineHandlers = require('./handlers/line-bot');
exports.generateBindingCode = lineHandlers.generateBindingCode;
exports.lineWebhook = lineHandlers.lineWebhook;

// Store Handlers
const storeHandlers = require('./handlers/store');
exports.purchaseItem = storeHandlers.purchaseItem;
exports.dailyCheckIn = storeHandlers.dailyCheckIn;

// Calendar Handlers (Already exported above)
