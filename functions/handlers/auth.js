/**
 * ============================================
 * 使用者認證模組 (Auth Handler)
 * ============================================
 *
 * 主要功能:
 * 1. 驗證學校信箱網域（從 Firestore 讀取白名單）
 * 2. 角色識別（學生/教師）✨
 * 3. 實名認證（學生需學號、教師僅需姓名）✨
 * 4. 學號與 email 一致性驗證 ✨
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// ============================================
// 輔助函數：角色識別和學號處理
// ============================================

function getUserRole(email) {
  if (email.endsWith("@shsh.ylc.edu.tw")) {
    return "teacher";
  } else if (email.includes("@shsh.tw")) {
    const prefix = email.split("@")[0];
    if (prefix.startsWith("stu")) {
      return "high_school_student";
    } else if (prefix.startsWith("u")) {
      return "junior_high_student";
    }
  }
  return "invalid";
}

function extractStudentId(email) {
  const prefix = email.split("@")[0];
  if (prefix.startsWith("stu")) {
    return prefix.substring(3);
  } else if (prefix.startsWith("u")) {
    return prefix.substring(1);
  }
  return null;
}

// ========================================
// 快取機制：避免每次都查詢 Firestore
// ========================================
let allowedDomainsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getAllowedDomains() {
  const now = Date.now();

  if (allowedDomainsCache && (now - cacheTimestamp) < CACHE_TTL) {
    console.log("使用快取的學校網域清單");
    return allowedDomainsCache;
  }

  // Hardcoded Fallback (確保即使 Firestore 初始化失敗也能運作)
  const defaultDomains = ["shsh.tw", "shsh.ylc.edu.tw"];

  try {
    const db = admin.firestore();
    const schoolsSnapshot = await db.collection("schools")
        .where("enabled", "==", true)
        .get();

    if (!schoolsSnapshot.empty) {
      const domains = schoolsSnapshot.docs.map((doc) => doc.data().domain);
      // 確保預設網域也在其中 (防呆)
      if (!domains.includes("shsh.tw")) domains.push("shsh.tw");
      if (!domains.includes("shsh.ylc.edu.tw")) domains.push("shsh.ylc.edu.tw");

      allowedDomainsCache = domains;
      cacheTimestamp = now;
      console.log(`從 Firestore 載入 ${domains.length} 個學校網域`);
      return domains;
    }
  } catch (e) {
    console.error("Firestore 讀取失敗，使用預設白名單:", e);
  }

  return defaultDomains;
}

// ============================================
// 1. 驗證學校信箱並建立基礎使用者資料
// ============================================
exports.checkSchoolEmail = functions.auth.user().onCreate(async (user) => {
  const email = user.email;
  if (!email) return null;

  const domain = email.substring(email.lastIndexOf("@") + 1);

  // 識別使用者角色
  const role = getUserRole(email);

  if (role === "invalid") {
    await admin.auth().deleteUser(user.uid);
    console.log(`❌ 刪除無效網域用戶: ${email}`);
    return null;
  }

  const allowedDomains = await getAllowedDomains();

  if (!allowedDomains.includes(domain)) {
    await admin.auth().deleteUser(user.uid);
    console.log(`已刪除非法網域用戶: ${email}`);
    return null;
  }

  try {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(user.uid);

    await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);

      // [Fix Race Condition]: 如果 completeProfile 已經先執行完成，則不覆蓋資料
      if (doc.exists && doc.data().isProfileCompleted) {
        console.log(`✅ 用戶資料已由前端補全，跳過初始化: ${user.uid}`);
        return;
      }

      const initialData = {
        email: email,
        role: role,
        // isProfileCompleted: false, // 不強制設為 false，以免覆蓋
        creditScore: 100,
        totalTransactions: 0,
        completedTransactions: 0,
        canceledTransactions: 0,
        coins: 100,
        myAvatars: ["default"],
        currentAvatarId: "default",
        joinDate: new Date(),
      };

      // 只有在沒有暱稱時才設定預設暱稱
      if (!doc.exists || !doc.data().nickname) {
        initialData.nickname = role === "teacher" ? "新教師" : email.split("@")[0];
      }

      // 使用 merge: true 確保安全
      t.set(userRef, initialData, {merge: true});
    });

    console.log(`✅ 成功初始化用戶文件: ${user.uid} (${email}) [${role}]`);
  } catch (error) {
    console.error("❌ 建立用戶文件失敗:", error.message);
  }
  return null;
});

// 2. 實名認證與資料補全 (Callable Function)
exports.completeProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "請先登入帳號");
  }

  const {realName, studentId, nickname, isLineNotifyEnabled} = data;
  const uid = context.auth.uid;
  const email = context.auth.token.email;

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const privateRef = userRef.collection("private_data").doc("identity");

  // [Fix Race Condition] 直接從 email 判斷角色，不依賴 Firestore
  const role = getUserRole(email);

  try {
    // 教師邏輯
    if (role === "teacher") {
      if (!realName) {
        throw new functions.https.HttpsError("invalid-argument", "請填寫真實姓名");
      }

      const teacherNickname = realName.charAt(0) + "老師";

      await db.runTransaction(async (t) => {
        t.set(privateRef, {
          realName,
          updatedAt: new Date(),
        });

        // 使用 merge 選項確保不覆蓋現有資料
        t.set(userRef, {
          nickname: teacherNickname,
          role: "teacher",
          isProfileCompleted: true,
          // 確保 email 存在
          email: email,
        }, {merge: true});
      });

      return {success: true, role: "teacher"};
    }

    // 學生邏輯
    if (!realName || !studentId || !nickname) {
      throw new functions.https.HttpsError("invalid-argument", "請填寫完整資訊");
    }

    // 驗證學號與信箱一致性
    const extractedId = extractStudentId(email);
    if (extractedId !== studentId) {
      throw new functions.https.HttpsError(
          "invalid-argument",
          `學號與信箱不符！\n\n您的信箱學號為：${extractedId}\n請確認填寫的學號是否正確。`,
      );
    }

    // 檢查學號重複
    const existingStudentId = await db.collectionGroup("private_data")
        .where("studentId", "==", studentId)
        .limit(1)
        .get();

    if (!existingStudentId.empty) {
      const existingUid = existingStudentId.docs[0].ref.parent.parent.id;

      if (existingUid !== uid) {
        throw new functions.https.HttpsError(
            "already-exists",
            "此學號已被註冊使用。\n\n如果這是您的學號但無法登入，請聯繫管理員協助處理。",
        );
      }
    }

    await db.runTransaction(async (t) => {
      t.set(privateRef, {
        realName,
        studentId,
        updatedAt: new Date(),
      });

      t.set(userRef, {
        nickname,
        role: role,
        isProfileCompleted: true,
        isLineNotifyEnabled: !!isLineNotifyEnabled,
      }, {merge: true});
    });

    return {success: true, role: role, message: "實名認證完成"};
  } catch (error) {
    console.error("Profile update error:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "資料更新失敗", error.message);
  }
});
