const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");
const cors = require("cors")({origin: true});
const emailService = require("../services/email-service");

// 2. 處理書籍預訂 (HTTPS API)
exports.handleBookTransaction = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    console.log("收到交易請求內容:", req.body);
    const {bookId, buyerId, agreedPrice} = req.body || {};

    if (!bookId || !buyerId) {
      return res.status(400).send({message: "缺少必要參數"});
    }

    const db = admin.firestore();

    try {
      const result = await db.runTransaction(async (t) => {
        const bookRef = db.collection("books").doc(bookId);
        const bookDoc = await t.get(bookRef);

        if (!bookDoc.exists) throw new Error("找不到該書籍");

        if (bookDoc.data().status !== "Available") {
          // [New] Check if user is participant of the active transaction
          if (bookDoc.data().status === "Reserved") {
            const transQuery = db.collection("transactions")
                .where("bookId", "==", bookId)
                .where("status", "==", "Pending")
                .limit(1);
            const transSnap = await t.get(transQuery);

            if (!transSnap.empty) {
              const transDoc = transSnap.docs[0];
              const transData = transDoc.data();
              // Allow Buyer or Seller to re-enter
              if (buyerId === transData.buyerId || buyerId === transData.sellerId) {
                return {existingId: transDoc.id};
              }
            }
          }
          throw new Error("書籍已被預訂");
        }

        const bookData = bookDoc.data();
        const sellerId = bookData.sellerId || bookData.ownerId;

        if (!sellerId) throw new Error("書籍缺少賣家資訊");

        // 1. Get Seller Info for Notification Check (READ)
        const sellerUserRef = db.collection("users").doc(sellerId);
        const sellerSnap = await t.get(sellerUserRef);
        const sellerData = sellerSnap.data() || {};
        const shouldNotifyLine = !!sellerData.isLineNotifyEnabled;
        const lineUserId = sellerData.lineUserId;
        console.log(`Checking Line Notify for seller ${sellerId}: ${shouldNotifyLine}, LID: ${lineUserId}`);

        // 2. 更新書籍狀態 (WRITE)
        t.update(bookRef, {status: "Reserved", reservedBy: buyerId});

        // Send LINE Notification if applicable
        if (shouldNotifyLine && lineUserId) {
          // ... (comment)
        }

        // 2. 建立交易紀錄
        const transRef = db.collection("transactions").doc();
        t.set(transRef, {
          bookId,
          bookTitle: bookData.title,
          buyerId,
          sellerId: sellerId,
          agreedPrice: parseInt(agreedPrice),
          status: "Pending",
          timestamp: new Date(),
          // Flow V2.1: Buyer sets time on create
          meetingTime: req.body.meetingTime ? new Date(req.body.meetingTime) : null,
          isTimeAgreed: false,
          rescheduleCount: 0,
          // Store notification status snapshot if needed, or just relied on logging for now
          isLineNotifyTriggered: shouldNotifyLine,
        });
        return {newId: transRef.id}; // Return new ID
      });

      if (result && result.existingId) {
        console.log("✅ 恢復現有交易:", result.existingId);
        return res.status(200).send({success: true, transactionId: result.existingId, message: "進入聊天室"});
      }
      if (result && result.newId) {
        console.log("✅ 建立新交易:", result.newId);
        // Need to handle notification here if we moved it out? No, logic is simple enough inside.
        return res.status(200).send({success: true, transactionId: result.newId, message: "預訂成功"});
      }
      // Should not happen
      res.status(200).send({success: true, message: "預訂成功"});
    } catch (e) {
      console.error("交易執行失敗，具體原因:", e.message);
      res.status(500).send({message: e.message});
    }
  });
});

// 3. 監聽交易更新：獎懲邏輯 + 發送通知
// 3.1 New Order Notification (Improved)
exports.onTransactionCreate = functions.firestore
    .document("transactions/{transactionId}")
    .onCreate(async (snap, context) => {
      const data = snap.data();
      const db = admin.firestore();

      // Fetch Seller to check LINE binding
      const sellerRef = db.collection("users").doc(data.sellerId);
      const sellerDoc = await sellerRef.get();
      if (!sellerDoc.exists) return;

      const sellerData = sellerDoc.data();
      if (sellerData.isLineNotifyEnabled && sellerData.lineUserId) {
        const lineService = require("../services/line-service");
        const msg = `📦 新訂單通知！\n\n買家已預訂您的書籍：「${data.bookTitle}」\n價格：$${data.agreedPrice}\n\n請盡快開啟網頁確認交易時間。`;
        try {
          await lineService.pushMessage(sellerData.lineUserId, msg);
          console.log("LINE Notification sent to", data.sellerId);
        } catch (e) {
          console.error("Failed to send LINE:", e);
        }
      }
    });

