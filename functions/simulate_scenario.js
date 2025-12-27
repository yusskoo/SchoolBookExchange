const admin = require('firebase-admin');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8088'; // Match firebase.json port
process.env.GCLOUD_PROJECT = 'schoolbook-290b6';

admin.initializeApp({ projectId: 'schoolbook-290b6' });
const db = admin.firestore();

// 取得命令行參數
const args = process.argv.slice(2);
const lineUserId = args[0]; // 第一個參數作為 LINE User ID

if (!lineUserId) {
    console.error('❌ 請提供您的 LINE User ID');
    console.log('用法: node simulate_scenario.js <YOUR_LINE_USER_ID>');
    console.log('💡 提示: 發送任意訊息給 LINE Bot，在終端機查看 "source.userId"');
    process.exit(1);
}

async function runSimulation() {
    console.log(`🚀 開始模擬測試 (LINE ID: ${lineUserId})...`);

    try {
        // 1. 建立測試用戶 (賣家)
        const sellerId = 'test_seller_01';
        await db.collection('users').doc(sellerId).set({
            nickname: '測試賣家',
            email: 'seller@test.com',
            lineUserId: lineUserId,
            isLineNotifyEnabled: true,
            lineBoundAt: new Date()
        });
        console.log('✅ 步驟 1: 測試賣家帳號已建立');

        // 2. 建立測試用戶 (買家)
        const buyerId = 'test_buyer_01';
        await db.collection('users').doc(buyerId).set({
            nickname: '測試買家',
            email: 'buyer@test.com'
        });
        console.log('✅ 步驟 2: 測試買家帳號已建立');

        // 3. 建立測試交易 (觸發通知)
        console.log('⏳ 步驟 3: 建立交易並觸發明細通知...');
        const transRef = db.collection('transactions').doc();
        await transRef.set({
            bookId: 'book_123',
            bookTitle: '微積分 (Calculus) 測試版',
            buyerId: buyerId,
            sellerId: sellerId,
            agreedPrice: 500,
            status: 'Pending',
            meetingTime: new Date(Date.now() + 86400000), // 明天
            meetingLocation: '學校正門口',
            invoiceSentAt: new Date(), // 關鍵：這會觸發 onTransactionUpdate
            timestamp: new Date()
        });

        console.log(`✅ 模擬完成！交易 ID: ${transRef.id}`);
        console.log('👉 請檢查您的手機，LINE 應該會收到一則「交易明細通知」');
        console.log('👉 您可以點擊「面交成功」或「面交失敗」來測試回報功能');

    } catch (e) {
        console.error('❌ 模擬失敗:', e);
    }
}

runSimulation();
