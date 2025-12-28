/**
 * ============================================
 * LINE Bot 整合模組 (LINE Bot Handler)
 * ============================================
 * 
 * 主要功能:
 * 1. LINE 帳號綁定（產生綁定碼、處理綁定）
 * 2. LINE Webhook 處理（文字訊息、Postback 事件）
 * 3. 自動回覆機器人（查詢交易、功能說明）
 * 4. 交易明細通知（Flex Message）
 * 5. 面交結果回報（成功/失敗）
 * 
 * 事件類型:
 * - message.text: 文字訊息（綁定碼、自動回覆）
 * - postback: 互動按鈕回應（確認成功/失敗）
 */

// TODO: 實作 LINE Login 整合（直接登入）
// TODO: 加入更多自動回覆功能（如查詢帳戶資訊）
// TODO: 實作 Rich Menu 功能
// TODO: 加入通知偏好設定（使用者可選擇接收哪些通知）

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const lineService = require("../services/line-service");

// ============================================
// 1. 產生 LINE 綁定碼 (Callable Function)
// ============================================
/**
 * Pseudocode:
 * 1. 驗證使用者已登入
 * 2. 產生 6 位數隨機綁定碼（100000-999999）
 * 3. 設定 10 分鐘有效期限
 * 4. 儲存至 line_codes collection
 * 5. 回傳綁定碼和過期時間給前端
 * 
 * @returns {Promise} { success: true, code: "123456", expiresAt: Timestamp }
 * 
 * TODO: 實作綁定碼重複檢查（確保唯一性）
 * TODO: 加入綁定碼使用次數限制
 * TODO: 記錄綁定碼產生歷史
 */
exports.generateBindingCode = functions.https.onCall(async (data, context) => {
  // Pseudocode: 驗證登入狀態
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "請先登入");

  const uid = context.auth.uid;
  const db = admin.firestore();

  // Pseudocode: 產生 6 位數隨機碼
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Pseudocode: 設定 10 分鐘有效期
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Pseudocode: 儲存綁定碼至 Firestore
  await db.collection("line_codes").doc(code).set({
    uid: uid,
    expiresAt: expiresAt,
    timestamp: new Date(),
  });

  return { success: true, code: code, expiresAt: expiresAt };
});

const cors = require("cors")({ origin: true });

// ============================================
// 2. LINE Webhook 主處理程式
// ============================================
/**
 * Pseudocode:
 * 1. 接收 LINE Webhook 事件
 * 2. 處理不同類型的事件：
 *    a. message.text: 文字訊息（綁定碼、自動回覆）
 *    b. postback: 互動按鈕回應（面交結果）
 * 3. 回傳 200 OK 給 LINE
 * 
 * 特殊處理:
 * - ngrok 瀏覽器警告跳過（免費版）
 * - 空事件列表處理（驗證請求）
 * - 待處理輸入請求（如失敗原因）
 * 
 * TODO: 加入更多事件類型支援（follow, unfollow）
 * TODO: 實作 Webhook 簽章驗證（安全性）
 * TODO: 加入錯誤重試機制
 * TODO: 實作訊息佇列處理（高流量時）
 */
