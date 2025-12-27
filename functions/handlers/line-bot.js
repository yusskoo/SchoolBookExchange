const functions = require("firebase-functions");
const admin = require("firebase-admin");
const lineService = require("../services/line-service");

// 1. Generate Binding Code (Callable)
exports.generateBindingCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "請先登入");

  const uid = context.auth.uid;
  const db = admin.firestore();

  // Generate 6 digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  await db.collection("line_codes").doc(code).set({
    uid: uid,
    expiresAt: expiresAt,
    timestamp: new Date(),
  });

  return { success: true, code: code, expiresAt: expiresAt };
});

const cors = require("cors")({ origin: true });

// 2. Enhanced LINE Webhook (自動回覆機器人 + Postback 處理)
exports.lineWebhook = functions.https.onRequest(async (req, res) => {
  // Skip ngrok browser warning for free tier
  res.set("ngrok-skip-browser-warning", "true");

  return cors(req, res, async () => {
    const events = req.body.events || [];
    const db = admin.firestore();

    console.log("收到 LINE 事件:", JSON.stringify(req.body));

    // If no events (e.g. verification check), return 200 OK immediately
    if (events.length === 0) {
      return res.status(200).send("OK");
    }

    for (const event of events) {
      const lineUserId = event.source.userId;

      // A. 處理文字訊息（綁定碼 + 自動回覆）
      if (event.type === "message" && event.message.type === "text") {
        const text = event.message.text.trim();
        const replyToken = event.replyToken;

        // 先檢查是否有待處理的輸入請求（如失敗原因）
        const pendingInputDoc = await db.collection("pending_inputs").doc(lineUserId).get();
        if (pendingInputDoc.exists) {
          const inputData = pendingInputDoc.data();

          if (inputData.type === "fail_reason") {
            // 處理面交失敗原因
            const transRef = db.collection("transactions").doc(inputData.transactionId);
            await transRef.update({
              status: "Failed",
              failedBy: inputData.userId,
              failedAt: new Date(),
              failReason: text,
            });

            await lineService.replyMessage(replyToken,
              "❌ 已記錄面交失敗及原因。\n\n" +
              "系統已收到您的回報，管理員將會跟進處理。",
            );

            // 刪除待處理請求
            await db.collection("pending_inputs").doc(lineUserId).delete();
            continue;
          }
        }

        // 檢查是否為 6 位數綁定碼
        if (/^\d{6}$/.test(text)) {
          try {
            const codeRef = db.collection("line_codes").doc(text);
            const doc = await codeRef.get();

            if (!doc.exists) {
              await lineService.replyMessage(replyToken, "❌ 找不到此綁定碼或輸入錯誤。請重新確認。");
              continue;
            }

            const data = doc.data();
            if (data.expiresAt.toDate() < new Date()) {
              await lineService.replyMessage(replyToken, "⏰ 此綁定碼已過期，請重新產生。");
              continue;
            }

            // Bind success
            const uid = data.uid;
            await db.collection("users").doc(uid).update({
              lineUserId: lineUserId,
              isLineNotifyEnabled: true,
              lineBoundAt: new Date(),
            });

            await codeRef.delete();

            await lineService.replyMessage(replyToken, "✅ 恭喜！帳號綁定成功。\n您現在可以收到交易通知了！");
          } catch (e) {
            console.error("Binding Error:", e);
            await lineService.replyMessage(replyToken, "⚠️ 系統錯誤，請稍後再試。");
          }
        }
        // 自動回覆機器人
        else {
          await handleAutoReply(replyToken, text, lineUserId, db);
        }
      }

      // B. 處理 Postback（面交成功/失敗回報）
      else if (event.type === "postback") {
        await handlePostback(event, db);
      }
    }

    res.status(200).send("OK");
  });
});

