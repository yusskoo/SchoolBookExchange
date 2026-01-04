/**
 * ============================================
 * 書籍管理模組 (Book Handler)
 * ============================================
 *
 * 主要功能:
 * 1. 刪除書籍（賣家權限）
 */

// TODO: 加入書籍編輯功能（修改價格、描述等）
// TODO: 實作書籍審核機制（防止不當內容）
// TODO: 加入書籍收藏和推薦功能

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

// ============================================
// 刪除書籍功能
// ============================================
/**
 * Pseudocode:
 * 1. 驗證使用者已登入
 * 2. 驗證必填參數（bookId）
 * 3. 讀取書籍資料並檢查是否存在
 * 4. 嚴格檢查擁有權（只有賣家可以刪除自己的書籍）
 * 5. 執行刪除操作
 *
 * TODO: 實作軟刪除（標記為已刪除而非直接刪除）
 * TODO: 檢查是否有進行中的交易（有交易時不允許刪除）
 * TODO: 記錄刪除歷史供後續分析
 */
exports.deleteBook = functions.https.onCall(async (data, context) => {
  // Pseudocode: 驗證登入狀態
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "請先登入");
  }

  const { bookId } = data;
  if (!bookId) {
    throw new functions.https.HttpsError("invalid-argument", "缺少 Book ID");
  }

  try {
    const bookRef = db.collection("books").doc(bookId);
    const doc = await bookRef.get();

    // Pseudocode: 檢查書籍是否存在
    if (!doc.exists) {
      throw new functions.https.HttpsError("not-found", "書籍不存在");
    }

    const bookData = doc.data();

    // Pseudocode: 嚴格的擁有權檢查
    // 將兩者都轉為字串進行比較（避免類型不一致問題）
    if (String(bookData.sellerId) !== String(context.auth.uid)) {
      console.warn(`Permission denied: User ${context.auth.uid} tried to delete book owned by ${bookData.sellerId}`);
      throw new functions.https.HttpsError("permission-denied", "您無權刪除此書籍");
    }

    // ========================================
    // 檢查是否有進行中的交易（新增功能）✨
    // ========================================
    // Pseudocode:
    // - 查詢該書籍是否有進行中的交易
    // - 交易狀態包括：Pending（待確認）、Invoiced（已開立明細）
    // - 如果有，提示使用者先完成或取消交易
    const activeTransactions = await db.collection("transactions")
      .where("bookId", "==", bookId)
      .where("status", "in", ["Pending", "Invoiced"])
      .limit(1) // 只需要知道是否存在即可
      .get();

    if (!activeTransactions.empty) {
      // 有進行中的交易，將其標記為失敗 (Failed) 並允許刪除
      // 不設定 failedBy 以避免觸發扣分邏輯 (除非有明確需求)
      const batch = db.batch();
      activeTransactions.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "Failed",
          failureReason: "賣家已下架此商品",
          endedAt: new Date(),
        });
      });
      await batch.commit();
    }

    // Pseudocode: 執行刪除
    await bookRef.delete();
    return { success: true };
  } catch (error) {
    console.error("Delete book error:", error);
    throw error;
  }
});
