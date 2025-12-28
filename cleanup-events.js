/**
 * 잡다한 행사 데이터 정리 스크립트
 *
 * 사용법: node cleanup-events.js
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

// 제외할 키워드 (행사/세미나와 무관한 항목)
const excludeKeywords = [
    '신청', '예약', '문의', '민원', '등록', '접수',
    '차량', '시험', '고시', '공고', '입법예고',
    'FAQ', '자주묻는', '서식', '양식', '안내문',
    '모집', '채용', '구인', '입찰', '계약',
    '결과발표', '합격자', '당첨자', '선정자',
    '행사계획', '주간행사', '월간행사', '일정표'
];

// 제외할 패턴 (날짜 범위 형식)
const excludePatterns = [
    /\(\d{2}\.\d{1,2}\.\d{1,2}~\d{2}\.\d{1,2}\.\d{1,2}\)/,
    /\d{4}\.\d{1,2}\.\d{1,2}~\d{4}\.\d{1,2}\.\d{1,2}/
];

// 포함해야 할 키워드 (행사/세미나 관련)
const includeKeywords = [
    '행사', '세미나', '축제', '공연', '전시', '페스티벌',
    '콘서트', '포럼', '컨퍼런스', '워크숍', '워크샵',
    '강연', '특강', '강좌', '프로그램', '대회', '마라톤',
    '페어', '박람회', '엑스포', '쇼', '이벤트', '문화',
    '체험', '투어', '여행', '관광', '캠프', '캠페인'
];

async function cleanupEvents() {
    console.log('잡다한 행사 데이터 정리 시작...\n');

    try {
        // local-gov-crawl 소스의 데이터 조회
        const snapshot = await db.collection('iuem')
            .where('source', '==', 'local-gov-crawl')
            .get();

        console.log(`총 ${snapshot.size}개의 지자체 크롤링 데이터 발견\n`);

        const toDelete = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const title = data.title || '';

            // 제외 키워드 체크
            const hasExcludeKeyword = excludeKeywords.some(kw => title.includes(kw));
            // 제외 패턴 체크
            const hasExcludePattern = excludePatterns.some(pattern => pattern.test(title));
            // 포함 키워드 체크
            const hasIncludeKeyword = includeKeywords.some(kw => title.includes(kw));

            // 제외 키워드/패턴이 있거나 포함 키워드가 없으면 삭제 대상
            if (hasExcludeKeyword || hasExcludePattern || !hasIncludeKeyword) {
                toDelete.push({
                    id: doc.id,
                    title: title
                });
            }
        });

        console.log(`삭제 대상: ${toDelete.length}개\n`);

        if (toDelete.length === 0) {
            console.log('삭제할 데이터가 없습니다.');
            process.exit(0);
        }

        // 삭제 대상 목록 출력
        console.log('삭제될 항목:');
        toDelete.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.title}`);
        });

        // 배치 삭제
        console.log('\n삭제 중...');
        const batchSize = 400;
        for (let i = 0; i < toDelete.length; i += batchSize) {
            const batch = db.batch();
            const chunk = toDelete.slice(i, i + batchSize);

            chunk.forEach(item => {
                const docRef = db.collection('iuem').doc(item.id);
                batch.delete(docRef);
            });

            await batch.commit();
            console.log(`  ${Math.min(i + batchSize, toDelete.length)}/${toDelete.length} 삭제 완료`);
        }

        console.log('\n정리 완료!');
    } catch (error) {
        console.error('오류:', error);
    }

    process.exit(0);
}

cleanupEvents();