// 自動回覆邏輯
async function handleAutoReply(replyToken, text, lineUserId, db) {
  const textLower = text.toLowerCase();

  // 查詢使用者資料
  const userQuery = await db.collection("users").where("lineUserId", "==", lineUserId).limit(1).get();

  if (userQuery.empty) {
    // 未綁定帳號
    await lineService.replyMessage(replyToken,
      "👋 歡迎使用校園二手書循環平台！\n\n" +
      "請先在網頁平台登入後，於個人專區取得綁定碼，然後在此輸入 6 位數綁定碼以連結您的帳戶。",
    );
    return;
  }

  const userId = userQuery.docs[0].id;
  const userData = userQuery.docs[0].data();

  // 關鍵字回覆
  if (textLower.includes("查詢") || textLower.includes("訂單") || textLower.includes("交易")) {
    await replyTransactionList(replyToken, userId, db);
  } else if (textLower.includes("幫助") || textLower.includes("功能") || textLower.includes("help")) {
    await lineService.replyMessage(replyToken,
      "📚 功能說明：\n\n" +
      "• 輸入「查詢訂單」- 查看進行中的交易\n" +
      "• 輸入「幫助」- 顯示此說明\n" +
      "• 當有新訂單或交易更新時，我會主動通知您\n" +
      "• 收到明細通知後，可直接點擊按鈕回報面交結果",
    );
  } else {
    // 預設回覆 + 選單
    await lineService.replyMessage(replyToken, [
      {
        type: "text",
        text: `您好 ${userData.nickname || "同學"}！👋\n\n` +
          "請選擇以下功能：",
      },
      {
        type: "template",
        altText: "功能選單",
        template: {
          type: "buttons",
          text: "請選擇功能",
          actions: [
            {
              type: "message",
              label: "查詢我的訂單",
              text: "查詢訂單",
            },
            {
              type: "message",
              label: "功能說明",
              text: "幫助",
            },
            {
              type: "uri",
              label: "前往平台",
              uri: "https://your-platform-url.com",
            },
          ],
        },
      },
    ]);
  }
}

// 回覆交易列表
async function replyTransactionList(replyToken, userId, db) {
  // 查詢進行中的交易
  const buyerTrans = await db.collection("transactions")
    .where("buyerId", "==", userId)
    .where("status", "==", "Pending")
    .limit(5)
    .get();

  const sellerTrans = await db.collection("transactions")
    .where("sellerId", "==", userId)
    .where("status", "==", "Pending")
    .limit(5)
    .get();

  const allTrans = [...buyerTrans.docs, ...sellerTrans.docs];

  if (allTrans.length === 0) {
    await lineService.replyMessage(replyToken, "📭 目前沒有進行中的交易訂單。");
    return;
  }

  let msg = `📦 您有 ${allTrans.length} 筆進行中的交易：\n\n`;

  allTrans.forEach((doc, idx) => {
    const data = doc.data();
    const role = data.buyerId === userId ? "買家" : "賣家";
    const time = data.meetingTime ?
      new Date(data.meetingTime.toDate()).toLocaleString("zh-TW") :
      "未設定";

    msg += `${idx + 1}. 【${role}】${data.bookTitle}\n`;
    msg += `   價格：NT$ ${data.agreedPrice}\n`;
    msg += `   面交時間：${time}\n\n`;
  });

  await lineService.replyMessage(replyToken, msg);
}

// 處理 Postback（面交成功/失敗）
async function handlePostback(event, db) {
  const data = event.postback.data;
  const params = new URLSearchParams(data);

  const action = params.get("action");
  const transactionId = params.get("transactionId");
  const userId = params.get("userId");

  if (!transactionId || !userId) {
    console.error("Invalid postback data:", data);
    return;
  }

  const transRef = db.collection("transactions").doc(transactionId);

  try {
    if (action === "confirm_success") {
      // 面交成功
      await db.runTransaction(async (t) => {
        const doc = await t.get(transRef);
        if (!doc.exists) return;

        const trans = doc.data();

        // 標記此用戶已確認
        const confirmKey = trans.buyerId === userId ? "buyerConfirmed" : "sellerConfirmed";
        const updates = {
          [confirmKey]: true,
          [`${confirmKey}At`]: new Date(),
        };

        // 檢查雙方是否都已確認
        const otherConfirmKey = trans.buyerId === userId ? "sellerConfirmed" : "buyerConfirmed";
        if (trans[otherConfirmKey] === true) {
          // 雙方都確認了，交易完成
          updates.status = "Completed";
          updates.completedAt = new Date();
        }

        t.update(transRef, updates);
      });

      // 回覆用戶
      const lineUserId = event.source.userId;
      await lineService.pushMessage(lineUserId,
        "✅ 已記錄面交成功！\n\n" +
        "感謝您的回報，等待對方確認後交易將自動完成。",
      );
    } else if (action === "report_fail") {
      // 面交失敗
      await transRef.update({
        status: "Failed",
        failedBy: userId,
        failedAt: new Date(),
        failReason: params.get("reason") || "未說明",
      });

      const lineUserId = event.source.userId;
      await lineService.pushMessage(lineUserId,
        "❌ 已記錄面交失敗。\n\n" +
        "系統已收到您的回報，管理員將會跟進處理。",
      );
    } else if (action === "input_fail_reason") {
      // 請用戶輸入失敗原因
      const lineUserId = event.source.userId;
      await lineService.pushMessage(lineUserId,
        "請簡述面交失敗的原因：\n" +
        "（例如：對方未出現、書籍與描述不符等）",
      );

      // 儲存等待輸入的狀態
      await db.collection("pending_inputs").doc(lineUserId).set({
        type: "fail_reason",
        transactionId: transactionId,
        userId: userId,
        timestamp: new Date(),
      });
    }
  } catch (e) {
    console.error("Postback handling error:", e);
  }
}

