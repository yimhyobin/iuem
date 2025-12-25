/**
 * 천안시 잘못된 데이터 삭제 스크립트
 */

require('dotenv').config();
const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function cleanup() {
    console.log('🧹 천안시 잘못된 데이터 삭제 중...\n');

    const snapshot = await db.collection('iuem')
        .where('source', '==', 'cheonan-crawl')
        .get();

    if (snapshot.empty) {
        console.log('삭제할 데이터가 없습니다.');
        return;
    }

    console.log(`${snapshot.size}개 데이터 발견\n`);

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        console.log(`  삭제: ${doc.data().title}`);
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`\n✅ ${snapshot.size}개 데이터 삭제 완료!`);
}

cleanup().then(() => process.exit(0)).catch(err => {
    console.error('오류:', err);
    process.exit(1);
});
