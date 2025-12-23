const admin = require('firebase-admin');

// 若模擬器在運行，這會連接到模擬器
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: "schoolbook-290b6" });
}

async function testAuthTrigger() {
    const email = `test.student.${Date.now()}@shsh.tw`;
    const password = 'password123';

    console.log(`1. 正在創建測試用戶: ${email}`);
    try {
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password
        });
        console.log(`   用戶已創建 UID: ${userRecord.uid}`);

        console.log("2. 等待 3 秒鐘讓 Cloud Function 觸發...");
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log("3. 檢查 Firestore 文檔...");
        const doc = await admin.firestore().collection('users').doc(userRecord.uid).get();

        if (doc.exists) {
            console.log("✅ 成功！User Document 存在。");
            console.log("   資料內容:", doc.data());
        } else {
            console.error("❌ 失敗：User Document 不存在。Auth Trigger 可能未執行或失敗。");
        }

    } catch (e) {
        console.error("測試過程發生錯誤:", e);
    }
}

testAuthTrigger();
