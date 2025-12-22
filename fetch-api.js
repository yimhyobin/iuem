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
 * 상태 계산 (ongoing, upcoming, closed)
 */
function calculateStatus(startDate, endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (end && end < today) {
        return 'closed';
    }
    if (start && start > today) {
        return 'upcoming';
    }
    return 'ongoing';
}

/**
 * API 데이터를 Firestore 형식으로 변환
 */
function transformData(item) {
    // API 응답 필드명은 실제 응답에 맞게 수정 필요
    const startDate = item.rcptBgngDt || item.startDate || '';
    const endDate = item.rcptEndDt || item.endDate || '';

    return {
        title: item.pbancTtl || item.title || '제목 없음',
        category: 'support',
        status: calculateStatus(startDate, endDate),
        organization: item.excInsttNm || item.organization || '',
        region: item.rgnNm || item.region || '전국',
        supportField: item.sprtFldNm || item.supportField || '사업화',
        startDate: startDate,
        endDate: endDate,
        description: item.pbancCn || item.description || '',
        targetAudience: item.trgtJgdnNm || '',
        applicationUrl: item.linkUrl || item.pbancUrl || '',
        views: 0,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
        source: 'k-startup'
    };
}

/**
 * Firestore에 데이터 저장
 */
async function saveToFirestore(posts) {
    console.log(`💾 Firestore에 ${posts.length}개 데이터 저장 중...`);

    const batch = db.batch();
    const collectionRef = db.collection('iuem');

    for (const post of posts) {
        // 제목 기반으로 고유 ID 생성 (중복 방지)
        const docId = `kstartup_${Buffer.from(post.title).toString('base64').slice(0, 20)}`;
        const docRef = collectionRef.doc(docId);
        batch.set(docRef, post, { merge: true });
    }

    await batch.commit();
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
        // 1. API에서 데이터 가져오기
        const response = await fetchAnnouncements(1, 100);

        if (!response.data || response.data.length === 0) {
            console.log('⚠️ 가져올 데이터가 없습니다.');
            return;
        }

        console.log(`📊 총 ${response.matchCount || response.data.length}개 공고 발견\n`);

        // 2. 데이터 변환
        const posts = response.data.map(transformData);

        // 3. Firestore에 저장
        await saveToFirestore(posts);

        console.log('\n🎉 완료! 웹사이트를 새로고침하면 데이터가 표시됩니다.');

    } catch (error) {
        console.error('\n❌ 오류 발생:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

// 실행
main();
