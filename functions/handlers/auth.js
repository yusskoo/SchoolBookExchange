/**
 * ============================================
 * 使用者認證模組 (Auth Handler)
 * ============================================
 * 
 * 主要功能:
 * 1. 驗證學校信箱網域（從 Firestore 讀取白名單）✨
 * 2. 實名認證（真實姓名、學號）
 * 3. 個人資料補全和更新
 */

// TODO: 實作信箱驗證碼機制
// TODO: 加入學號格式驗證

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// ========================================
// 快取機制：避免每次都查詢 Firestore ✨
// ========================================
let allowedDomainsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘快取

/**
 * 從 Firestore 取得允許的學校網域清單（帶快取）✨
 */
async function getAllowedDomains() {
  const now = Date.now();

  // 檢查快取是否有效
  if (allowedDomainsCache && (now - cacheTimestamp) < CACHE_TTL) {
    console.log("使用快取的學校網域清單");
    return allowedDomainsCache;
  }

  // 從 Firestore 讀取
  const db = admin.firestore();
  const schoolsSnapshot = await db.collection("schools")
    .where("enabled", "==", true)
    .get();

  const domains = schoolsSnapshot.docs.map((doc) => doc.data().domain);

  // 更新快取
  allowedDomainsCache = domains;
  cacheTimestamp = now;

  console.log(`從 Firestore 載入 ${domains.length} 個學校網域`);
  return domains;
}

// ============================================
// 1. 驗證學校信箱並建立基礎使用者資料
// ============================================
exports.checkSchoolEmail = functions.auth.user().onCreate(async (user) => {
  const email = user.email;
  if (!email) return null;

  const domain = email.substring(email.lastIndexOf("@") + 1);

  // 從 Firestore 讀取允許的網域（帶快取）✨
  const allowedDomains = await getAllowedDomains();

  if (!allowedDomains.includes(domain)) {
    await admin.auth().deleteUser(user.uid);
    console.log(`已刪除非法網域用戶: ${email}`);
    return null;
  }

  try {
    const db = admin.firestore();

    // Pseudocode: 建立使用者初始資料
    // - 使用 public collection 儲存公開資訊
    // - 私密資訊（真實姓名、學號）會在實名認證時儲存到 private_data subcollection
    await db.collection("users").doc(user.uid).set({
      email: email,
      nickname: email.split("@")[0],    // 預設暱稱：email 前綴
      isProfileCompleted: false,        // 標記是否已完成實名認證
      creditScore: 100,                 // 初始信用積分
      totalTransactions: 0,
      completedTransactions: 0,
      canceledTransactions: 0,
      coins: 100,                       // 新註冊獎勵：100 金幣
      myAvatars: ["default"],           // 預設頭像
      joinDate: new Date(),
    });
    console.log(`✅ 成功建立用戶文件: ${user.uid} (${email})`);
  } catch (error) {
    console.error("❌ 建立用戶文件失敗:", error.message);
  }
  return null;
});

// 2. 實名認證與資料補全 (Callable Function)
exports.completeProfile = functions.https.onCall(async (data, context) => {
  // 檢查登入狀態
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "請先登入帳號");
  }

  const { realName, studentId, nickname, isLineNotifyEnabled } = data;
  const uid = context.auth.uid;

  // 基本驗證
  if (!realName || !studentId || !nickname) {
    throw new functions.https.HttpsError("invalid-argument", "請填寫完整資訊");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const privateRef = userRef.collection("private_data").doc("identity");

  try {
    // ========================================
    // 檢查學號是否已被使用（新增功能）✨
    // ========================================
    // Pseudocode:
    // 1. 使用 collection group query 查詢所有使用者的 private_data
    // 2. 篩選出相同學號但不同 UID 的記錄
    // 3. 如果找到重複，拋出錯誤
    const existingStudentId = await db.collectionGroup("private_data")
      .where("studentId", "==", studentId)
      .limit(1)
      .get();

    if (!existingStudentId.empty) {
      const existingDoc = existingStudentId.docs[0];
      const existingUid = existingDoc.ref.parent.parent.id;

      if (existingUid !== uid) {
        throw new functions.https.HttpsError(
          "already-exists",
          "此學號已被註冊使用。\n\n如果這是您的學號但無法登入，請聯繫管理員協助處理。",
        );
      }
    }

    // 執行資料更新 transaction
    await db.runTransaction(async (t) => {
      // 寫入加密/私人資料 (僅後端與本人可見)
      t.set(privateRef, {
        realName,
        studentId,
        updatedAt: new Date(),
      });

      // 更新公開資料
      t.update(userRef, {
        nickname,
        isProfileCompleted: true,
        isLineNotifyEnabled: !!isLineNotifyEnabled,
      });
    });
    return { success: true, message: "實名認證完成" };
  } catch (error) {
    console.error("Profile update error:", error);
    throw new functions.https.HttpsError("internal", "資料更新失敗", error.message);
  }
});
