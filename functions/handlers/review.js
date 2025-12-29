/**
 * ============================================
 * 評論系統模組 (Review Handler)
 * ============================================
 *
 * 主要功能:
 * 1. 新增交易評論（Callable Function）
 * 2. 聚合計算使用者平均評分（Firestore Trigger）
 *
 * 評分規則:
 * - 只有已完成的交易可以評分
 * - 每位參與者只能評價對方一次
 * - 評分範圍：1-5 星
 */

// TODO: 實作評論編輯功能（限時內可修改）
// TODO: 加入評論檢舉機制（過濾不當評論）
// TODO: 實作評論回覆功能
// TODO: 加入評分權重（考慮交易金額、使用者信用等級）

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");

// ============================================
// 1. 新增評論 (Callable Function)
// ============================================
/**
 * Pseudocode:
 * 1. 驗證使用者已登入和參數完整性
 * 2. 驗證評分範圍（1-5）
 * 3. 在 Firestore Transaction 中執行：
 *    a. 檢查交易是否存在且已完成
 *    b. 驗證呼叫者是交易參與者（買家或賣家）
 *    c. 驗證評價對象正確（評價交易對方）
 *    d. 檢查是否已評價過（防止重複評分）
 *    e. 建立評論文件
 *    f. 更新交易的評價標記
 * 4. 回傳成功訊息
 *
 * @param {Object} data - { transactionId, targetUid, rating, comment }
 * @returns {Promise} { success: true }
 *
 * TODO: 加入評論內容過濾（敏感詞彙檢查）
 * TODO: 實作評論通知（通知被評價者）
 */
exports.addReview = functions.https.onCall(async (data, context) => {
  // Pseudocode: 驗證登入狀態
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "請先登入帳號");
  }

  const {transactionId, targetUid, rating, comment} = data;
  const uid = context.auth.uid;

  // Pseudocode: 驗證必要參數
  if (!transactionId || !targetUid || !rating) {
    throw new functions.https.HttpsError("invalid-argument", "缺少必要參數");
  }

  // Pseudocode: 驗證評分範圍（1-5 星）
  if (rating < 1 || rating > 5) {
    throw new functions.https.HttpsError("invalid-argument", "評分範圍錯誤 (1-5)");
  }

  const db = admin.firestore();
  const transRef = db.collection("transactions").doc(transactionId);

  try {
    await db.runTransaction(async (t) => {
      // Step 1: 讀取交易資料
      const transDoc = await t.get(transRef);
      if (!transDoc.exists) throw new functions.https.HttpsError("not-found", "交易不存在");

      const trans = transDoc.data();

      // Step 2: 檢查交易狀態（只有已完成的交易可評分）
      if (trans.status !== "Completed") {
        throw new functions.https.HttpsError("failed-precondition", "交易尚未完成，無法評價");
      }

      // Step 3: 驗證參與者身份
      // Pseudocode: 確認呼叫者是買家或賣家
      const isBuyer = trans.buyerId === uid;
      const isSeller = trans.sellerId === uid;

      if (!isBuyer && !isSeller) {
        throw new functions.https.HttpsError("permission-denied", "您非此交易當事人");
      }

      // Step 4: 驗證評價對象正確性
      // Pseudocode: 買家只能評價賣家，賣家只能評價買家
      const expectedTarget = isBuyer ? trans.sellerId : trans.buyerId;
      if (targetUid !== expectedTarget) {
        throw new functions.https.HttpsError("invalid-argument", "評價對象錯誤");
      }

      // Step 5: 檢查是否已評價過
      // Pseudocode: 使用交易文件中的 buyerRated/sellerRated 標記
      const fieldToCheck = isBuyer ? "buyerRated" : "sellerRated";
      if (trans[fieldToCheck]) {
        throw new functions.https.HttpsError("already-exists", "您已評價過此交易");
      }

      // Step 6: 建立評論文件
      const reviewRef = db.collection("reviews").doc();
      t.set(reviewRef, {
        transactionId,
        fromUid: uid, // 評論者
        toUid: targetUid, // 被評價者
        rating: Number(rating), // 評分（1-5）
        comment: comment || "", // 評論內容（選填）
        timestamp: new Date(),
      });

      // Step 7: 更新交易的評價標記
      // Pseudocode: 標記該參與者已完成評價
      t.update(transRef, {
        [fieldToCheck]: true,
      });
    });

    return {success: true};
  } catch (e) {
    console.error("Add Review Error:", e);
    throw e instanceof functions.https.HttpsError ? e : new functions.https.HttpsError("internal", e.message);
  }
});

// ============================================
// 2. 聚合計算使用者平均評分 (Firestore Trigger)
// ============================================
/**
 * Pseudocode:
 * 1. 當新評論建立時觸發
 * 2. 讀取被評價者的當前統計資料
 * 3. 更新評分計數、總和、平均值
 * 4. 將新的統計資料寫回 users 文件
 *
 * 計算邏輯:
 * - ratingCount: 總評價數量
 * - ratingSum: 評分總和
 * - averageRating: 平均評分（保留一位小數）
 *
 * TODO: 實作評分趨勢分析（最近 10 次評分的變化）
 * TODO: 加入評分分布統計（5星、4星...各有多少）
 * TODO: 實作異常評分檢測（惡意刷分防範）
 */
exports.onReviewCreated = functions.firestore
    .document("reviews/{reviewId}")
    .onCreate(async (snap, context) => {
      const review = snap.data();
      const {toUid, rating} = review;
      const db = admin.firestore();

      const userRef = db.collection("users").doc(toUid);

      // Pseudocode: 在 Transaction 中更新統計資料
      await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) return; // 理論上不應該發生

        const userData = userDoc.data();

        // Step 1: 計算新的統計數值
        const newCount = (userData.ratingCount || 0) + 1; // 評價總數 +1
        const newSum = (userData.ratingSum || 0) + rating; // 評分總和累加
        const newAvg = Number((newSum / newCount).toFixed(1)); // 計算新平均值（保留一位小數）

        // Step 2: 更新使用者文件
        t.update(userRef, {
          ratingCount: newCount,
          ratingSum: newSum,
          averageRating: newAvg,
        });
      });
    });
