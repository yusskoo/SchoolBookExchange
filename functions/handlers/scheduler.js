const functions = require("firebase-functions");
const admin = require("firebase-admin");
const lineService = require("../services/line-service");

// 排程檢查會議時間，發送「回報結果」通知
exports.checkMeetingReminders = functions.https.onRequest(async (req, res) => {
    const db = admin.firestore();
    console.log("⏰ Starting Check Meeting Reminders...");

    try {
        // 1. 找出需要通知的交易
        // 條件: status == 'Pending' (or Invoiced?), meetingTime <= now, isMeetingNudgeSent != true
        // Invoice 已經發送才會有點意義
        const now = admin.firestore.Timestamp.now();

        const snapshot = await db.collection("transactions")
            .where("status", "==", "Pending") // 假設還沒 Completed/Canceled
            .where("meetingTime", "<=", now)
            .get();

        let count = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Check filters manually if compound index is missing
            if (data.isMeetingNudgeSent) continue;
            if (!data.meetingTime) continue; // Should be filtered by query but double check
            if (!data.buyerId || !data.sellerId) continue;

            console.log(`Processing Nudge for transaction ${doc.id}`);

            // Prepare Message
            const message = {
                type: "template",
                altText: "面交結果確認",
                template: {
                    type: "confirm",
                    text: "到了面交時間囉！\n面交完成後，請點擊下方按鈕回報結果：",
                    actions: [
                        {
                            type: "postback",
                            label: "✅ 面交成功",
                            data: `action=confirm_success&transactionId=${doc.id}`, // userId will be injected by line-bot handler? No, here we send to specific user. POSTBACK needs to know who clicked?
                            // The postback event in webhook contains source.userId.
                            // But my handler logic uses userId param in data?
                            // Let's check line-bot.js postback handler.
                            // It uses 'action' and 'transactionId'. 'userId' is usually from source?
                            // In previous code: data: `action=confirm_success&transactionId=${transId}&userId=${recipient.uid}`
                            // I should include userId in data if handler expects it.
                        },
                        {
                            type: "postback",
                            label: "❌ 面交失敗",
                            data: `action=input_fail_reason&transactionId=${doc.id}`,
                        },
                    ],
                },
            };

            // Send to Seller
            const sellerDoc = await db.collection("users").doc(data.sellerId).get();
            if (sellerDoc.exists && sellerDoc.data().lineUserId && sellerDoc.data().isLineNotifyEnabled) {
                const sellerMsg = JSON.parse(JSON.stringify(message));
                // Inject userId for logic (though logic should use source.userId for security, but sticking to existing pattern)
                sellerMsg.template.actions[0].data += `&userId=${data.sellerId}`;
                sellerMsg.template.actions[1].data += `&userId=${data.sellerId}`;
                await lineService.pushMessage(sellerDoc.data().lineUserId, sellerMsg);
            }

            // Send to Buyer
            const buyerDoc = await db.collection("users").doc(data.buyerId).get();
            if (buyerDoc.exists && buyerDoc.data().lineUserId && buyerDoc.data().isLineNotifyEnabled) {
                const buyerMsg = JSON.parse(JSON.stringify(message));
                buyerMsg.template.actions[0].data += `&userId=${data.buyerId}`;
                buyerMsg.template.actions[1].data += `&userId=${data.buyerId}`;
                await lineService.pushMessage(buyerDoc.data().lineUserId, buyerMsg);
            }

            // Mark as Sent
            await doc.ref.update({ isMeetingNudgeSent: true });
            count++;
        }

        res.status(200).send(`Checked ${snapshot.size} transactions. Reminded ${count}.`);
    } catch (e) {
        console.error("Reminder Error:", e);
        res.status(500).send(e.message);
    }
});
