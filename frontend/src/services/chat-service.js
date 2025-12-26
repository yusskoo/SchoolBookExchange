import { db } from '../config.js';
import firebase from 'firebase/compat/app';

export const chatService = {
    // Send a message
    async sendMessage(transactionId, senderId, senderName, content, image = null, invoiceData = null) {
        if (!content?.trim() && !image) return;

        try {
            const transactionRef = db.collection('transactions').doc(transactionId);
            const messagesRef = transactionRef.collection('messages');

            // Get transaction to find the recipient
            const transDoc = await transactionRef.get();
            if (transDoc.exists) {
                const data = transDoc.data();
                const recipientId = (senderId === data.buyerId) ? data.sellerId : data.buyerId;

                // Add message
                await messagesRef.add({
                    senderId,
                    senderName,
                    content: content?.trim() || "",
                    image,
                    timestamp: new Date()
                });

                // Update transaction with unread status, preview, and invoice data if any
                const updates = {
                    lastMessage: content?.trim() || (image ? "[圖片]" : ""),
                    lastTimestamp: new Date(),
                    unreadBy: firebase.firestore.FieldValue.arrayUnion(recipientId)
                };

                if (invoiceData) {
                    updates.meetingTime = invoiceData.meetingTime || "";
                    updates.meetingLocation = invoiceData.meetingLocation || "";
                    updates.invoiceSentAt = invoiceData.invoiceSentAt || new Date();
                    updates.status = 'Invoiced';
                }

                await transactionRef.update(updates);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    },

    // Subscribe to messages in real-time
    subscribeToMessages(transactionId, callback) {
        const messagesRef = db.collection('transactions').doc(transactionId).collection('messages');

        return messagesRef
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
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
