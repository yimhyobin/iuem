/**
 * 전국 지자체 행사/세미나 크롤링 스크립트
 *
 * 사용법: node fetch-events.js
 *
 * 천안시만이 아닌 전국 주요 광역시/도의 행사 정보를 수집합니다.
 */

const fs = require('fs');
require('dotenv').config();

// Firebase Admin SDK
const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// 전국 주요 지자체 행사 게시판 설정
const LOCAL_GOVERNMENTS = [
    // 충청남도
    {
        name: '천안시',
        region: '충남',
        baseUrl: 'http://www.cheonan.go.kr',
        pages: [
            { url: '/cop/bbs/BBSMSTR_000000002660/selectBoardList.do', type: 'event' },
            { url: '/cop/bbs/BBSMSTR_000000000473/selectBoardList.do', type: 'event' }
        ]
    },
    {
        name: '아산시',
        region: '충남',
        baseUrl: 'https://www.asan.go.kr',
        pages: [
            { url: '/main/culture/festival/festival.do', type: 'event' }
        ]
    },
    // 경기도
    {
        name: '수원시',
        region: '경기',
        baseUrl: 'https://www.suwon.go.kr',
        pages: [
            { url: '/web/board/BD_board.list.do?bbsCd=1042', type: 'event' }
        ]
    },
    {
        name: '성남시',
        region: '경기',
        baseUrl: 'https://www.seongnam.go.kr',
        pages: [
            { url: '/city/1000716/10561.do', type: 'event' }
        ]
    },
    {
        name: '고양시',
        region: '경기',
        baseUrl: 'https://www.goyang.go.kr',
        pages: [
            { url: '/www/www05/www05_1/www05_1_1.jsp', type: 'event' }
        ]
    },
    // 서울특별시
    {
        name: '서울시',
        region: '서울',
        baseUrl: 'https://www.seoul.go.kr',
        pages: [
            { url: '/news/news_report.do', type: 'event' }
        ]
    },
    // 부산광역시
    {
        name: '부산시',
        region: '부산',
        baseUrl: 'https://www.busan.go.kr',
        pages: [
            { url: '/depart/contents.do?menuNo=200000000020', type: 'event' }
        ]
    },
    // 대구광역시
    {
        name: '대구시',
        region: '대구',
        baseUrl: 'https://www.daegu.go.kr',
        pages: [
            { url: '/intro.htm', type: 'event' }
        ]
    },
    // 인천광역시
    {
        name: '인천시',
        region: '인천',
        baseUrl: 'https://www.incheon.go.kr',
        pages: [
            { url: '/IC010205', type: 'event' }
        ]
    },
    // 광주광역시
    {
        name: '광주시',
        region: '광주',
        baseUrl: 'https://www.gwangju.go.kr',
        pages: [
            { url: '/contentsView.do?menuId=gwangju0501010000', type: 'event' }
        ]
    },
    // 대전광역시
    {
        name: '대전시',
        region: '대전',
        baseUrl: 'https://www.daejeon.go.kr',
        pages: [
            { url: '/drh/index.do', type: 'event' }
        ]
    },
    // 울산광역시
    {
        name: '울산시',
        region: '울산',
        baseUrl: 'https://www.ulsan.go.kr',
        pages: [
            { url: '/u/rep/main.ulsan', type: 'event' }
        ]
    },
    // 세종시
    {
        name: '세종시',
        region: '세종',
        baseUrl: 'https://www.sejong.go.kr',
        pages: [
            { url: '/prog/tursmCal/tur/sub01_02_02/M0101020202/calendar.do', type: 'event' }
        ]
    },
    // 강원도
    {
        name: '춘천시',
        region: '강원',
        baseUrl: 'https://www.chuncheon.go.kr',
        pages: [
            { url: '/tour/sub05_01.html', type: 'event' }
        ]
    },
    {
        name: '강릉시',
        region: '강원',
        baseUrl: 'https://www.gn.go.kr',
        pages: [
            { url: '/bbs/tour/127/lst', type: 'event' }
        ]
    },
    // 충청북도
    {
        name: '청주시',
        region: '충북',
        baseUrl: 'https://www.cheongju.go.kr',
        pages: [
            { url: '/tour/contents.do?key=19050', type: 'event' }
        ]
    },
    // 전북특별자치도
    {
        name: '전주시',
        region: '전북',
        baseUrl: 'https://www.jeonju.go.kr',
        pages: [
            { url: '/index.9is?contentUid=9be517a74f8dee91014f92fd7f7401c8', type: 'event' }
        ]
    },
    // 전라남도
    {
        name: '여수시',
        region: '전남',
        baseUrl: 'https://www.yeosu.go.kr',
        pages: [
            { url: '/tour/menu01/sub02/sub03_1.yeosu', type: 'event' }
        ]
    },
    // 경상북도
    {
        name: '포항시',
        region: '경북',
        baseUrl: 'https://www.pohang.go.kr',
        pages: [
            { url: '/pohang/festival.do', type: 'event' }
        ]
    },
    {
        name: '경주시',
        region: '경북',
        baseUrl: 'https://www.gyeongju.go.kr',
        pages: [
            { url: '/tour/page.do?mnu_uid=2213&', type: 'event' }
        ]
    },
    // 경상남도
    {
        name: '창원시',
        region: '경남',
        baseUrl: 'https://www.changwon.go.kr',
        pages: [
            { url: '/depart/contents.do?mId=0401070000', type: 'event' }
        ]
    },
    // 제주도
    {
        name: '제주시',
        region: '제주',
        baseUrl: 'https://www.jejusi.go.kr',
        pages: [
            { url: '/tour/index.htm', type: 'event' }
        ]
    }
];

