import { db } from '../config.js';

export const chatService = {
    // Send a message
    async sendMessage(transactionId, senderId, senderName, content, image = null) {
        if (!content?.trim() && !image) return;

        try {
            const messagesRef = db.collection('transactions').doc(transactionId).collection('messages');
            await messagesRef.add({
                senderId,
                senderName,
                content: content?.trim() || "",
                image,
                timestamp: new Date()
            });
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
