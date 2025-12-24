/**
 * TourAPI 축제/행사 데이터 가져오기 스크립트
 *
 * 사용법: node fetch-festival.js
 */

const fs = require('fs');

// .env 파일 로드
require('dotenv').config();

// Firebase Admin SDK
const admin = require('firebase-admin');

// 서비스 계정 키 로드 (이미 초기화되어 있으면 스킵)
if (!admin.apps.length) {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// API 설정
const API_KEY = process.env.FESTIVAL_API_KEY;
// TourAPI 4.0 (KorService2)
const API_URL = 'https://apis.data.go.kr/B551011/KorService2/searchFestival2';
const IMAGE_API_URL = 'https://apis.data.go.kr/B551011/KorService2/detailImage2';

/**
 * API에서 축제 데이터 가져오기
 */
async function fetchFestivals(page = 1, numOfRows = 100) {
    // 현재 날짜 기준으로 축제 검색
    const today = new Date();
    const eventStartDate = today.toISOString().slice(0, 10).replace(/-/g, '');

    const url = `${API_URL}?serviceKey=${API_KEY}&numOfRows=${numOfRows}&pageNo=${page}&MobileOS=ETC&MobileApp=iuem&_type=json&eventStartDate=${eventStartDate}`;

    console.log(`📡 TourAPI 축제 검색 중... (페이지 ${page})`);

    try {
        const response = await fetch(url);
        const text = await response.text();

        if (!response.ok) {
            console.log('   응답 내용:', text.substring(0, 500));
            throw new Error(`HTTP 오류: ${response.status}`);
        }

        try {
            return JSON.parse(text);
        } catch (e) {
            console.log('   응답 (JSON 아님):', text.substring(0, 500));
            throw new Error('JSON 파싱 실패');
        }
    } catch (error) {
        console.error('❌ API 호출 실패:', error.message);
        throw error;
    }
}

/**
 * 축제 상세 이미지 가져오기
 */
async function fetchFestivalImages(contentId) {
    const url = `${IMAGE_API_URL}?serviceKey=${API_KEY}&contentId=${contentId}&MobileOS=ETC&MobileApp=iuem&_type=json&imageYN=Y&subImageYN=Y`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        const items = data?.response?.body?.items?.item || [];
        const itemArray = Array.isArray(items) ? items : (items ? [items] : []);

        // 이미지 URL 배열 반환 (originimgurl 사용, 없으면 smallimageurl)
        return itemArray.map(item => item.originimgurl || item.smallimageurl).filter(Boolean);
    } catch (error) {
        console.log(`   이미지 조회 실패 (contentId: ${contentId}):`, error.message);
        return [];
    }
}

/**
 * 날짜 형식 변환 (YYYYMMDD → YYYY-MM-DD)
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    // 이미 YYYY-MM-DD 형식이면 그대로
    if (dateStr.includes('-')) return dateStr;
    // YYYYMMDD 형식이면 변환
    if (dateStr.length === 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
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
 * TourAPI 4.0 응답 형식에 맞춤
 */
function transformFestivalData(item, additionalImages = []) {
    const startDate = formatDate(item.eventstartdate || '');
    const endDate = formatDate(item.eventenddate || '');

    // 주소에서 지역 추출
    const addr = item.addr1 || '';
    const region = addr.split(' ')[0] || '전국';

    // 대표 이미지
    const mainImage = item.firstimage || item.firstimage2 || '';

    // 모든 이미지 배열 (대표 이미지 + 추가 이미지, 중복 제거)
    const allImages = [mainImage, ...additionalImages].filter(Boolean);
    const uniqueImages = [...new Set(allImages)];

    return {
        title: item.title || '축제명 없음',
        category: 'event',  // 행사/축제 카테고리
        status: calculateStatus(startDate, endDate),
        organization: '',
        region: region,
        supportField: '행사·네트워크',
        startDate: startDate,
        endDate: endDate,
        description: addr,
        targetAudience: '',
        applicationUrl: '',
        phoneNumber: item.tel || '',
        image: mainImage,
        images: uniqueImages,  // 홍보 이미지 배열
        contentId: item.contentid || '',
        views: 0,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
        source: 'tour-api'
    };
}

/**
 * Firestore에 데이터 저장
 */
async function saveToFirestore(posts) {
    console.log(`💾 Firestore에 ${posts.length}개 축제 데이터 저장 중...`);

    const collectionRef = db.collection('iuem');
    const batchSize = 400;

    for (let i = 0; i < posts.length; i += batchSize) {
        const batch = db.batch();
        const chunk = posts.slice(i, i + batchSize);

        for (let j = 0; j < chunk.length; j++) {
            const post = chunk[j];
            const safeTitle = post.title.replace(/[^a-zA-Z0-9가-힣]/g, '').slice(0, 30);
            const docId = `festival_${post.contentId || (i + j)}_${safeTitle}`;
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
    console.log('🎪 TourAPI 축제/행사 데이터 가져오기 시작\n');

    if (!API_KEY) {
        console.error('❌ .env 파일에 FESTIVAL_API_KEY를 입력해주세요!');
        process.exit(1);
    }

    try {
        let allFestivals = [];
        let page = 1;
        const numOfRows = 100;
        const maxPages = 10;

        while (page <= maxPages) {
            const response = await fetchFestivals(page, numOfRows);

            // TourAPI 응답 구조
            const body = response?.response?.body;
            const items = body?.items?.item || [];

            // items가 배열이 아닌 경우 (단일 객체)
            const itemArray = Array.isArray(items) ? items : (items ? [items] : []);

            if (itemArray.length === 0) {
                if (page === 1) {
                    console.log('응답 구조:', JSON.stringify(response, null, 2).substring(0, 800));
                }
                break;
            }

            if (page === 1) {
                const totalCount = body?.totalCount || itemArray.length;
                console.log(`📊 총 ${totalCount}개 축제/행사 발견\n`);
            }

            // 데이터 변환 (이미지 가져오기 포함)
            console.log(`   📷 ${itemArray.length}개 축제의 홍보 이미지 가져오는 중...`);
            const festivals = [];
            for (const item of itemArray) {
                const contentId = item.contentid;
                let additionalImages = [];

                if (contentId) {
                    additionalImages = await fetchFestivalImages(contentId);
                    // API 호출 간격
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                const festival = transformFestivalData(item, additionalImages);
                festivals.push(festival);
            }

            // 마감되지 않은 것만 필터링
            const activeFestivals = festivals.filter(f => f.status !== 'closed');

            allFestivals = allFestivals.concat(activeFestivals);
            console.log(`   페이지 ${page}: ${activeFestivals.length}개 활성 축제 추가 (총 ${allFestivals.length}개)`);

            if (itemArray.length < numOfRows) {
                break;
            }

            page++;

            // API 호출 간격 두기
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (allFestivals.length === 0) {
            console.log('⚠️ 활성 축제가 없습니다.');
            return;
        }

        console.log(`\n🎉 마감되지 않은 축제/행사: ${allFestivals.length}개\n`);

        await saveToFirestore(allFestivals);

        console.log('\n✨ 완료! 웹사이트를 새로고침하면 축제 데이터가 표시됩니다.');

    } catch (error) {
        console.error('\n❌ 오류 발생:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

// 실행
main();