/**
 * 상세 페이지에서 이미지와 내용 추출
 */
async function fetchDetailPage(url, baseUrl) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) return { images: [], content: '' };

        const html = await response.text();

        // 이미지 URL 추출
        const images = [];
        const imgPattern = /<img[^>]*src="([^"]+)"[^>]*>/gi;
        let imgMatch;
        while ((imgMatch = imgPattern.exec(html)) !== null) {
            let imgUrl = imgMatch[1];
            if (imgUrl.startsWith('/')) {
                imgUrl = `${baseUrl}${imgUrl}`;
            }
            // 실제 콘텐츠 이미지만 (아이콘, 버튼, 로고 제외)
            if ((imgUrl.includes('.jpg') || imgUrl.includes('.jpeg') ||
                 imgUrl.includes('.png') || imgUrl.includes('.gif')) &&
                !imgUrl.includes('icon') && !imgUrl.includes('btn') &&
                !imgUrl.includes('logo') && !imgUrl.includes('/img/sub') &&
                !imgUrl.includes('/common/')) {
                images.push(imgUrl);
            }
        }

        // 본문 내용 추출 (여러 패턴 시도)
        let content = '';
        const contentPatterns = [
            /<div[^>]*class="[^"]*view_con[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*class="[^"]*board_view[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<td[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/td>/i,
            /<div[^>]*class="[^"]*cont[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        ];

        for (const pattern of contentPatterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                content = match[1]
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/p>/gi, '\n')
                    .replace(/<[^>]+>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (content.length > 50) break;
            }
        }

        return { images, content: content.substring(0, 1000) };
    } catch (error) {
        return { images: [], content: '' };
    }
}

/**
 * 게시판 목록 페이지 크롤링
 */