// 3. 發送交易明細通知（開立明細後觸發）
// 這個 function 會由 transaction.js 中的 Firestore trigger 呼叫
exports.sendInvoiceNotification = async (transaction, db) => {
  const { id: transId, buyerId, sellerId, bookTitle, agreedPrice, meetingTime, meetingLocation } = transaction;

  // 取得買賣雙方的 LINE User ID
  const buyerDoc = await db.collection("users").doc(buyerId).get();
  const sellerDoc = await db.collection("users").doc(sellerId).get();

  const buyerData = buyerDoc.data() || {};
  const sellerData = sellerDoc.data() || {};

  const recipients = [];

  if (buyerData.isLineNotifyEnabled && buyerData.lineUserId) {
    recipients.push({ lineUserId: buyerData.lineUserId, uid: buyerId, role: "買家" });
  }
  if (sellerData.isLineNotifyEnabled && sellerData.lineUserId) {
    recipients.push({ lineUserId: sellerData.lineUserId, uid: sellerId, role: "賣家" });
  }

  if (recipients.length === 0) {
    console.log("No LINE recipients for transaction", transId);
    return;
  }

  // 使用 Flex Message 製作精美的明細通知
  const flexMessage = createInvoiceFlexMessage(
    transaction,
    buyerData.nickname || "買家",
    sellerData.nickname || "賣家",
  );

  // 發送給雙方
  for (const recipient of recipients) {
    try {
      // 主要通知訊息
      await lineService.pushMessage(recipient.lineUserId, [
        {
          type: "text",
          text: `📋 【交易明細通知】\n您作為${recipient.role}的交易已確認！`,
        },
        flexMessage,
        // 面交成功/失敗確認按鈕 (移至排程通知發送)
      ]);

      console.log(`Invoice notification sent to ${recipient.role} (${recipient.uid})`);
    } catch (e) {
      console.error(`Failed to send invoice to ${recipient.role}:`, e);
    }
  }
};

// 建立 Flex Message 格式的交易明細
function createInvoiceFlexMessage(transaction, buyerNickname, sellerNickname) {
  const { bookTitle, agreedPrice, meetingTime, meetingLocation } = transaction;

  const timeStr = meetingTime ?
    new Date(meetingTime.toDate ? meetingTime.toDate() : meetingTime).toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }) :
    "未設定";

  return {
    type: "flex",
    altText: "交易明細",
    contents: {
      type: "bubble",
      styles: {
        header: {
          backgroundColor: "#756256",
        },
      },
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📋 交易明細",
            color: "#ffffff",
            weight: "bold",
            size: "lg",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: bookTitle,
            weight: "bold",
            size: "xl",
            margin: "md",
            wrap: true,
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "買家",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: buyerNickname,
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 3,
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "賣家",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: sellerNickname,
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 3,
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "價格",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: `NT$ ${agreedPrice || price || 0}`,
                    wrap: true,
                    color: "#A58976",
                    size: "md",
                    weight: "bold",
                    flex: 3,
                  },
                ],
              },
              {
                type: "separator",
                margin: "md",
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                margin: "md",
                contents: [
                  {
                    type: "text",
                    text: "時間",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: timeStr,
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 3,
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "地點",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: meetingLocation || "未設定",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 3,
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: "⚠️ 請準時赴約，完成後記得回報結果",
            color: "#999999",
            size: "xs",
            align: "center",
            wrap: true,
          },
        ],
      },
    },
  };
}
