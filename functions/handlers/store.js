const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");

// 購買商品 (頭像/貼圖)
exports.purchaseItem = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "請先登入帳號");
  }

  const {itemId, price, type} = data; // type: 'avatar' or 'sticker'
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  try {
    await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "用戶不存在");
      }

      const userData = userDoc.data();
      const currentCoins = userData.coins || 0;
      const myAvatars = userData.myAvatars || ["default"];

      // 檢查餘額
      if (currentCoins < price) {
        throw new functions.https.HttpsError("failed-precondition", "書香幣不足");
      }

      // 檢查是否已擁有 (僅針對頭像)
      if (type === "avatar" && myAvatars.includes(itemId)) {
        throw new functions.https.HttpsError("already-exists", "已擁有此頭像");
      }

      // 扣款並新增物品
      const updates = {
        coins: currentCoins - price,
      };

      if (type === "avatar") {
        updates.myAvatars = FieldValue.arrayUnion(itemId);
      }

      t.update(userRef, updates);
    });

    return {success: true, message: "購買成功"};
  } catch (error) {
    console.error("Purchase error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "購買失敗", error.message);
  }
});

// 每日簽到
exports.dailyCheckIn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "請先登入帳號");
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  // Get today's date in Taiwan Time (YYYY-MM-DD)
  const getTaiwanDate = () => {
    const d = new Date();
    d.setUTCHours(d.getUTCHours() + 8);
    return d.toISOString().split("T")[0];
  };
  const todayStr = getTaiwanDate();

  try {
    const result = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) {
        // 如果用戶文件不存在（極端情況），可能需要創建或拋出錯誤
        // 這裡假設用戶存在
        throw new functions.https.HttpsError("not-found", "用戶不存在");
      }

      const userData = userDoc.data();
      const lastCheckIn = userData.lastCheckInDate; // stored as YYYY-MM-DD string

      if (lastCheckIn === todayStr) {
        return {success: false, message: "今日已簽到", coins: userData.coins || 0};
      }

      const currentCoins = userData.coins || 0;
      const newBalance = currentCoins + 5;

      t.update(userRef, {
        coins: newBalance,
        lastCheckInDate: todayStr,
        lastCheckInTime: FieldValue.serverTimestamp(),
      });

      return {success: true, coinsAdded: 5, newBalance: newBalance};
    });

    return result;
  } catch (error) {
    // Debug logging
    try {
      require("fs").appendFileSync("d:/SchoolBookExchange/functions/store_debug.txt",
          new Date().toISOString() + ": CheckIn Error: " + error.message + "\nStack: " + error.stack + "\n");
    } catch (e) { }

    console.error("Check-in error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "簽到失敗", error.message);
  }
});