async function fetchBoardList(gov, pageInfo) {
    const url = `${gov.baseUrl}${pageInfo.url}`;
    console.log(`   ${gov.name}: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 10000
        });

        if (!response.ok) {
            console.log(`   ${gov.name}: HTTP 오류 ${response.status}`);
            return [];
        }

        const html = await response.text();
        const posts = [];

        // 게시글 목록 파싱 (정규식 사용)
        const titleRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
        const dateRegex = /\d{4}-\d{2}-\d{2}|\d{4}\.\d{2}\.\d{2}/g;

        // 제외할 키워드 (행사/세미나와 무관한 항목)
        const excludeKeywords = [
            '신청', '예약', '문의', '민원', '등록', '접수',
            '차량', '시험', '고시', '공고', '입법예고',
            'FAQ', '자주묻는', '서식', '양식', '안내문',
            '모집', '채용', '구인', '입찰', '계약',
            '결과발표', '합격자', '당첨자', '선정자'
        ];

        // 포함해야 할 키워드 (행사/세미나 관련)
        const includeKeywords = [
            '행사', '세미나', '축제', '공연', '전시', '페스티벌',
            '콘서트', '포럼', '컨퍼런스', '워크숍', '워크샵',
            '강연', '특강', '강좌', '프로그램', '대회', '마라톤',
            '페어', '박람회', '엑스포', '쇼', '이벤트', '문화',
            '체험', '투어', '여행', '관광', '캠프', '캠페인'
        ];

        let match;
        const titles = [];
        while ((match = titleRegex.exec(html)) !== null) {
            const href = match[1];
            const title = match[2].trim();

            // 제외 키워드 체크
            const hasExcludeKeyword = excludeKeywords.some(kw => title.includes(kw));
            // 포함 키워드 체크 (하나라도 있으면 OK)
            const hasIncludeKeyword = includeKeywords.some(kw => title.includes(kw));

            // 게시글 링크 필터링
            if ((href.includes('view') || href.includes('View') ||
                 href.includes('article') || href.includes('nttId=') ||
                 href.includes('seq=') || href.includes('idx=') ||
                 href.includes('boardSeq=') || href.includes('contentUid=')) &&
                title.length > 5 &&
                !title.includes('이전') && !title.includes('다음') &&
                !title.includes('목록') && !title.includes('검색') &&
                !hasExcludeKeyword &&
                hasIncludeKeyword) {
                titles.push({
                    url: href.startsWith('http') ? href : `${gov.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`,
                    title: title.replace(/\s+/g, ' ').trim()
                });
            }
        }

        // 날짜 추출
        const dates = html.match(dateRegex) || [];

        // 게시글 데이터 생성 (최대 10개)
        for (let i = 0; i < Math.min(titles.length, 10); i++) {
            const item = titles[i];

            // 중복 방지를 위한 유니크한 제목 체크
            if (posts.some(p => p.title === item.title)) continue;

            // 상세 페이지에서 이미지와 내용 가져오기 (선택적)
            let detail = { images: [], content: '' };
            try {
                detail = await fetchDetailPage(item.url, gov.baseUrl);
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (e) {
                // 상세 페이지 실패해도 계속 진행
            }

            posts.push({
                title: item.title,
                category: 'event',
                status: 'ongoing',
                organization: gov.name,
                region: gov.region,
                supportField: '행사·네트워크',
                startDate: dates[i] ? dates[i].replace(/\./g, '-') : new Date().toISOString().split('T')[0],
                endDate: '',
                description: detail.content || `${gov.name} 행사/세미나 정보`,
                targetAudience: '',
                applicationUrl: item.url,
                image: detail.images[0] || '',
                images: detail.images,
                views: 0,
                createdAt: new Date().toISOString().split('T')[0],
                updatedAt: new Date().toISOString(),
                source: 'local-gov-crawl'
            });
        }

        return posts;
    } catch (error) {
        console.log(`   ${gov.name}: 크롤링 실패 - ${error.message}`);
        return [];
    }
}

/**
 * Firestore에 저장
 */
async function saveToFirestore(posts) {
    if (posts.length === 0) {
        console.log('저장할 데이터가 없습니다.');
        return;
    }

    console.log(`\nFirestore에 ${posts.length}개 데이터 저장 중...`);

    const collectionRef = db.collection('iuem');
    const batchSize = 400;

    for (let i = 0; i < posts.length; i += batchSize) {
        const batch = db.batch();
        const chunk = posts.slice(i, i + batchSize);

        for (let j = 0; j < chunk.length; j++) {
            const post = chunk[j];
            const safeTitle = post.title.replace(/[^a-zA-Z0-9가-힣]/g, '').slice(0, 30);
            const safeOrg = post.organization.replace(/[^a-zA-Z0-9가-힣]/g, '');
            const docId = `localgov_${safeOrg}_${i + j}_${safeTitle}`;
            const docRef = collectionRef.doc(docId);
            batch.set(docRef, post, { merge: true });
        }

        await batch.commit();
        console.log(`   배치 ${Math.floor(i / batchSize) + 1} 저장 완료 (${chunk.length}개)`);
    }

    console.log('Firestore 저장 완료!');
}

/**
 * 메인 실행
 */
async function main() {
    console.log('='.repeat(60));
    console.log('전국 지자체 행사/세미나 크롤링');
    console.log('='.repeat(60));
    console.log(`대상 지자체: ${LOCAL_GOVERNMENTS.length}개\n`);

    let allPosts = [];
    let successCount = 0;
    let failCount = 0;

    for (const gov of LOCAL_GOVERNMENTS) {
        console.log(`\n[${gov.region}] ${gov.name} 크롤링 중...`);

        for (const pageInfo of gov.pages) {
            try {
                const posts = await fetchBoardList(gov, pageInfo);
                if (posts.length > 0) {
                    console.log(`   -> ${posts.length}개 행사 발견`);
                    allPosts = allPosts.concat(posts);
                    successCount++;
                } else {
                    console.log(`   -> 행사 없음`);
                }
            } catch (error) {
                console.log(`   -> 실패: ${error.message}`);
                failCount++;
            }

            // API 호출 간격
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`크롤링 결과:`);
    console.log(`   성공: ${successCount}개 사이트`);
    console.log(`   실패: ${failCount}개 사이트`);
    console.log(`   총 수집: ${allPosts.length}개 행사`);
    console.log('='.repeat(60));

    if (allPosts.length > 0) {
        await saveToFirestore(allPosts);
    }

    console.log('\n완료!');
    process.exit(0);
}

main().catch(error => {
    console.error('오류:', error);
    process.exit(1);
});
