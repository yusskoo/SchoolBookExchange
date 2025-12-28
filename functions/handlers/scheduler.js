/**
 * ============================================
 * 排程任務模組 (Scheduler Handler)
 * ============================================
 * 
 * 主要功能:
 * 1. 檢查面交時間並發送提醒通知
 * 2. 發送互動式 LINE 訊息（確認按鈕）
 * 
 * 執行方式:
 * - 由外部排程服務（如 Cloud Scheduler）定期呼叫
 * - 建議每 15-30 分鐘執行一次
 */

// TODO: 改為使用 Cloud Scheduler + Pub/Sub 觸發（更可靠）
// TODO: 實作提醒通知的多次重試機制
// TODO: 加入面交前 1 小時的預先提醒
// TODO: 記錄提醒發送歷史供分析

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const lineService = require("../services/line-service");

// ============================================
// 檢查面交時間並發送提醒 (HTTP Endpoint)
// ============================================
/**
 * Pseudocode:
 * 1. 查詢需要提醒的交易：
 *    - status 為 Pending 或 Invoiced
 *    - meetingTime 已經到達或已過
 *    - 尚未發送過提醒（isMeetingNudgeSent != true）
 * 2. 對每筆交易：
 *    a. 建立互動式 LINE 訊息（Confirm Template）
 *    b. 發送給雙方（買家和賣家）
 *    c. 標記為已發送提醒
 * 3. 回傳處理結果統計
 * 
 * LINE 訊息格式:
 * - 使用 Confirm Template（兩個按鈕）
 * - 按鈕 1: ✅ 面交成功
 * - 按鈕 2: ❌ 面交失敗
 * - 使用 Postback 機制處理使用者回應
 * 
 * TODO: 加入交易詳情連結（快速查看明細）
 * TODO: 實作提醒時間可配置（不同使用者不同偏好）
 */
// ============================================
// 共用檢查邏輯
// ============================================
const runMeetingCheck = async () => {
    const db = admin.firestore();
    console.log("⏰ Starting Check Meeting Reminders (Logic)...");

    try {
        // Step 1: 查詢需要提醒的交易
        const { Timestamp } = require("firebase-admin/firestore");
        const now = Timestamp.now();

        const snapshot = await db.collection("transactions")
            .where("status", "in", ["Pending", "Invoiced"])
            .where("meetingTime", "<=", now)
            .get();

        let count = 0; // 成功發送提醒的計數

        // Step 2: 處理每筆交易
        for (const doc of snapshot.docs) {
            const data = doc.data();

            if (data.isMeetingNudgeSent) continue;
            if (!data.meetingTime) continue;
            if (!data.buyerId || !data.sellerId) continue;

            console.log(`Processing Nudge for transaction ${doc.id}`);

            // Step 3: 建立互動式 LINE 訊息
            const message = {
                type: "template",
                altText: "面交結果確認",
                template: {
                    type: "confirm",
                    text: "到了面交時間囉！\n面交完成後，請點擊下方按鈕回報結果：",
                    actions: [
                        { type: "postback", label: "✅ 面交成功", data: `action=confirm_success&transactionId=${doc.id}` },
                        { type: "postback", label: "❌ 面交失敗", data: `action=input_fail_reason&transactionId=${doc.id}` },
                    ],
                },
            };

            // Step 4: 發送訊息給賣家
            const sellerDoc = await db.collection("users").doc(data.sellerId).get();
            if (sellerDoc.exists && sellerDoc.data().lineUserId && sellerDoc.data().isLineNotifyEnabled) {
                const sellerMsg = JSON.parse(JSON.stringify(message));
                sellerMsg.template.actions[0].data += `&userId=${data.sellerId}`;
                sellerMsg.template.actions[1].data += `&userId=${data.sellerId}`;
                await lineService.pushMessage(sellerDoc.data().lineUserId, sellerMsg);
                console.log(`Sent reminder to seller ${data.sellerId}`);
            } else {
                console.log(`Seller ${data.sellerId} not notified (No LINE/Disabled)`);
            }

            // Step 5: 發送訊息給買家
            const buyerDoc = await db.collection("users").doc(data.buyerId).get();
            if (buyerDoc.exists && buyerDoc.data().lineUserId && buyerDoc.data().isLineNotifyEnabled) {
                const buyerMsg = JSON.parse(JSON.stringify(message));
                buyerMsg.template.actions[0].data += `&userId=${data.buyerId}`;
                buyerMsg.template.actions[1].data += `&userId=${data.buyerId}`;
                await lineService.pushMessage(buyerDoc.data().lineUserId, buyerMsg);
                console.log(`Sent reminder to buyer ${data.buyerId}`);
            } else {
                console.log(`Buyer ${data.buyerId} not notified (No LINE/Disabled)`);
            }

            // Step 6: 標記為已發送提醒
            await doc.ref.update({ isMeetingNudgeSent: true });
            count++;
        }

        const result = `Check Completed. Found ${snapshot.size} candidates. Reminded ${count}.`;
        console.log(result);
        return result;
    } catch (e) {
        console.error("Reminder Error:", e);
        throw e;
    }
};

// 排程觸發 (每分鐘)
exports.checkMeetingReminders = functions.pubsub.schedule('every 1 minutes').timeZone('Asia/Taipei').onRun(async (context) => {
    await runMeetingCheck();
    return null;
});

// HTTP 手動觸發 (Debugging)
exports.debugMeetingReminders = functions.https.onRequest(async (req, res) => {
    try {
        const result = await runMeetingCheck();
        res.status(200).send(result);
    } catch (e) {
        res.status(500).send(e.message);
    }
});
