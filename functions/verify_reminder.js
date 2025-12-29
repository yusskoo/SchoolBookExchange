
const admin = require("firebase-admin");
const axios = require("axios");

// Initialize Admin SDK (Assuming running locally with emulators)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8088";
process.env.GCLOUD_PROJECT = "schoolbook-290b6";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "schoolbook-290b6",
  });
}

const db = admin.firestore();

async function runTest() {
  console.log("🚀 Starting Verification for 24h Reminder...");

  const buyerId = "test_buyer_" + Date.now();
  const sellerId = "test_seller_" + Date.now();
  const bookId = "test_book_" + Date.now();
  const transactionId = "trans_" + Date.now();

  // 1. Setup Test Data
  const meetingTime = new Date(Date.now() + 23 * 60 * 60 * 1000); // 23 hours from now (within 24h window)

  console.log(`Creating transaction ${transactionId} with meeting time: ${meetingTime.toISOString()}`);

  await db.collection("transactions").doc(transactionId).set({
    buyerId,
    sellerId,
    bookId,
    bookTitle: "Test Book for Reminder",
    meetingTime: admin.firestore.Timestamp.fromDate(meetingTime),
    status: "Pending",
    is24hReminderSent: false,
  });

  console.log("✅ Transaction created.");

  // 2. Call Debug Endpoint
  // Note: Adjust port if needed, usually 5001 for functions emulator
  const endpoint = "http://localhost:5001/schoolbook-290b6/us-central1/debugMeetingReminders";
  console.log(`Calling ${endpoint}...`);

  try {
    const res = await axios.get(endpoint);
    console.log("Response:", res.data);
  } catch (e) {
    console.error("Failed to call endpoint:", e.message);
  }

  // 3. Verify Result
  const doc = await db.collection("transactions").doc(transactionId).get();
  const data = doc.data();

  if (data.is24hReminderSent === true) {
    console.log("🎉 Verification PASSED: is24hReminderSent is TRUE");
  } else {
    console.error("❌ Verification FAILED: is24hReminderSent is still FALSE");
  }

  // 4. Verify Notification created
  const notifs = await db.collection("notifications").where("userId", "==", buyerId).get();
  if (!notifs.empty) {
    console.log(`🎉 Notification check PASSED: Found ${notifs.size} notifications for buyer.`);
    notifs.forEach((d) => console.log(" - ", d.data().content));
  } else {
    console.error("❌ Notification check FAILED: No notification found for buyer.");
  }
}

runTest();
