const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");

// 1. Add Review (Callable)
exports.addReview = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "請先登入帳號");
  }

  const {transactionId, targetUid, rating, comment} = data;
  const uid = context.auth.uid;

  if (!transactionId || !targetUid || !rating) {
    throw new functions.https.HttpsError("invalid-argument", "缺少必要參數");
  }

  if (rating < 1 || rating > 5) {
    throw new functions.https.HttpsError("invalid-argument", "評分範圍錯誤 (1-5)");
  }

  const db = admin.firestore();
  const transRef = db.collection("transactions").doc(transactionId);

  try {
    await db.runTransaction(async (t) => {
      const transDoc = await t.get(transRef);
      if (!transDoc.exists) throw new functions.https.HttpsError("not-found", "交易不存在");

      const trans = transDoc.data();
      if (trans.status !== "Completed") {
        throw new functions.https.HttpsError("failed-precondition", "交易尚未完成，無法評價");
      }

      // Verify participation
      const isBuyer = trans.buyerId === uid;
      const isSeller = trans.sellerId === uid;

      if (!isBuyer && !isSeller) {
        throw new functions.https.HttpsError("permission-denied", "您非此交易當事人");
      }

      // Check correctness of target (Reviewing the OTHER person)
      const expectedTarget = isBuyer ? trans.sellerId : trans.buyerId;
      if (targetUid !== expectedTarget) {
        throw new functions.https.HttpsError("invalid-argument", "評價對象錯誤");
      }

      // Check if already rated (using flags on transaction doc)
      const fieldToCheck = isBuyer ? "buyerRated" : "sellerRated";
      if (trans[fieldToCheck]) {
        throw new functions.https.HttpsError("already-exists", "您已評價過此交易");
      }

      // Create Review
      const reviewRef = db.collection("reviews").doc();
      t.set(reviewRef, {
        transactionId,
        fromUid: uid,
        toUid: targetUid,
        rating: Number(rating),
        comment: comment || "",
        timestamp: new Date(),
      });

      // Update Transaction Flag
      t.update(transRef, {
        [fieldToCheck]: true,
      });
    });

    return {success: true};
  } catch (e) {
    console.error("Add Review Error:", e);
    throw e instanceof functions.https.HttpsError ? e : new functions.https.HttpsError("internal", e.message);
  }
});

// 2. Aggregate Ratings (Trigger)
exports.onReviewCreated = functions.firestore
    .document("reviews/{reviewId}")
    .onCreate(async (snap, context) => {
      const review = snap.data();
      const {toUid, rating} = review;
      const db = admin.firestore();

      const userRef = db.collection("users").doc(toUid);

      await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) return; // Should not happen usually

        const userData = userDoc.data();
        const newCount = (userData.ratingCount || 0) + 1;
        const newSum = (userData.ratingSum || 0) + rating;
        const newAvg = Number((newSum / newCount).toFixed(1));

        t.update(userRef, {
          ratingCount: newCount,
          ratingSum: newSum,
          averageRating: newAvg,
        });
      });
    });
