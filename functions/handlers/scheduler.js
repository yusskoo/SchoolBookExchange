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
    const {Timestamp} = require("firebase-admin/firestore");
    const now = Timestamp.now();
    const oneDayLater = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayLaterTs = Timestamp.fromDate(oneDayLater);

    let count = 0;

    // ==========================================
    // Part A: 24h Pre-Meeting Reminder (NEW)
    // ==========================================
    // Logic: meetingTime > now AND meetingTime <= now + 24h
    // Note: Firestore doesn't support multiple range filters on different fields easily if not indexed,
    // but here it's same field 'meetingTime'.
    // We look for: Pending/Invoiced, meetingTime <= 24h from now, is24hReminderSent != true

    const preSnap = await db.collection("transactions")
        .where("status", "in", ["Pending", "Invoiced"])
        .where("meetingTime", ">", now)
        .where("meetingTime", "<=", dayLaterTs)
        .get();

    for (const doc of preSnap.docs) {
      const data = doc.data();
      if (data.is24hReminderSent) continue;
      if (!data.meetingTime) continue;

      console.log(`[24h Reminder] Processing ${doc.id}`);

      const meetingTimeStr = new Date(data.meetingTime.toDate()).toLocaleString("zh-TW", {timeZone: "Asia/Taipei"});
      const location = data.meetingLocation || "未設定地點";

      const msgContent = `⏰ 溫馨提醒：距離您的面交時間不到 24 小時囉！請記得準時赴約。\n\n時間：${meetingTimeStr}\n地點：${location}`;
      const notifContent = `⏰ 面交提醒：您有一筆交易即將在 24 小時內進行，別忘記囉！`;

      // 1. Send LINE & In-App to Seller
      await sendReminderToUser(db, data.sellerId, msgContent, notifContent);

      // 2. Send LINE & In-App to Buyer
      await sendReminderToUser(db, data.buyerId, msgContent, notifContent);

      // 3. Mark as sent
      await doc.ref.update({is24hReminderSent: true});
      count++;
    }

    // ==========================================
    // Part B: Post-Meeting Nudge (Existing)
    // ==========================================
    const postSnap = await db.collection("transactions")
        .where("status", "in", ["Pending", "Invoiced"])
        .where("meetingTime", "<=", now)
        .get();

    for (const doc of postSnap.docs) {
      const data = doc.data();

      if (data.isMeetingNudgeSent) continue;
      if (!data.meetingTime) continue;
      // Only send nudge if it's reasonably recent (e.g. within 3 days)?
      // For now, keep existing logic but ensure we check field exists
      if (!data.buyerId || !data.sellerId) continue;

      console.log(`[Post-Meeting Nudge] Processing ${doc.id}`);

      // Step 3: 建立互動式 LINE 訊息
      const message = {
        type: "template",
        altText: "面交結果確認",
        template: {
          type: "confirm",
          text: "到了面交時間囉！\n面交完成後，請點擊下方按鈕回報結果：",
          actions: [
            {type: "postback", label: "✅ 面交成功", data: `action=confirm_success&transactionId=${doc.id}`},
            {type: "postback", label: "❌ 面交失敗", data: `action=input_fail_reason&transactionId=${doc.id}`},
          ],
        },
      };

      // Send to Seller
      await sendLineMessage(db, data.sellerId, JSON.parse(JSON.stringify(message)), data.sellerId);
      // Send to Buyer
      await sendLineMessage(db, data.buyerId, JSON.parse(JSON.stringify(message)), data.buyerId);

      // Step 6: 標記為已發送提醒
      await doc.ref.update({isMeetingNudgeSent: true});
      count++;
    }

    const result = `Check Completed. Sent ${count} reminders/nudges.`;
    console.log(result);
    return result;
  } catch (e) {
    console.error("Reminder Error:", e);
    throw e;
  }
};

// 排程觸發 (每分鐘)
exports.checkMeetingReminders = functions.pubsub.schedule("every 1 minutes").timeZone("Asia/Taipei").onRun(async (context) => {
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

// Helpers
async function sendReminderToUser(db, userId, lineText, inAppContent) {
  if (!userId) return;

  // 1. In-App Notification
  try {
    await db.collection("notifications").add({
      userId,
      content: inAppContent,
      type: "system",
      isRead: false,
      timestamp: new Date(),
    });
  } catch (e) {
    console.error(`Failed to create in-app notif for ${userId}`, e);
  }

  // 2. LINE Notification
  const userDoc = await db.collection("users").doc(userId).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    if (userData.lineUserId && userData.isLineNotifyEnabled) {
      try {
        await lineService.pushMessage(userData.lineUserId, lineText);
        console.log(`Sent LINE reminder to ${userId}`);
      } catch (e) {
        console.error(`Failed to send LINE reminder to ${userId}`, e);
      }
    }
  }
}

async function sendLineMessage(db, userId, messageObj, actionUserId) {
  const userDoc = await db.collection("users").doc(userId).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    if (userData.lineUserId && userData.isLineNotifyEnabled) {
      // Inject userId into action data if needed (for confirm template)
      if (messageObj.template && messageObj.template.actions) {
        messageObj.template.actions.forEach((action) => {
          if (action.data && !action.data.includes("userId=")) {
            action.data += `&userId=${actionUserId}`;
          }
        });
      }
      try {
        await lineService.pushMessage(userData.lineUserId, messageObj);
        console.log(`Sent LINE message to ${userId}`);
      } catch (e) {
        console.error(`Failed to send LINE message to ${userId}`, e);
      }
    }
  }
}