exports.onTransactionUpdate = functions.firestore
    .document("transactions/{transactionId}")
    .onUpdate(async (change, context) => {
      const before = change.before.data();
      const after = change.after.data();
      if (!before || !after) return null;

      const oldStatus = before.status;
      const newStatus = after.status;
      const {sellerId, buyerId, bookTitle} = after;

      const db = admin.firestore();

      // --- [NEW] 偵測明細開立（賣家發送明細訊息） ---
      if (!before.invoiceSentAt && after.invoiceSentAt) {
        console.log("🧾 Invoice detected for transaction:", context.params.transactionId);

        // 呼叫 LINE bot handler 發送明細通知
        const lineBotHandlers = require("./line-bot");
        try {
          await lineBotHandlers.sendInvoiceNotification({
            id: context.params.transactionId,
            ...after,
          }, db);

          console.log("✅ Invoice notification sent via LINE");
        } catch (e) {
          console.error("❌ Failed to send invoice notification:", e);
        }
      }

      // --- 輔助函式：更新信用分數 ---
      const updateScore = async (userId, scoreChange, isCancel = false) => {
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const updates = {
            creditScore: (userData.creditScore || 100) + scoreChange,
          };
          if (isCancel) {
            updates.canceledTransactions = (userData.canceledTransactions || 0) + 1;
          } else {
            updates.completedTransactions = (userData.completedTransactions || 0) + 1;
            updates.totalTransactions = (userData.totalTransactions || 0) + 1;
          }
          await userRef.update(updates);
          return userData.email;
        }
        return null;
      };

      // --- 情境 A：交易完成 (加分 + 發信) ---
      if (oldStatus === "Pending" && newStatus === "Completed") {
        const sellerEmail = await updateScore(sellerId, 5);
        await updateScore(buyerId, 5);

        if (sellerEmail) {
          await emailService.sendTransactionNotification(sellerEmail, bookTitle, 5);
        }

        // [NEW] 發送交易完成的 LINE 通知
        const lineService = require("../services/line-service");

        // 通知賣家
        const sellerDoc = await db.collection("users").doc(sellerId).get();
        if (sellerDoc.exists && sellerDoc.data().lineUserId) {
          try {
            await lineService.pushMessage(
                sellerDoc.data().lineUserId,
                `🎉 交易完成！\n\n書籍「${bookTitle}」的交易已順利完成。\n您獲得了 +5 信用積分！`,
            );
          } catch (e) {
            console.error("Failed to send completion LINE to seller:", e);
          }
        }

        // 通知買家
        const buyerDoc = await db.collection("users").doc(buyerId).get();
        if (buyerDoc.exists && buyerDoc.data().lineUserId) {
          try {
            await lineService.pushMessage(
                buyerDoc.data().lineUserId,
                `🎉 交易完成！\n\n書籍「${bookTitle}」的交易已順利完成。\n您獲得了 +5 信用積分！\n\n感謝使用校園二手書循環平台！`,
            );
          } catch (e) {
            console.error("Failed to send completion LINE to buyer:", e);
          }
        }
      }
      // --- 情境 B：交易取消 (扣分) ---
      else if (oldStatus === "Pending" && newStatus === "Canceled") {
        await updateScore(sellerId, -10, true);
        await updateScore(buyerId, -10, true);
      }
    });

// 4. 更新交易狀態 (Confirm / Cancel)
exports.updateTransactionStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "請先登入帳號");
  }

  const {transactionId, newStatus} = data;
  const uid = context.auth.uid;

  if (!["Completed", "Canceled"].includes(newStatus)) {
    throw new functions.https.HttpsError("invalid-argument", "無效的狀態更新");
  }

  const db = admin.firestore();
  const transRef = db.collection("transactions").doc(transactionId);

  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(transRef);
      if (!doc.exists) throw new functions.https.HttpsError("not-found", "交易紀錄不存在");

      const trans = doc.data();
      if (trans.status !== "Pending") {
        throw new functions.https.HttpsError("failed-precondition", "交易狀態已鎖定，無法變更");
      }

      // 權限檢查
      const isBuyer = trans.buyerId === uid;
      const isSeller = trans.sellerId === uid;

      if (!isBuyer && !isSeller) {
        throw new functions.https.HttpsError("permission-denied", "您無權操作此交易");
      }

      // 邏輯檢查
      if (newStatus === "Completed") {
        // 只有買家可以確認收貨 (完成交易)
        if (!isBuyer) {
          throw new functions.https.HttpsError("permission-denied", "只有買家可以確認收貨");
        }
      }
      // Cancel 可以由雙方發起

      // 執行更新
      t.update(transRef, {
        status: newStatus,
        updatedAt: new Date(),
        completedAt: newStatus === "Completed" ? new Date() : null,
        canceledBy: newStatus === "Canceled" ? uid : null,
      });

      const {FieldValue} = require("firebase-admin/firestore");

      // ... (existing code)

      // 如果是取消，也要把書籍狀態改回 Available
      if (newStatus === "Canceled") {
        const bookRef = db.collection("books").doc(trans.bookId);
        t.update(bookRef, {status: "Available", reservedBy: FieldValue.delete()});
      }
    });

    return {success: true, message: `交易已${newStatus === "Completed" ? "完成" : "取消"}`};
  } catch (e) {
    console.error("更新交易失敗:", e);
    throw e instanceof functions.https.HttpsError ? e : new functions.https.HttpsError("internal", e.message);
  }
});

