import { db } from '../config.js';
import axios from 'axios';
export const bookService = {
    // 取得書籍列表 (即時監聽)
    onBooksSnapshot(callback) {
        return db.collection('books').onSnapshot(callback);
    },
    // 上架書籍
    async createBook(bookData) {
        return db.collection('books').add({
            ...bookData,
            status: 'Available'
        });
    },
    // 下架書籍 (刪除)
    async deleteBook(bookId) {
        return db.collection('books').doc(bookId).delete();
    },
    // 預訂書籍 (呼叫 Transaction API)
    async reserveBook(bookId, buyerId, price, meetingTime) {
        try {
            const response = await axios.post('http://127.0.0.1:5001/schoolbook-290b6/us-central1/handleBookTransaction', {
                bookId,
                buyerId,
                agreedPrice: Number(price),
                meetingTime // Pass selected time
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    // ...
    // 確認面交時間 (賣家)
    async confirmTransactionTime(transactionId) {
        const { functions } = await import('../config.js');
        const fn = functions.httpsCallable('confirmTransactionTime');
        return fn({ transactionId });
    },
    // ... existing reschedule methods
    // 取得使用者的交易紀錄 (買家或賣家)
    getUserTransactions(uid, callback) {
        return db.collection('transactions')
            .where('buyerId', '==', uid) // 暫時先只抓買家，複合查詢可能需要 Index
            // 為了簡化，我們分開查詢或讓後端處理，這裡先只查 "我是買家" 的
            // 實際應用可能需要 OR 查詢或分別監聽
            .onSnapshot(callback);
    },
    // 額外監聽 "我是賣家" 的交易
    getSellerTransactions(uid, callback) {
        return db.collection('transactions')
            .where('sellerId', '==', uid)
            .onSnapshot(callback);
    },
    // 更新交易狀態 (Completed / Canceled)
    async updateTransactionStatus(transactionId, newStatus) {
        // 使用 Callable Function
        const { functions } = await import('../config.js'); // 動態引入以避免循環依賴
        const updateFn = functions.httpsCallable('updateTransactionStatus');
        return updateFn({ transactionId, newStatus });
    },
    // 請求改期
    async requestReschedule(transactionId, newTime, reason) {
        const { functions } = await import('../config.js');
        const fn = functions.httpsCallable('requestReschedule');
        return fn({ transactionId, newTime, reason });
    },
    // 回覆改期
    async respondToReschedule(transactionId, response) {
        const { functions } = await import('../config.js');
        const fn = functions.httpsCallable('respondToReschedule');
        return fn({ transactionId, response });
    },
    // 取得許願池列表 (即時監聽)
    onWishesSnapshot(callback) {
        return db.collection('wishes').orderBy('timestamp', 'desc').onSnapshot(callback);
    },
    // 新增願望
    async addWish(user, content) {
        if (!user) throw new Error("請先登入");
        return db.collection('wishes').add({
            uid: user.uid,
            nickname: user.nickname || user.displayName || '隱身讀書人',
            avatarUrl: user.avatarUrl || '',
            content,
            timestamp: new Date()
        });
    }
};