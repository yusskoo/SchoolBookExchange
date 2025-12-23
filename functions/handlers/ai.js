const functions = require('firebase-functions');

// Mock AI Analysis Service
exports.analyzeImage = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '請先登入');

    const { imageBase64 } = data;

    // Simulate AI Processing Delay (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock Response
    // In a real scenario, we would send 'imageBase64' to Google Vision API or Gemini Pro Vision

    const mockBooks = [
        { title: "深入淺出 Design Patterns", price: 480 },
        { title: "Clean Code: 無瑕的程式碼", price: 550 },
        { title: "JavaScript：優良部分", price: 300 },
        { title: "現代 PHP 實戰", price: 620 }
    ];

    const randomBook = mockBooks[Math.floor(Math.random() * mockBooks.length)];

    return {
        success: true,
        data: {
            title: randomBook.title,
            price: randomBook.price,
            confidence: 0.98,
            isSafe: true
        }
    };
});
