/**
 * 잘못된 제목 데이터 삭제 스크립트
 * "행사계획", "행사캘린더" 등 이상한 제목 삭제
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
    console.log('🧹 잘못된 제목 데이터 삭제 중...\n');

    const snapshot = await db.collection('iuem').get();

    if (snapshot.empty) {
        console.log('데이터가 없습니다.');
        return;
    }

    const badKeywords = ['행사계획', '행사캘린더'];
    const toDelete = [];

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const title = data.title || '';

        // 제목에 잘못된 키워드가 포함되어 있으면 삭제 대상
        if (badKeywords.some(keyword => title.includes(keyword))) {
            toDelete.push({ id: doc.id, title: title });
        }
    });

    if (toDelete.length === 0) {
        console.log('삭제할 데이터가 없습니다.');
        return;
    }

    console.log(`${toDelete.length}개 삭제 대상 발견:\n`);
    toDelete.forEach(item => {
        console.log(`  - ${item.title}`);
    });

    const batch = db.batch();
    toDelete.forEach(item => {
        batch.delete(db.collection('iuem').doc(item.id));
    });

    await batch.commit();
    console.log(`\n✅ ${toDelete.length}개 데이터 삭제 완료!`);
}

cleanup().then(() => process.exit(0)).catch(err => {
    console.error('오류:', err);
    process.exit(1);
});
