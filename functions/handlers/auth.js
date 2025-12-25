const functions = require('firebase-functions');
const admin = require('firebase-admin');

// 1. 驗證並創建基礎使用者資料
exports.checkSchoolEmail = functions.auth.user().onCreate(async (user) => {
    const email = user.email;
    const allowedDomains = ['shsh.tw', 'school.edu.tw'];
    if (!email) return null;

    const domain = email.substring(email.lastIndexOf('@') + 1);

    // 如果不是校內網域，直接刪除
    if (!allowedDomains.includes(domain)) {
        await admin.auth().deleteUser(user.uid);
        console.log(`已刪除非法網域用戶: ${email}`);
        return null;
    }

    try {
        const db = admin.firestore();
        // 初始化公開資料
        await db.collection('users').doc(user.uid).set({
            email: email,
            nickname: email.split('@')[0], // 預設使用信箱前綴作為暱稱
            isProfileCompleted: false,     // 標記是否已完成實名認證
            creditScore: 100,
            totalTransactions: 0,
            completedTransactions: 0,
            canceledTransactions: 0,
            coins: 100, // 新註冊獎勵
            myAvatars: ['default'], // 預設頭像
            joinDate: new Date()
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
        throw new functions.https.HttpsError('unauthenticated', '請先登入帳號');
    }

    const { realName, studentId, nickname, isLineNotifyEnabled } = data;
    const uid = context.auth.uid;

    // 基本驗證
    if (!realName || !studentId || !nickname) {
        throw new functions.https.HttpsError('invalid-argument', '請填寫完整資訊');
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const privateRef = userRef.collection('private_data').doc('identity');

    try {
        await db.runTransaction(async (t) => {
            // 寫入加密/私人資料 (僅後端與本人可見)
            t.set(privateRef, {
                realName,
                studentId,
                updatedAt: new Date()
            });

            // 更新公開資料
            t.update(userRef, {
                nickname,
                isProfileCompleted: true,
                isLineNotifyEnabled: !!isLineNotifyEnabled
            });
        });
        return { success: true, message: "實名認證完成" };
    } catch (error) {
        console.error("Profile update error:", error);
        throw new functions.https.HttpsError('internal', '資料更新失敗', error.message);
    }
});
