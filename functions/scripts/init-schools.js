/**
 * ============================================
 * 初始化學校資料腳本
 * ============================================
 * 
 * 用途：將學校網域白名單資料寫入 Firestore
 * 
 * 執行方式：
 * node init-schools.js
 * 
 * 注意：需要先設定 GOOGLE_APPLICATION_CREDENTIALS 環境變數
 */

const admin = require('firebase-admin');

// 初始化 Firebase Admin
// 需要下載服務帳戶金鑰並設定環境變數
// export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
admin.initializeApp({
    credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

// ============================================
// 學校資料
// ============================================
const schools = [
    {
        id: 'shsh-student',
        domain: 'shsh.tw',
        name: '正心高中（學生）',
        fullName: '天主教私立正心高級中學',
        enabled: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
        id: 'shsh-teacher',
        domain: 'shsh.ylc.edu.tw',
        name: '正心高中（教師）',
        fullName: '天主教私立正心高級中學',
        enabled: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
];

// ============================================
// 初始化函數
// ============================================
async function initSchools() {
    console.log('開始初始化學校資料...\n');

    try {
        const batch = db.batch();

        for (const school of schools) {
            const docRef = db.collection('schools').doc(school.id);
            batch.set(docRef, school);
            console.log(`✅ 準備寫入: ${school.name} (${school.domain})`);
        }

        await batch.commit();
        console.log(`\n🎉 成功初始化 ${schools.length} 個學校資料！`);

        // 驗證寫入結果
        console.log('\n驗證資料...');
        const snapshot = await db.collection('schools').where('enabled', '==', true).get();
        console.log(`✓ 已啟用的學校數量: ${snapshot.size}`);

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${data.name}: ${data.domain}`);
        });

    } catch (error) {
        console.error('❌ 初始化失敗:', error);
        process.exit(1);
    }

    console.log('\n✨ 初始化完成！');
    process.exit(0);
}

// 執行初始化
initSchools();
