const admin = require("firebase-admin");
const lineBot = require("./handlers/line-bot");

// Initialize Admin
// User must have this or use default credential if in emulator
// Actually in emulator we can just init.
if (!admin.apps.length) admin.initializeApp({projectId: "schoolbook-290b6"});

async function test() {
  const db = admin.firestore();
  // Use the transaction ID from the user screenshot if possible, or just pick latest
  // I don't have exact ID. obtaining latest.
  const snap = await db.collection("transactions").orderBy("createdAt", "desc").limit(1).get();
  if (snap.empty) {
    console.log("No transactions found.");
    return;
  }
  const doc = snap.docs[0];
  const data = doc.data();
  const id = doc.id;
  console.log("Testing with transaction:", id);
  console.log("Data:", JSON.stringify(data, null, 2));

  try {
    await lineBot.sendInvoiceNotification({id, ...data}, db);
    console.log("Success!");
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
