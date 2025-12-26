import { db } from '../config.js';
import axios from 'axios';
import firebase from 'firebase/compat/app';

export const bookService = {
    // 取得書籍列表 (即時監聽)
    onBooksSnapshot(callback, errorCallback) {
        return db.collection('books').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
            const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(books);
        }, error => {
            console.error("Books snapshot error:", error);
            if (errorCallback) errorCallback(error);
        });
    },
    // 取得我的書籍 (即時監聽)
    getMyBooks(uid, callback) {
        return db.collection('books')
            .where('sellerId', '==', uid)
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(books);
            });
    },
    // 上架書籍
    async createBook(bookData) {
        return db.collection('books').add({
            ...bookData,
            status: 'Available',
            views: 0 // Initialize views
        });
    },
    // 增加瀏覽次數
    async incrementBookView(bookId) {
        return db.collection('books').doc(bookId).update({
            views: firebase.firestore.FieldValue.increment(1)
        });
    },
    // 下架書籍 (刪除) - 改用 Callable Function 以避免權限問題
    async deleteBook(bookId) {
        const { functions } = await import('../config.js');
        const deleteBookFn = functions.httpsCallable('deleteBook');
        return deleteBookFn({ bookId });
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
    // 新增: 處理書本交易 (直接呼叫 Firebase Functions) - 用於 Chat
    async startTransaction(book, currentUser, onTransactionCreated) {
        if (!currentUser) return alert("請先登入");
        if (currentUser.uid === book.sellerId) return alert("不能購買自己的書");

        try {
            const transactionsRef = db.collection('transactions');
            const q = transactionsRef
                .where('bookId', '==', book.id)
                .where('buyerId', '==', currentUser.uid);

            const snapshot = await q.get();
            if (!snapshot.empty) {
                onTransactionCreated(snapshot.docs[0].id);
            } else {
                const docRef = await transactionsRef.add({
                    bookId: book.id,
                    bookTitle: book.title,
                    sellerId: book.sellerId,
                    buyerId: currentUser.uid,
                    price: book.price,
                    status: 'Pending',
                    timestamp: new Date()
                });

                // Add notification for seller
                await this.addNotification({
                    userId: book.sellerId,
                    content: `你上架的《${book.title}》有人詢問喔~`,
                    type: 'inquiry'
                });

                onTransactionCreated(docRef.id);
            }
        } catch (e) {
            console.error(e);
            alert("無法開啟對話: " + e.message);
        }
    },

    // 確認面交時間 (賣家)
    async confirmTransactionTime(transactionId) {
        const { functions } = await import('../config.js');
        const fn = functions.httpsCallable('confirmTransactionTime');
        return fn({ transactionId });
    },

    getUserTransactions(uid, callback) {
        return db.collection('transactions')
            .where('buyerId', '==', uid)
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
        return db.collection('wishes').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
            const wishes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(wishes);
        });
    },
    // 新增願望
    async addWish({ content, user, avatarId, image }) {
        return db.collection('wishes').add({
            uid: firebase.auth().currentUser?.uid || 'anonymous',
            user: user || '同學',
            avatarId: avatarId || 'default',
            content,
            image: image || null,
            timestamp: new Date()
        });
    },
    // 刪除願望
    async deleteWish(wishId) {
        return db.collection('wishes').doc(wishId).delete();
    },
    // Helper to add book (from App.jsx usage: addBook(data))
    async addBook(bookData) {
        return db.collection('books').add({
            ...bookData,
            status: 'Available',
            timestamp: new Date()
        });
    },
    // 新增: 刪除交易 (用於清理下架書籍的聊天室)
    async deleteTransaction(transactionId) {
        return db.collection('transactions').doc(transactionId).delete();
    },
    // 標記訊息為已讀
    async markAsRead(transactionId, userId) {
        return db.collection('transactions').doc(transactionId).update({
            unreadBy: firebase.firestore.FieldValue.arrayRemove(userId)
        });
    },
    // --- 通知系統 (Notifications) ---
    // 訂閱通知
    subscribeToNotifications(userId, callback) {
        return db.collection('notifications')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .onSnapshot(snapshot => {
                const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(notifications);
            });
    },
    // 標記通知為已讀
    async markNotificationAsRead(notificationId) {
        return db.collection('notifications').doc(notificationId).update({
            isRead: true
        });
    },
    // 新增通知 (內部調用)
    async addNotification({ userId, content, type = 'system' }) {
        return db.collection('notifications').add({
            userId,
            content,
            type,
            isRead: false,
            timestamp: new Date()
        });
    },
    // Helper to record checkin
    recordCheckIn() {
        // LocalStorage or minimal DB
        localStorage.setItem('lastCheckIn', new Date().toDateString());
    },
    hasCheckedInToday() {
        return localStorage.getItem('lastCheckIn') === new Date().toDateString();
    }
};