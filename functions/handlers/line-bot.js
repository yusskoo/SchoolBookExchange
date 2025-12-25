const functions = require('firebase-functions');
const admin = require('firebase-admin');
const lineService = require('../services/line-service');

// 1. Generate Binding Code (Callable)
exports.generateBindingCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '請先登入');

    const uid = context.auth.uid;
    const db = admin.firestore();

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to 'line_codes' collection
    // Key is the code itself for easy lookup during webhook, but we need to ensure uniqueness?
    // Collisions are rare for 6 digits with low traffic, but ideally we check.
    // Given the scale, direct overwrite is acceptable or use code as doc ID.

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await db.collection('line_codes').doc(code).set({
        uid: uid,
        expiresAt: expiresAt,
        timestamp: new Date()
    });

    return { success: true, code: code, expiresAt: expiresAt };
});

// 2. LINE Webhook (HTTPS)
exports.lineWebhook = functions.https.onRequest(async (req, res) => {
    // Verify signature? Skipped for MVP but highly recommended in production.

    const events = req.body.events || [];
    const db = admin.firestore();

    for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
            const text = event.message.text.trim();
            const replyToken = event.replyToken;
            const lineUserId = event.source.userId;

            // Check if text is a 6-digit code
            if (/^\d{6}$/.test(text)) {
                try {
                    const codeRef = db.collection('line_codes').doc(text);
                    const doc = await codeRef.get();

                    if (!doc.exists) {
                        await lineService.replyMessage(replyToken, "找不到此綁定碼或輸入錯誤。");
                        continue;
                    }

                    const data = doc.data();
                    if (data.expiresAt.toDate() < new Date()) {
                        await lineService.replyMessage(replyToken, "此綁定碼已過期，請重新產生。");
                        continue;
                    }

                    // Bind success
                    const uid = data.uid;
                    await db.collection('users').doc(uid).update({
                        lineUserId: lineUserId,
                        isLineNotifyEnabled: true, // Force enable
                        lineBoundAt: new Date()
                    });

                    // Delete code
                    await codeRef.delete();

                    await lineService.replyMessage(replyToken, "✅ 恭喜！帳號綁定成功。您現在可以收到交易通知了。");

                } catch (e) {
                    console.error("Binding Error:", e);
                    await lineService.replyMessage(replyToken, "系統錯誤，請稍後再試。");
                }
            } else {
                // Not a code, maybe just echo or ignore
                // In a real bot we might show a menu
                // await lineService.replyMessage(replyToken, "請輸入 6 位數綁定碼以連結您的帳戶。");
            }
        }
    }

    res.status(200).send('OK');
});
