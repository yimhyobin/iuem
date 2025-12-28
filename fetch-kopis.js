/**
 * KOPIS 공연예술통합전산망 API 데이터 수집 스크립트
 *
 * 전국 공연/전시/행사 정보를 가져옵니다.
 * 사용법: node fetch-kopis.js
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

// KOPIS API 설정
const API_KEY = process.env.KOPIS_API_KEY;
const BASE_URL = 'http://www.kopis.or.kr/openApi/restful/pblprfr';
const DETAIL_URL = 'http://www.kopis.or.kr/openApi/restful/pblprfr';

// 지역 코드
const REGION_CODES = {
    '서울': '11',
    '부산': '26',
    '대구': '27',
    '인천': '28',
    '광주': '29',
    '대전': '30',
    '울산': '31',
    '세종': '36',
    '경기': '41',
    '강원': '51',
    '충북': '43',
    '충남': '44',
    '전북': '45',
    '전남': '46',
    '경북': '47',
    '경남': '48',
    '제주': '50'
};

// 장르 코드
const GENRE_CODES = {
    'AAAA': '연극',
    'BBBB': '뮤지컬',
    'CCCC': '클래식',
    'EEEE': '무용',
    'GGGG': '국악',
    'AAAB': '대중음악',
    'EEEB': '서커스/마술',
    'BBBE': '복합예술'
};

/**
 * XML을 파싱하여 값 추출
 */
function extractXmlValue(xml, tag) {
    const regex = new RegExp(`<${tag}><!\\[CDATA\\[([^\\]]*?)\\]\\]></${tag}>|<${tag}>([^<]*)</${tag}>`, 'i');
    const match = xml.match(regex);
    if (match) {
        return match[1] || match[2] || '';
    }
    return '';
}

/**
 * XML에서 여러 항목 추출
 */
function extractXmlItems(xml, itemTag) {
    const regex = new RegExp(`<${itemTag}>([\\s\\S]*?)</${itemTag}>`, 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
        matches.push(match[1]);
    }
    return matches;
}

/**
 * 날짜 형식 변환 (YYYYMMDD 또는 YYYY.MM.DD → YYYY-MM-DD)
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    // YYYY.MM.DD 형식
    if (dateStr.includes('.')) {
        return dateStr.replace(/\./g, '-');
    }
    // YYYYMMDD 형식
    if (dateStr.length === 8 && !dateStr.includes('-')) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
}

/**
 * 공연 목록 조회
 */
async function fetchPerformances(stdate, eddate, cpage = 1, rows = 100) {
    const url = `${BASE_URL}?service=${API_KEY}&stdate=${stdate}&eddate=${eddate}&cpage=${cpage}&rows=${rows}`;

    console.log(`📡 KOPIS API 호출 중... (페이지 ${cpage})`);

    try {
        const response = await fetch(url);
        const xml = await response.text();

        // 에러 체크
        if (xml.includes('<errcode>')) {
            const errMsg = extractXmlValue(xml, 'errmsg');
            throw new Error(`API 오류: ${errMsg}`);
        }

        // 공연 목록 파싱
        const items = extractXmlItems(xml, 'db');
        console.log(`   ${items.length}개 공연 발견`);

        return items.map(item => ({
            mt20id: extractXmlValue(item, 'mt20id'),      // 공연ID
            prfnm: extractXmlValue(item, 'prfnm'),        // 공연명
            prfpdfrom: extractXmlValue(item, 'prfpdfrom'), // 공연시작일
            prfpdto: extractXmlValue(item, 'prfpdto'),     // 공연종료일
            fcltynm: extractXmlValue(item, 'fcltynm'),     // 공연시설명
            poster: extractXmlValue(item, 'poster'),       // 포스터 이미지
            genrenm: extractXmlValue(item, 'genrenm'),     // 장르명
            prfstate: extractXmlValue(item, 'prfstate'),   // 공연상태
            openrun: extractXmlValue(item, 'openrun'),     // 오픈런여부
            area: extractXmlValue(item, 'area')            // 지역
        }));
    } catch (error) {
        console.error('❌ API 호출 실패:', error.message);
        return [];
    }
}

/**
 * 공연 상세 정보 조회
 */
async function fetchPerformanceDetail(mt20id) {
    const url = `${DETAIL_URL}/${mt20id}?service=${API_KEY}`;

    try {
        const response = await fetch(url);
        const xml = await response.text();

        return {
            mt20id: extractXmlValue(xml, 'mt20id'),
            prfnm: extractXmlValue(xml, 'prfnm'),
            prfpdfrom: extractXmlValue(xml, 'prfpdfrom'),
            prfpdto: extractXmlValue(xml, 'prfpdto'),
            fcltynm: extractXmlValue(xml, 'fcltynm'),
            prfcast: extractXmlValue(xml, 'prfcast'),       // 출연진
            prfcrew: extractXmlValue(xml, 'prfcrew'),       // 제작진
            prfruntime: extractXmlValue(xml, 'prfruntime'), // 런타임
            prfage: extractXmlValue(xml, 'prfage'),         // 관람연령
            pcseguidance: extractXmlValue(xml, 'pcseguidance'), // 티켓가격
            poster: extractXmlValue(xml, 'poster'),
            sty: extractXmlValue(xml, 'sty'),               // 줄거리
            genrenm: extractXmlValue(xml, 'genrenm'),
            prfstate: extractXmlValue(xml, 'prfstate'),
            dtguidance: extractXmlValue(xml, 'dtguidance'), // 공연시간
            area: extractXmlValue(xml, 'area'),
            relates: extractXmlValue(xml, 'relates')        // 관련 URL
        };
    } catch (error) {
        console.error(`   상세정보 조회 실패 (${mt20id}):`, error.message);
        return null;
    }
}

