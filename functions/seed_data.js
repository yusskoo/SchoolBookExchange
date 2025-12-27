const admin = require("firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";

admin.initializeApp({
  projectId: "schoolbook-290b6",
});

const db = admin.firestore();

async function seed() {
  console.log("Seeding data...");

  const book = {
    title: "Chill Guys",
    author: "Cool Author",
    description: "A very chill book for chill people.",
    price: 50,
    originalPrice: 100,
    subject: "課外讀物",
    grade: "其他",
    type: "Sell",
    conditionLevel: "像是新的",
    sellerId: "system_seed",
    seller: {
      nickname: "System",
      studentId: "admin",
      score: 5.0,
    },
    cover: "https://i.pinimg.com/736x/8e/e3/37/8ee337fa203d6d0669e26e2a223df419.jpg", // Generic placeholder or try to match user image if possible, but generic is fine.
    status: "Available",
    timestamp: new Date(),
  };

  await db.collection("books").add(book);
  console.log("Added book: Chill Guys");

  // Add an exam too so the right side isn't empty if Dashboard needs it
  // StudentDashboard uses hardcoded examCountdown or local state usually?
  // Let's check StudentDashboard in App.jsx... it has default props.
}

seed().then(() => {
  console.log("Done");
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
