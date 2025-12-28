/**
 * ============================================
 * 積分商店模組 (Store Handler)
 * ============================================
 * 
 * 主要功能:
 * 1. 購買虛擬商品（頭像、貼圖等）
 * 2. 每日簽到獎勵
 * 
 * 虛擬貨幣: 書香幣 (coins)
 * - 新註冊贈送 100 幣
 * - 完成交易獲得 5 幣
 * - 每日簽到獲得 5 幣
 */

// TODO: 實作商品目錄管理（動態新增商品）
// TODO: 加入限時特價功能
// TODO: 實作連續簽到獎勵（連續 7 天額外獎勵）
// TODO: 加入購買歷史記錄

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

// ============================================
// 1. 購買商品（頭像/貼圖）
// ============================================
/**
 * Pseudocode:
 * 1. 驗證使用者已登入和參數完整性
 * 2. 在 Firestore Transaction 中執行：
 *    a. 檢查使用者是否存在
 *    b. 檢查書香幣餘額是否足夠
 *    c. 檢查是否已擁有該商品（避免重複購買）
 *    d. 扣除書香幣
 *    e. 將商品加入使用者擁有清單
 * 3. 回傳購買結果
 * 
 * @param {Object} data - { itemId, price, type }
 * @param {string} type - 'avatar' 或 'sticker'
 * @returns {Promise} { success: true, message: "購買成功" }
 * 
 * TODO: 加入購買限制（防止異常交易）
 * TODO: 實作購買確認機制
 * TODO: 記錄購買歷史供退款處理
 */
exports.purchaseItem = functions.https.onCall(async (data, context) => {
  // Pseudocode: 驗證登入狀態
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "請先登入帳號");
  }

  const { itemId, price, type } = data; // type: 'avatar' or 'sticker'
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  try {
    await db.runTransaction(async (t) => {
      // Step 1: 讀取使用者資料
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "用戶不存在");
      }

      const userData = userDoc.data();
      const currentCoins = userData.coins || 0;
      const myAvatars = userData.myAvatars || ["default"];

      // Step 2: 檢查餘額
      // Pseudocode: 確認書香幣足夠購買
      if (currentCoins < price) {
        throw new functions.https.HttpsError("failed-precondition", "書香幣不足");
      }

      // Step 3: 檢查是否已擁有（僅針對頭像）
      // Pseudocode: 避免重複購買相同頭像
      if (type === "avatar" && myAvatars.includes(itemId)) {
        throw new functions.https.HttpsError("already-exists", "已擁有此頭像");
      }

      // Step 4: 扣款並新增物品
      const updates = {
        coins: currentCoins - price, // 扣除書香幣
      };

      if (type === "avatar") {
        // Pseudocode: 使用 arrayUnion 避免重複
        updates.myAvatars = FieldValue.arrayUnion(itemId);
      }
      // TODO: 支援其他商品類型（貼圖、背景等）

      t.update(userRef, updates);
    });

    return { success: true, message: "購買成功" };
  } catch (error) {
    console.error("Purchase error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "購買失敗", error.message);
  }
});

// ============================================
// 2. 每日簽到
// ============================================
/**
 * Pseudocode:
 * 1. 驗證使用者已登入
 * 2. 取得今天的日期（台灣時區 YYYY-MM-DD）
 * 3. 在 Firestore Transaction 中執行：
 *    a. 檢查使用者是否存在
 *    b. 檢查今天是否已簽到過
 *    c. 如果未簽到，增加 5 書香幣
 *    d. 更新最後簽到日期
 * 4. 回傳簽到結果
 * 
 * 獎勵規則:
 * - 每日簽到獲得 5 書香幣
 * - 每天只能簽到一次
 * - 使用台灣時區（UTC+8）計算日期
 * 
 * @returns {Promise} { success: true, coinsAdded: 5, newBalance: number } 或
 *                    { success: false, message: "今日已簽到", coins: number }
 * 
 * TODO: 實作連續簽到統計
 * TODO: 加入連續簽到額外獎勵（7天、30天）
 * TODO: 實作簽到提醒功能
 */
exports.dailyCheckIn = functions.https.onCall(async (data, context) => {
  // Pseudocode: 驗證登入狀態
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "請先登入帳號");
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  // ========================================
  // 輔助函式：取得台灣時區的今天日期
  // ========================================
  // Pseudocode:
  // - 取得 UTC 時間並加上 8 小時
  // - 格式化為 YYYY-MM-DD 字串
  const getTaiwanDate = () => {
    const d = new Date();
    d.setUTCHours(d.getUTCHours() + 8); // 轉換為 UTC+8
    return d.toISOString().split("T")[0]; // 取得日期部分
  };
  const todayStr = getTaiwanDate();

  try {
    const result = await db.runTransaction(async (t) => {
      // Step 1: 讀取使用者資料
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "用戶不存在");
      }

      const userData = userDoc.data();
      const lastCheckIn = userData.lastCheckInDate; // 存儲格式: YYYY-MM-DD

      // Step 2: 檢查今天是否已簽到
      // Pseudocode: 比較最後簽到日期與今天日期
      if (lastCheckIn === todayStr) {
        return { success: false, message: "今日已簽到", coins: userData.coins || 0 };
      }

      // Step 3: 執行簽到獎勵
      const currentCoins = userData.coins || 0;
      const newBalance = currentCoins + 5; // 簽到獎勵 5 幣

      t.update(userRef, {
        coins: newBalance,
        lastCheckInDate: todayStr,                    // 更新最後簽到日期
        lastCheckInTime: FieldValue.serverTimestamp(), // 記錄精確時間戳
      });

      return { success: true, coinsAdded: 5, newBalance: newBalance };
    });

    return result;
  } catch (error) {
    // Debug logging（開發環境用）
    try {
      require("fs").appendFileSync("d:/SchoolBookExchange/functions/store_debug.txt",
        new Date().toISOString() + ": CheckIn Error: " + error.message + "\nStack: " + error.stack + "\n");
    } catch (e) { }

    console.error("Check-in error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "簽到失敗", error.message);
  }
});