// 5. 請求改期
exports.requestReschedule = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "請先登入");

  const {transactionId, newTime, reason} = data;
  const uid = context.auth.uid;
  const db = admin.firestore();
  const transRef = db.collection("transactions").doc(transactionId);

  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(transRef);
      if (!doc.exists) throw new functions.https.HttpsError("not-found", "交易不存在");
      const trans = doc.data();

      if (trans.buyerId !== uid && trans.sellerId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "非交易當事人");
      }
      if (trans.status !== "Pending") {
        throw new functions.https.HttpsError("failed-precondition", "交易狀態不符");
      }
      if ((trans.rescheduleCount || 0) >= 2) {
        throw new functions.https.HttpsError("resource-exhausted", "改期次數已達上限 (2次)");
      }
      if (trans.rescheduleRequest) {
        throw new functions.https.HttpsError("already-exists", "已有進行中的改期請求");
      }

      // Time Constraint: Must be > 2 hours before current meetingTime
      if (trans.meetingTime) {
        const meetingTimeMillis = trans.meetingTime.toMillis ? trans.meetingTime.toMillis() : new Date(trans.meetingTime).getTime();
        const nowMillis = Date.now();
        const twoHours = 2 * 60 * 60 * 1000;

        if (meetingTimeMillis - nowMillis < twoHours) {
          throw new functions.https.HttpsError("deadline-exceeded", "距離面交時間不足 2 小時，無法線上改期");
        }
      }

      // Create Request
      t.update(transRef, {
        rescheduleRequest: {
          newTime: new Date(newTime),
          requesterId: uid,
          reason: reason || "",
          timestamp: new Date(),
        },
      });
    });
    return {success: true};
  } catch (e) {
    throw e instanceof functions.https.HttpsError ? e : new functions.https.HttpsError("internal", e.message);
  }
});

// 6. 回覆改期 (同意/拒絕)
exports.respondToReschedule = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "請先登入");

  const {transactionId, response} = data; // 'accept' or 'reject'
  const uid = context.auth.uid;
  const db = admin.firestore();
  const transRef = db.collection("transactions").doc(transactionId);

  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(transRef);
      if (!doc.exists) throw new functions.https.HttpsError("not-found", "交易不存在");
      const trans = doc.data();

      if (!trans.rescheduleRequest) {
        throw new functions.https.HttpsError("failed-precondition", "無待處理的改期請求");
      }

      // Requester cannot respond to their own request
      if (trans.rescheduleRequest.requesterId === uid) {
        throw new functions.https.HttpsError("permission-denied", "您無法審核自己的請求");
      }
      if (trans.buyerId !== uid && trans.sellerId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "非交易當事人");
      }

      const {FieldValue} = require("firebase-admin/firestore");

      if (response === "accept") {
        const newCount = (trans.rescheduleCount || 0) + 1;
        t.update(transRef, {
          meetingTime: trans.rescheduleRequest.newTime,
          rescheduleCount: newCount,
          rescheduleRequest: FieldValue.delete(),
        });
      } else {
        t.update(transRef, {
          rescheduleRequest: FieldValue.delete(),
        });
      }
    });
    return {success: true};
  } catch (e) {
    throw e instanceof functions.https.HttpsError ? e : new functions.https.HttpsError("internal", e.message);
  }
});

// 7. 賣家確認面交時間
exports.confirmTransactionTime = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "請先登入");

  const {transactionId} = data;
  const uid = context.auth.uid;
  const db = admin.firestore();
  const transRef = db.collection("transactions").doc(transactionId);

  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(transRef);
      if (!doc.exists) throw new functions.https.HttpsError("not-found", "交易不存在");
      const trans = doc.data();

      if (trans.sellerId !== uid) {
        // Only seller can confirm the initial time proposal from buyer
        throw new functions.https.HttpsError("permission-denied", "只有賣家可以確認初始時間");
      }
      if (trans.isTimeAgreed) {
        throw new functions.https.HttpsError("failed-precondition", "時間已確認");
      }

      t.update(transRef, {isTimeAgreed: true});
    });
    return {success: true};
  } catch (e) {
    throw e instanceof functions.https.HttpsError ? e : new functions.https.HttpsError("internal", e.message);
  }
});
