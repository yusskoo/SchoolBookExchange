// 測試 LINE Bot 功能的腳本
require("dotenv").config();
const admin = require("firebase-admin");

// 初始化 Firebase Admin
const serviceAccount = require("./config/serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const lineService = require("./services/line-service");

async function testLineBot() {
  console.log("🧪 開始測試 LINE Bot 功能...\n");

  // 測試 1: 檢查環境變數
  console.log("1️⃣ 檢查 LINE Channel Access Token...");
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.log("   ✅ Token 已設定");
  } else {
    console.log("   ❌ Token 未設定！請在 .env 檔案中設定 LINE_CHANNEL_ACCESS_TOKEN");
    return;
  }

  // 測試 2: 查詢已綁定的用戶
  console.log("\n2️⃣ 查詢已綁定 LINE 的用戶...");
  try {
    const usersSnap = await db.collection("users")
        .where("isLineNotifyEnabled", "==", true)
        .limit(5)
        .get();

    if (usersSnap.empty) {
      console.log("   ℹ️  目前沒有用戶綁定 LINE");
    } else {
      console.log(`   ✅ 找到 ${usersSnap.size} 位綁定用戶：`);
      usersSnap.forEach((doc) => {
        const data = doc.data();
        console.log(`      - ${data.nickname || data.email} (UID: ${doc.id})`);
      });
    }
  } catch (e) {
    console.log("   ❌ 查詢失敗:", e.message);
  }

  // 測試 3: 測試發送訊息（如果有綁定用戶）
  console.log("\n3️⃣ 測試發送 LINE 訊息...");
  try {
    const testUserSnap = await db.collection("users")
        .where("isLineNotifyEnabled", "==", true)
        .limit(1)
        .get();

    if (!testUserSnap.empty) {
      const userData = testUserSnap.docs[0].data();
      const lineUserId = userData.lineUserId;

      console.log(`   📤 嘗試發送測試訊息給 ${userData.nickname || "用戶"}...`);

      await lineService.pushMessage(lineUserId,
          "🧪 這是來自校園二手書循環平台的測試訊息！\n\n" +
                "如果您收到此訊息，表示 LINE Bot 功能運作正常。✅",
      );

      console.log("   ✅ 訊息發送成功！請檢查 LINE 是否收到。");
    } else {
      console.log("   ℹ️  沒有綁定用戶可供測試，跳過此步驟");
    }
  } catch (e) {
    console.log("   ❌ 發送失敗:", e.message);
  }

  // 測試 4: 測試 Flex Message
  console.log("\n4️⃣ 測試 Flex Message 格式...");
  try {
    const flexMessage = {
      type: "flex",
      altText: "測試交易明細",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [{
            type: "text",
            text: "📋 測試明細",
            color: "#ffffff",
            weight: "bold",
          }],
          backgroundColor: "#756256",
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [{
            type: "text",
            text: "這是一個測試 Flex Message",
            wrap: true,
          }],
        },
      },
    };

    const testUserSnap = await db.collection("users")
        .where("isLineNotifyEnabled", "==", true)
        .limit(1)
        .get();

    if (!testUserSnap.empty) {
      const userData = testUserSnap.docs[0].data();
      await lineService.pushMessage(userData.lineUserId, [flexMessage]);
      console.log("   ✅ Flex Message 發送成功！");
    } else {
      console.log("   ℹ️  沒有綁定用戶，無法測試 Flex Message");
    }
  } catch (e) {
    console.log("   ❌ Flex Message 發送失敗:", e.message);
  }

  console.log("\n✨ 測試完成！\n");
}

// 執行測試
testLineBot().then(() => {
  console.log("測試腳本結束");
  process.exit(0);
}).catch((err) => {
  console.error("測試過程發生錯誤:", err);
  process.exit(1);
});
