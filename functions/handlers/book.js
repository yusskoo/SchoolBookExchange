const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

exports.deleteBook = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "請先登入");
  }

  const {bookId} = data;
  if (!bookId) {
    throw new functions.https.HttpsError("invalid-argument", "缺少 Book ID");
  }

  try {
    const bookRef = db.collection("books").doc(bookId);
    const doc = await bookRef.get();

    if (!doc.exists) {
      throw new functions.https.HttpsError("not-found", "書籍不存在");
    }

    const bookData = doc.data();
    // Strict ownership check
    // Ensure both are strings for comparison
    if (String(bookData.sellerId) !== String(context.auth.uid)) {
      console.warn(`Permission denied: User ${context.auth.uid} tried to delete book owned by ${bookData.sellerId}`);
      throw new functions.https.HttpsError("permission-denied", "您無權刪除此書籍");
    }

    await bookRef.delete();
    return {success: true};
  } catch (error) {
    console.error("Delete book error:", error);
    throw error;
  }
});
