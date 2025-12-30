/**
 * K-Startup API 데이터 가져오기 스크립트
 *
 * 사용법: node fetch-api.js
 */

const fs = require('fs');
const path = require('path');

// .env 파일 로드
require('dotenv').config();

// Firebase Admin SDK
const admin = require('firebase-admin');

// 서비스 계정 키 로드
const serviceAccount = require('./serviceAccountKey.json');

// Firebase Admin 초기화
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// API 설정
const API_KEY = process.env.KSTARTUP_API_KEY;
const BASE_URL = 'https://apis.data.go.kr/B552735/kisedKstartupService01';

/**
 * API에서 공고 데이터 가져오기
 */
async function fetchAnnouncements(page = 1, perPage = 100) {
    const url = `${BASE_URL}/getAnnouncementInformation01?serviceKey=${API_KEY}&page=${page}&perPage=${perPage}&returnType=json`;

    console.log(`📡 API 호출 중... (페이지 ${page})`);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP 오류: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ API 호출 실패:', error.message);
        throw error;
    }
}

/**
 * YYYYMMDD 형식을 Date 객체로 변환
 */
function parseDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return null;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // 월은 0부터 시작
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
}

/**
 * YYYYMMDD를 YYYY-MM-DD 형식으로 변환
 */
function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return '';
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

/**
 * 상태 계산 (ongoing, upcoming, closed)
 */
function calculateStatus(startDate, endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (end && end < today) {
        return 'closed';
    }
    if (start && start > today) {
        return 'upcoming';
    }
    return 'ongoing';
}

/**
 * API 지원분야를 네비게이션 카테고리로 매핑
 * - support (지원사업/교육): 사업화, R&D, 멘토링, 시설, 인력, 융자 등
 * - event (행사/축제): 행사, 네트워크
 * - notice (공지사항): 기타
 */
function mapCategory(suptBizClsfc) {
    if (!suptBizClsfc) return 'support';

    const category = suptBizClsfc.toLowerCase();

    // 행사/축제 카테고리
    if (category.includes('행사') ||
        category.includes('네트워크') ||
        category.includes('축제') ||
        category.includes('박람회') ||
        category.includes('컨퍼런스') ||
        category.includes('데모데이')) {
        return 'event';
    }

    // 지원사업/교육 카테고리 (대부분)
    if (category.includes('사업화') ||
        category.includes('r&d') ||
        category.includes('기술개발') ||
        category.includes('멘토링') ||
        category.includes('컨설팅') ||
        category.includes('교육') ||
        category.includes('시설') ||
        category.includes('공간') ||
        category.includes('보육') ||
        category.includes('인력') ||
        category.includes('융자') ||
        category.includes('글로벌') ||
        category.includes('투자')) {
        return 'support';
    }

    // 기본값: 지원사업
    return 'support';
}

/**
 * API 데이터를 Firestore 형식으로 변환
 */
function transformData(item) {
    // API 필드명 매핑 (YYYYMMDD 형식)
    const startDateRaw = item.pbanc_rcpt_bgng_dt || '';
    const endDateRaw = item.pbanc_rcpt_end_dt || '';
    const supportField = item.supt_biz_clsfc || '사업화';

    return {
        title: item.biz_pbanc_nm || item.intg_pbanc_biz_nm || '제목 없음',
        category: mapCategory(supportField),
        status: calculateStatus(startDateRaw, endDateRaw),
        organization: item.sprv_inst || '',
        region: item.supt_regin || '전국',
        supportField: supportField,
        startDate: formatDate(startDateRaw),  // YYYY-MM-DD 형식으로 변환
        endDate: formatDate(endDateRaw),      // YYYY-MM-DD 형식으로 변환
        description: item.pbanc_ctnt || '',
        targetAudience: item.aply_trgt || '',
        applicationUrl: item.detl_pg_url || item.biz_aply_url || '',
        views: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'k-startup'
    };
}

/**
 * Firestore에 데이터 저장
 */
async function saveToFirestore(posts) {
    console.log(`💾 Firestore에 ${posts.length}개 데이터 저장 중...`);

    const collectionRef = db.collection('iuem');
    const batchSize = 400; // Firestore 제한은 500이지만 안전하게 400으로

    // 배치 단위로 나눠서 저장
    for (let i = 0; i < posts.length; i += batchSize) {
        const batch = db.batch();
        const chunk = posts.slice(i, i + batchSize);

        for (let j = 0; j < chunk.length; j++) {
            const post = chunk[j];
            // 안전한 문서 ID 생성 (특수문자 제거)
            const safeTitle = post.title.replace(/[^a-zA-Z0-9가-힣]/g, '').slice(0, 30);
            const docId = `kstartup_${i + j}_${safeTitle}`;
            const docRef = collectionRef.doc(docId);
            batch.set(docRef, post, { merge: true });
        }

        await batch.commit();
        console.log(`   배치 ${Math.floor(i / batchSize) + 1} 저장 완료 (${chunk.length}개)`);
    }

    console.log('✅ Firestore 저장 완료!');
}

/**
 * 메인 실행 함수
 */
async function main() {
    console.log('🚀 K-Startup API 데이터 가져오기 시작\n');

    // API 키 확인
    if (!API_KEY || API_KEY === '여기에_API키_붙여넣기') {
        console.error('❌ .env 파일에 API 키를 입력해주세요!');
        process.exit(1);
    }

    try {
        let allPosts = [];
        let page = 1;
        const perPage = 100;
        const maxPages = 10; // 최대 10페이지 (1000개)

        // 여러 페이지에서 데이터 가져오기
        while (page <= maxPages) {
            const response = await fetchAnnouncements(page, perPage);

            if (!response.data || response.data.length === 0) {
                break;
            }

            if (page === 1) {
                console.log(`📊 총 ${response.matchCount || response.totalCount}개 공고 발견\n`);
            }

            // 데이터 변환
            const posts = response.data.map(transformData);

            // 마감되지 않은 것만 필터링 (ongoing, upcoming)
            const activePosts = posts.filter(post => post.status !== 'closed');

            allPosts = allPosts.concat(activePosts);
            console.log(`   페이지 ${page}: ${activePosts.length}개 활성 공고 추가 (총 ${allPosts.length}개)`);

            // 다음 페이지 없으면 종료
            if (response.data.length < perPage) {
                break;
            }

            page++;
        }

        if (allPosts.length === 0) {
            console.log('⚠️ 활성 공고가 없습니다.');
            return;
        }

        console.log(`\n📋 마감되지 않은 공고: ${allPosts.length}개\n`);

        // Firestore에 저장
        await saveToFirestore(allPosts);

        console.log('\n🎉 완료! 웹사이트를 새로고침하면 데이터가 표시됩니다.');

    } catch (error) {
        console.error('\n❌ 오류 발생:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

// 실행
main();
