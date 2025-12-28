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
exports.checkMeetingReminders = functions.https.onRequest(async (req, res) => {
    const db = admin.firestore();
    console.log("⏰ Starting Check Meeting Reminders...");

    try {
        // ========================================
        // Step 1: 查詢需要提醒的交易
        // ========================================
        // Pseudocode:
        // - 篩選條件：狀態為 Pending/Invoiced，且面交時間已到
        // - 使用 Firestore Timestamp 比較當前時間
        const { Timestamp } = require("firebase-admin/firestore");
        const now = Timestamp.now();

        const snapshot = await db.collection("transactions")
            .where("status", "in", ["Pending", "Invoiced"]) // 包含已開立明細的交易
            .where("meetingTime", "<=", now)                // 面交時間已到
            .get();

        let count = 0; // 成功發送提醒的計數

        // ========================================
        // Step 2: 處理每筆交易
        // ========================================
        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Pseudocode: 手動檢查過濾條件（避免複合索引問題）
            if (data.isMeetingNudgeSent) continue;  // 已發送過提醒，跳過
            if (!data.meetingTime) continue;        // 沒有設定面交時間，跳過
            if (!data.buyerId || !data.sellerId) continue; // 缺少參與者資訊，跳過

            console.log(`Processing Nudge for transaction ${doc.id}`);

            // ========================================
            // Step 3: 建立互動式 LINE 訊息
            // ========================================
            // Pseudocode:
            // - 使用 Confirm Template（兩個按鈕的確認訊息）
            // - Postback data 包含 action, transactionId, userId
            // - LINE Bot webhook 會處理 postback 事件
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
                            data: `action=confirm_success&transactionId=${doc.id}`,
                        },
                        {
                            type: "postback",
                            label: "❌ 面交失敗",
                            data: `action=input_fail_reason&transactionId=${doc.id}`,
                        },
                    ],
                },
            };

            // ========================================
            // Step 4: 發送訊息給賣家
            // ========================================
            // Pseudocode:
            // - 檢查賣家是否啟用 LINE 通知
            // - 在 postback data 中加入 userId（供 webhook handler 使用）
            // - 發送 LINE 訊息
            const sellerDoc = await db.collection("users").doc(data.sellerId).get();
            if (sellerDoc.exists && sellerDoc.data().lineUserId && sellerDoc.data().isLineNotifyEnabled) {
                const sellerMsg = JSON.parse(JSON.stringify(message));
                // 注入 userId 到 postback data
                sellerMsg.template.actions[0].data += `&userId=${data.sellerId}`;
                sellerMsg.template.actions[1].data += `&userId=${data.sellerId}`;
                await lineService.pushMessage(sellerDoc.data().lineUserId, sellerMsg);
            }

            // ========================================
            // Step 5: 發送訊息給買家
            // ========================================
            const buyerDoc = await db.collection("users").doc(data.buyerId).get();
            if (buyerDoc.exists && buyerDoc.data().lineUserId && buyerDoc.data().isLineNotifyEnabled) {
                const buyerMsg = JSON.parse(JSON.stringify(message));
                buyerMsg.template.actions[0].data += `&userId=${data.buyerId}`;
                buyerMsg.template.actions[1].data += `&userId=${data.buyerId}`;
                await lineService.pushMessage(buyerDoc.data().lineUserId, buyerMsg);
            }

            // ========================================
            // Step 6: 標記為已發送提醒
            // ========================================
            // Pseudocode: 更新交易文件，避免重複發送
            await doc.ref.update({ isMeetingNudgeSent: true });
            count++;
        }

        // 回傳處理結果
        res.status(200).send(`Checked ${snapshot.size} transactions. Reminded ${count}.`);
    } catch (e) {
        console.error("Reminder Error:", e);
        res.status(500).send(e.message);
    }
});
