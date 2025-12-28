/**
 * ============================================
 * 前端聊天服務 (Chat Service)
 * ============================================
 * 
 * 主要功能:
 * 1. 發送聊天訊息（文字、圖片、交易明細）
 * 2. 即時訂閱訊息（Firestore onSnapshot）
 * 3. 更新未讀狀態
 * 
 * 資料結構:
 * - transactions/{transactionId}/messages - 訊息子集合
 * - 每筆交易有獨立的訊息室
 */

// TODO: 實作訊息已讀回條
// TODO: 加入訊息撤回功能
// TODO: 實作訊息搜尋功能
// TODO: 加入檔案上傳支援

import { db } from '../config.js';
import firebase from 'firebase/compat/app';

export const chatService = {
    /**
     * 發送訊息
     * 
     * Pseudocode:
     * 1. 驗證訊息內容（文字或圖片至少有一個）
     * 2. 讀取交易資料以確定收訊者
     * 3. 將訊息加入 messages 子集合
     * 4. 更新交易的最後訊息預覽和未讀狀態
     * 5. 如果包含交易明細，更新交易狀態
     * 
     * @param {string} transactionId - 交易 ID
     * @param {string} senderId - 發送者 UID
     * @param {string} senderName - 發送者暱稱
     * @param {string} content - 訊息內容
     * @param {string|null} image - 圖片 URL（選填）
     * @param {Object|null} invoiceData - 交易明細資料（選填）
     * @returns {Promise}
     * 
     * TODO: 加入訊息類型標記（系統訊息、一般訊息等）
     * TODO: 實作訊息發送失敗重試機制
     */
    async sendMessage(transactionId, senderId, senderName, content, image = null, invoiceData = null) {
        // Pseudocode: 驗證至少有文字或圖片
        if (!content?.trim() && !image) return;

        try {
            const transactionRef = db.collection('transactions').doc(transactionId);
            const messagesRef = transactionRef.collection('messages');

            // Pseudocode: 讀取交易資料以確定收訊者
            const transDoc = await transactionRef.get();
            if (transDoc.exists) {
                const data = transDoc.data();
                // 確定收訊者（如果我是買家，收訊者就是賣家，反之亦然）
                const recipientId = (senderId === data.buyerId) ? data.sellerId : data.buyerId;

                // Pseudocode: 將訊息加入 messages 子集合
                await messagesRef.add({
                    senderId,
                    senderName,
                    content: content?.trim() || "",
                    image,
                    timestamp: new Date()
                });

                // Pseudocode: 更新交易的最後訊息預覽和未讀狀態
                const updates = {
                    lastMessage: content?.trim() || (image ? "[圖片]" : ""),
                    lastTimestamp: new Date(),
                    unreadBy: firebase.firestore.FieldValue.arrayUnion(recipientId) // 加入至未讀清單
                };

                // Pseudocode: 如果包含交易明細資料，一併更新
                if (invoiceData) {
                    updates.meetingTime = invoiceData.meetingTime || "";
                    updates.meetingLocation = invoiceData.meetingLocation || "";
                    updates.invoiceSentAt = invoiceData.invoiceSentAt || new Date();
                    updates.status = 'Invoiced'; // 更新狀態為「已開立明細」
                }

                await transactionRef.update(updates);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    },

    /**
     * 即時訂閱訊息（Firestore Snapshot）
     * 
     * Pseudocode:
     * 1. 訂閱 messages 子集合的即時變化
     * 2. 按時間排序（舊到新）
     * 3. 當有新訊息時自動觸發 callback
     * 
     * @param {string} transactionId - 交易 ID
     * @param {Function} callback - 收到訊息時的回調函數
     * @returns {Function} unsubscribe 函數（用於取消訂閱）
     * 
     * TODO: 加入訊息分頁載入（避免一次載入太多訊息）
     * TODO: 實作訊息快取機制
     */
    subscribeToMessages(transactionId, callback) {
        const messagesRef = db.collection('transactions').doc(transactionId).collection('messages');

        return messagesRef
            .orderBy('timestamp', 'asc') // 按時間排序（舊 → 新）
            .onSnapshot((snapshot) => {
                // Pseudocode: 將文件轉換為訊息陣列
                const messages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(messages);
            }, (error) => {
                console.error("Error subscribing to messages:", error);
            });
    }
};