exports.lineWebhook = functions.https.onRequest(async (req, res) => {
  // 跳過 ngrok 瀏覽器警告
  res.set("ngrok-skip-browser-warning", "true");

  return cors(req, res, async () => {
    const events = req.body.events || [];
    const db = admin.firestore();

    console.log("收到 LINE 事件:", JSON.stringify(req.body));

    // Pseudocode: 處理空事件（驗證請求）
    if (events.length === 0) {
      return res.status(200).send("OK");
    }

    // Pseudocode: 遍歷處理每個事件
    for (const event of events) {
      const lineUserId = event.source.userId;

      // ========================================
      // A. 處理文字訊息（綁定碼 + 自動回覆）
      // ========================================
      if (event.type === "message" && event.message.type === "text") {
        const text = event.message.text.trim();
        const replyToken = event.replyToken;

        // Pseudocode: 檢查是否有待處理的輸入請求
        // 用於多步驟對話（如輸入失敗原因）
        const pendingInputDoc = await db.collection("pending_inputs").doc(lineUserId).get();
        if (pendingInputDoc.exists) {
          const inputData = pendingInputDoc.data();

          if (inputData.type === "fail_reason") {
            // Pseudocode: 處理面交失敗原因輸入
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

            // Pseudocode: 刪除待處理請求
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

// ============================================
// 自動回覆邏輯
// ============================================
/**
 * Pseudocode:
 * 1. 將文字轉為小寫以便比對
 * 2. 查詢使用者是否已綁定 LINE
 * 3. 如果未綁定，提示綁定流程
 * 4. 如果已綁定，根據關鍵字回覆：
 *    - 「查詢/訂單/交易」→ 顯示交易列表
 *    - 「幫助/功能/help」→ 顯示功能說明
 *    - 其他 → 顯示功能選單（Buttons Template）
 * 
 * TODO: 加入更多關鍵字（如「書籍」、「積分」）
 * TODO: 實作自然語言理解（NLU）
 * TODO: 加入常見問題自動回答
 * TODO: 記錄使用者互動數據供分析
 */
async function handleAutoReply(replyToken, text, lineUserId, db) {
  const textLower = text.toLowerCase();

  // Pseudocode: 查詢使用者資料
  const userQuery = await db.collection("users").where("lineUserId", "==", lineUserId).limit(1).get();

  if (userQuery.empty) {
    // Pseudocode: 未綁定帳號，提示綁定流程
    await lineService.replyMessage(replyToken,
      "👋 歡迎使用校園二手書循環平台！\n\n" +
      "請先在網頁平台登入後，於個人專區取得綁定碼，然後在此輸入 6 位數綁定碼以連結您的帳戶。",
    );
    return;
  }

  const userId = userQuery.docs[0].id;
  const userData = userQuery.docs[0].data();

  // Pseudocode: 根據關鍵字回覆
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
    // Pseudocode: 預設回覆 + 互動選單
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
              uri: "https://your-platform-url.com", // TODO: 改為環境變數
            },
          ],
        },
      },
    ]);
  }
}

// ============================================
// 回覆交易列表
// ============================================
/**
 * Pseudocode:
 * 1. 查詢使用者作為買家的進行中交易（Pending）
 * 2. 查詢使用者作為賣家的進行中交易（Pending）
 * 3. 合併兩個列表，限制最多 5 筆
 * 4. 如果沒有交易，回覆提示訊息
 * 5. 如果有交易，格式化並回覆交易資訊：
 *    - 角色（買家/賣家）
 *    - 書名
 *    - 價格
 *    - 面交時間
 * 
 * TODO: 使用 Flex Message 美化交易列表顯示
 * TODO: 加入交易狀態篩選（可查看已完成的交易）
 * TODO: 加入分頁功能（超過 5 筆時）
 * TODO: 加入快速操作按鈕（如查看詳情、聯絡對方）
 */
async function replyTransactionList(replyToken, userId, db) {
  // Pseudocode: 查詢買家交易
  const buyerTrans = await db.collection("transactions")
    .where("buyerId", "==", userId)
    .where("status", "==", "Pending")
    .limit(5)
    .get();

  // Pseudocode: 查詢賣家交易
  const sellerTrans = await db.collection("transactions")
    .where("sellerId", "==", userId)
    .where("status", "==", "Pending")
    .limit(5)
    .get();

  const allTrans = [...buyerTrans.docs, ...sellerTrans.docs];

  // Pseudocode: 沒有交易時的提示
  if (allTrans.length === 0) {
    await lineService.replyMessage(replyToken, "📭 目前沒有進行中的交易訂單。");
    return;
  }

  // Pseudocode: 格式化交易列表訊息
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

// ============================================
// 處理 Postback（面交成功/失敗）
// ============================================
/**
 * Pseudocode:
 * 1. 解析 postback data（action, transactionId, userId）
 * 2. 驗證必要參數是否完整
 * 3. 根據 action 類型處理：
 *    a. confirm_success: 標記面交成功
 *       - 使用 Firestore Transaction 確保一致性
 *       - 檢查是否重複點擊
 *       - 標記該用戶已確認
 *       - 如果雙方都確認，更新交易狀態為 Completed
 *    b. report_fail: 標記面交失敗
 *       - 檢查交易狀態防止重複
 *       - 更新交易狀態為 Failed
 *       - 記錄失敗原因和回報者
 *    c. input_fail_reason: 請求輸入失敗原因
 *       - 建立待處理輸入請求
 *       - 提示用戶輸入失敗原因
 * 4. 回覆用戶處理結果
 * 
 * TODO: 加入面交照片上傳功能
 * TODO: 實作面交延期功能（雙方同意延期）
 * TODO: 加入自動提醒未確認的用戶
 * TODO: 實作爭議處理流程（雙方意見不一致時）
 */
async function handlePostback(event, db) {
  const data = event.postback.data;
  const params = new URLSearchParams(data);

  const action = params.get("action");
  const transactionId = params.get("transactionId");
  const userId = params.get("userId");

  // Pseudocode: 驗證必要參數
  if (!transactionId || !userId) {
    console.error("Invalid postback data:", data);
    return;
  }

  const transRef = db.collection("transactions").doc(transactionId);

  try {
    // ========================================
    // A. 面交成功確認
    // ========================================
    if (action === "confirm_success") {
      // Pseudocode: 使用 Firestore Transaction 確保一致性
      await db.runTransaction(async (t) => {
        const doc = await t.get(transRef);
        if (!doc.exists) return;

        const trans = doc.data();

        // Pseudocode: 防止重複點擊（交易已結束）
        if (trans.status === "Completed" || trans.status === "Failed" || trans.status === "Canceled") {
          throw new Error("TransFinalized");
        }

        // Pseudocode: 標記此用戶已確認
        const confirmKey = trans.buyerId === userId ? "buyerConfirmed" : "sellerConfirmed";
        const updates = {
          [confirmKey]: true,
          [`${confirmKey}At`]: new Date(),
        };

        // Pseudocode: 檢查雙方是否都已確認
        const otherConfirmKey = trans.buyerId === userId ? "sellerConfirmed" : "buyerConfirmed";
        if (trans[otherConfirmKey] === true) {
          // 雙方都確認了，交易完成
          updates.status = "Completed";
          updates.completedAt = new Date();
        }

        t.update(transRef, updates);
      });

      // Pseudocode: 回覆用戶
      const lineUserId = event.source.userId;
      await lineService.pushMessage(lineUserId,
        "✅ 已記錄面交成功！\n\n" +
        "感謝您的回報，等待對方確認後交易將自動完成。",
      );
    }
    // ========================================
    // B. 面交失敗回報
    // ========================================
    else if (action === "report_fail") {
      // Pseudocode: 檢查狀態防止重複點擊
      const currentDoc = await transRef.get();
      if (currentDoc.exists) {
        const tData = currentDoc.data();
        if (tData.status === "Completed" || tData.status === "Failed" || tData.status === "Canceled") {
          await lineService.replyMessage(event.replyToken, "⚠️ 此交易已結束，按鈕已失效。");
          return;
        }
      }

      // Pseudocode: 更新為失敗狀態
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
    }
    // ========================================
    // C. 請求輸入失敗原因
    // ========================================
    else if (action === "input_fail_reason") {
      const lineUserId = event.source.userId;
      // Pseudocode: 建立待處理輸入請求
      await db.collection("pending_inputs").doc(lineUserId).set({
        type: "fail_reason",
        transactionId: transactionId,
        userId: userId,
        timestamp: new Date(),
      });

      // Pseudocode: 提示用戶輸入失敗原因
      await lineService.pushMessage(lineUserId,
        "請簡述面交失敗的原因：\n" +
        "（例如：對方未出現、書籍與描述不符等）",
      );
    }
  } catch (e) {
    // Pseudocode: 錯誤處理
    if (e.message === "TransFinalized") {
      await lineService.replyMessage(event.replyToken, "⚠️ 此交易已結束，按鈕已失效。");
    } else {
      console.error("Postback handling error:", e);
    }
  }
}

// ============================================
// 3. 發送交易明細通知（開立明細後觸發）
// ============================================
/**
 * Pseudocode:
 * 1. 從交易資料中提取買賣雙方的 UID
 * 2. 讀取買賣雙方的使用者資料
 * 3. 檢查是否啟用 LINE 通知且有綁定 LINE
 * 4. 建立 Flex Message 格式的交易明細
 * 5. 分別發送給買家和賣家（如果有啟用通知）
 * 6. 記錄發送結果
 * 
 * 通知內容:
 * - 角色（買家/賣家）
 * - 書籍名稱
 * - 價格
 * - 面交時間地點
 * - 互動按鈕（面交成功/失敗）
 * 
 * 此函數會由 transaction.js 的 Firestore trigger 呼叫
 * 
 * TODO: 加入通知發送失敗重試機制
 * TODO: 實作通知發送歷史記錄
 * TODO: 加入通知樣板管理（可自訂樣式）
 * TODO: 支援多語言通知
 */
exports.sendInvoiceNotification = async (transaction, db) => {
  const { id: transId, buyerId, sellerId, bookTitle, agreedPrice, meetingTime, meetingLocation } = transaction;

  // Pseudocode: 取得買賣雙方的使用者資料
  const buyerDoc = await db.collection("users").doc(buyerId).get();
  const sellerDoc = await db.collection("users").doc(sellerId).get();

  const buyerData = buyerDoc.data() || {};
  const sellerData = sellerDoc.data() || {};

  const recipients = [];

  // Pseudocode: 檢查買家是否啟用 LINE 通知
  if (buyerData.isLineNotifyEnabled && buyerData.lineUserId) {
    recipients.push({ lineUserId: buyerData.lineUserId, uid: buyerId, role: "買家" });
  }
  // Pseudocode: 檢查賣家是否啟用 LINE 通知
  if (sellerData.isLineNotifyEnabled && sellerData.lineUserId) {
    recipients.push({ lineUserId: sellerData.lineUserId, uid: sellerId, role: "賣家" });
  }

  if (recipients.length === 0) {
    console.log("No LINE recipients for transaction", transId);
    return;
  }

  // Pseudocode: 使用 Flex Message 製作精美的明細通知
  const flexMessage = createInvoiceFlexMessage(
    transaction,
    buyerData.nickname || "買家",
    sellerData.nickname || "賣家",
  );

  // Pseudocode: 發送給雙方
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
  console.log("Creating Invoice Flex with:", JSON.stringify(transaction)); // Debug Log
  const { bookTitle, agreedPrice, price, meetingTime, meetingLocation } = transaction;

  // Fix: Handle 0 properly
  const finalPrice = (agreedPrice !== undefined && agreedPrice !== null) ? agreedPrice : (price || 0);

  const timeStr = meetingTime ?
    new Date(meetingTime.toDate ? meetingTime.toDate() : meetingTime).toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
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
            text: "《" + (bookTitle || "未知書籍") + "》",
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
                    text: `NT$ ${finalPrice}`,
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