/**
 * 지역명으로 지역코드 역변환
 */
function getRegionName(area) {
    if (!area) return '전국';
    // "서울특별시", "서울" 등에서 지역명 추출
    for (const [name, code] of Object.entries(REGION_CODES)) {
        if (area.includes(name)) {
            return name;
        }
    }
    return area.split(' ')[0] || '전국';
}

/**
 * KOPIS 데이터를 Firestore 형식으로 변환
 */
function transformData(item, detail = null) {
    const data = detail || item;

    return {
        title: data.prfnm || '공연명 없음',
        category: 'seminar',
        status: data.prfstate === '공연중' ? 'ongoing' : (data.prfstate === '공연예정' ? 'upcoming' : 'closed'),
        organization: data.fcltynm || '',
        region: getRegionName(data.area),
        supportField: data.genrenm || '공연',
        startDate: formatDate(data.prfpdfrom),
        endDate: formatDate(data.prfpdto),
        description: data.sty || `${data.genrenm || '공연'} - ${data.fcltynm || ''}`,
        targetAudience: data.prfage || '',
        applicationUrl: data.relates || `https://www.kopis.or.kr/por/db/pblprfr/pblprfrView.do?mt20Id=${data.mt20id}`,
        image: data.poster || '',
        ticketPrice: data.pcseguidance || '',
        runtime: data.prfruntime || '',
        showtime: data.dtguidance || '',
        cast: data.prfcast || '',
        views: 0,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
        source: 'kopis',
        kopisId: data.mt20id
    };
}

/**
 * Firestore에 저장
 */
async function saveToFirestore(posts) {
    if (posts.length === 0) {
        console.log('⚠️ 저장할 데이터가 없습니다.');
        return;
    }

    console.log(`\n💾 Firestore에 ${posts.length}개 데이터 저장 중...`);

    const collectionRef = db.collection('iuem');
    const batchSize = 400;

    for (let i = 0; i < posts.length; i += batchSize) {
        const batch = db.batch();
        const chunk = posts.slice(i, i + batchSize);

        for (let j = 0; j < chunk.length; j++) {
            const post = chunk[j];
            const docId = `kopis_${post.kopisId}`;
            const docRef = collectionRef.doc(docId);
            batch.set(docRef, post, { merge: true });
        }

        await batch.commit();
        console.log(`   배치 ${Math.floor(i / batchSize) + 1} 저장 완료 (${chunk.length}개)`);
    }

    console.log('✅ Firestore 저장 완료!');
}

/**
 * 메인 실행
 */
async function main() {
    console.log('🎭 KOPIS 공연정보 수집 시작\n');

    if (!API_KEY) {
        console.error('❌ .env 파일에 KOPIS_API_KEY를 입력해주세요!');
        process.exit(1);
    }

    try {
        // 오늘부터 3개월 후까지의 공연 조회
        const today = new Date();
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

        const stdate = today.toISOString().slice(0, 10).replace(/-/g, '');
        const eddate = threeMonthsLater.toISOString().slice(0, 10).replace(/-/g, '');

        console.log(`📅 조회 기간: ${stdate} ~ ${eddate}\n`);

        let allPerformances = [];
        let page = 1;
        const maxPages = 10; // 최대 10페이지 (1000개)

        // 공연 목록 조회
        while (page <= maxPages) {
            const performances = await fetchPerformances(stdate, eddate, page, 100);

            if (performances.length === 0) break;

            // 공연중 또는 공연예정인 것만 필터링
            const activePerformances = performances.filter(p =>
                p.prfstate === '공연중' || p.prfstate === '공연예정'
            );

            allPerformances = allPerformances.concat(activePerformances);
            console.log(`   활성 공연: ${activePerformances.length}개 (총 ${allPerformances.length}개)`);

            if (performances.length < 100) break;

            page++;
            // API 호출 간격
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (allPerformances.length === 0) {
            console.log('⚠️ 조회된 공연이 없습니다.');
            process.exit(0);
        }

        console.log(`\n📊 총 ${allPerformances.length}개 활성 공연 수집\n`);

        // 데이터 변환
        const posts = allPerformances.map(item => transformData(item));

        // Firestore에 저장
        await saveToFirestore(posts);

        console.log('\n✨ 완료!');
    } catch (error) {
        console.error('\n❌ 오류 발생:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

main();
