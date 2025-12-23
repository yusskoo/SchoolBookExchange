const admin = require('firebase-admin');

// Initialize Firebase Admin first
if (admin.apps.length === 0) {
    admin.initializeApp();
}

console.log("🚀 Functions loaded! Env:", process.env.GMAIL_USER ? "Present" : "Missing");

// Import handlers
const authHandlers = require('./handlers/auth');
const transactionHandlers = require('./handlers/transaction');

// Export functions
exports.checkSchoolEmail = authHandlers.checkSchoolEmail;
exports.completeProfile = authHandlers.completeProfile; // Export new function
exports.handleBookTransaction = transactionHandlers.handleBookTransaction;
exports.onTransactionUpdate = transactionHandlers.onTransactionUpdate;
exports.updateTransactionStatus = transactionHandlers.updateTransactionStatus;
exports.requestReschedule = transactionHandlers.requestReschedule;
exports.respondToReschedule = transactionHandlers.respondToReschedule;
exports.confirmTransactionTime = transactionHandlers.confirmTransactionTime;

// Review Handlers
const reviewHandlers = require('./handlers/review');
exports.addReview = reviewHandlers.addReview;
exports.onReviewCreated = reviewHandlers.onReviewCreated;

// AI Handlers
const aiHandlers = require('./handlers/ai');
exports.analyzeImage = aiHandlers.analyzeImage;