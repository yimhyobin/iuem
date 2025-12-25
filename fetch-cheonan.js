/**
 * 천안시 행사/공지 크롤링 스크립트 (상세 내용 포함)
 *
 * 사용법: node fetch-cheonan.js
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

// 천안시 URL 설정
const BASE_URL = 'http://www.cheonan.go.kr';
const PAGES = {
    events: '/cop/bbs/BBSMSTR_000000002660/selectBoardList.do',      // 행사캘린더
    weeklyEvents: '/cop/bbs/BBSMSTR_000000000473/selectBoardList.do', // 주간행사계획
};

/**
 * 페이지 HTML 가져오기
 */
async function fetchPage(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (error) {
        console.error(`   페이지 로드 실패: ${url}`, error.message);
        return null;
    }
}

/**
 * 게시글 목록에서 링크 추출
 */
function extractArticleLinks(html) {
    const links = [];

    // 다양한 패턴으로 게시글 링크 찾기
    const patterns = [
        /href="([^"]*selectBoardArticle[^"]*)"/gi,
        /href="([^"]*nttId=[^"]*)"/gi,
        /onclick="[^"]*fn_detail\(['"]*(\d+)['"]*\)[^"]*"/gi
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            let url = match[1];
            if (!url.startsWith('http')) {
                url = `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
            }
            if (!links.includes(url)) {
                links.push(url);
            }
        }
    }

    return links.slice(0, 15); // 최대 15개
}

/**
 * 상세 페이지에서 정보 추출
 */
function extractArticleDetail(html, url) {
    const article = {
        title: '',
        content: '',
        date: '',
        images: [],
        attachments: []
    };

    // 제목 추출
    const titlePatterns = [
        /<h[1-4][^>]*class="[^"]*tit[^"]*"[^>]*>([^<]+)</i,
        /<th[^>]*>제목<\/th>\s*<td[^>]*>([^<]+)</i,
        /<div[^>]*class="[^"]*subject[^"]*"[^>]*>([^<]+)</i,
        /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</i,
        /<td[^>]*class="[^"]*subject[^"]*"[^>]*>([^<]+)</i
    ];

    for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match) {
            article.title = match[1].trim().replace(/\s+/g, ' ');
            break;
        }
    }

    // 본문 내용 추출
    const contentPatterns = [
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*view_con[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<td[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/td>/i,
        /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    ];

    for (const pattern of contentPatterns) {
        const match = html.match(pattern);
        if (match) {
            // HTML 태그 제거하고 텍스트만 추출
            let content = match[1]
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/\n\s*\n/g, '\n')
                .trim();

            if (content.length > 50) {
                article.content = content.substring(0, 2000); // 최대 2000자
                break;
            }
        }
    }

    // 날짜 추출
    const datePatterns = [
        /(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/,
        /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/
    ];

    for (const pattern of datePatterns) {
        const match = html.match(pattern);
        if (match) {
            const year = match[1];
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            article.date = `${year}-${month}-${day}`;
            break;
        }
    }

    // 이미지 URL 추출
    const imgPattern = /<img[^>]*src="([^"]+)"[^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgPattern.exec(html)) !== null) {
        let imgUrl = imgMatch[1];
        // 상대 경로를 절대 경로로
        if (imgUrl.startsWith('/')) {
            imgUrl = `${BASE_URL}${imgUrl}`;
        }
        // 유효한 이미지 URL만 추가
        if (imgUrl.includes('.jpg') || imgUrl.includes('.jpeg') ||
            imgUrl.includes('.png') || imgUrl.includes('.gif')) {
            if (!imgUrl.includes('icon') && !imgUrl.includes('btn') && !imgUrl.includes('logo')) {
                article.images.push(imgUrl);
            }
        }
    }

    return article;
}

/**
 * 게시판 크롤링 (목록 + 상세)
 */
async function crawlBoard(pageUrl, category) {
    console.log(`\n📋 게시판 크롤링: ${pageUrl}`);

    // 1. 목록 페이지 가져오기
    const listHtml = await fetchPage(`${BASE_URL}${pageUrl}`);
    if (!listHtml) return [];

    // 2. 게시글 링크 추출
    const links = extractArticleLinks(listHtml);
    console.log(`   발견된 게시글: ${links.length}개`);

    if (links.length === 0) {
        // 링크를 못 찾으면 목록에서 직접 정보 추출 시도
        console.log('   링크를 찾지 못해 목록에서 직접 추출 시도...');
        return extractFromList(listHtml, category);
    }

    // 3. 각 게시글 상세 페이지 방문
    const posts = [];
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        console.log(`   [${i + 1}/${links.length}] 상세 페이지 크롤링...`);

        const detailHtml = await fetchPage(link);
        if (!detailHtml) continue;

        const detail = extractArticleDetail(detailHtml, link);

        if (detail.title && detail.title.length > 3) {
            posts.push({
                title: detail.title,
                category: category,
                status: 'ongoing',
                organization: '천안시',
                region: '충남',
                supportField: category === 'event' ? '행사·네트워크' : '공지사항',
                startDate: detail.date || new Date().toISOString().split('T')[0],
                endDate: '',
                description: detail.content || '',
                targetAudience: '',
                applicationUrl: link,
                image: detail.images[0] || '',
                images: detail.images,
                views: 0,
                createdAt: new Date().toISOString().split('T')[0],
                updatedAt: new Date().toISOString(),
                source: 'cheonan-crawl'
            });

            console.log(`      ✓ "${detail.title.substring(0, 30)}..." (이미지: ${detail.images.length}개)`);
        }

        // API 호출 간격
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return posts;
}

/**
 * 목록에서 직접 정보 추출 (링크를 못 찾을 경우)
 */
function extractFromList(html, category) {
    const posts = [];

    // 테이블 행에서 정보 추출
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let count = 0;

    while ((rowMatch = rowPattern.exec(html)) !== null && count < 15) {
        const row = rowMatch[1];

        // 제목 추출
        const titleMatch = row.match(/<a[^>]*>([^<]+)<\/a>/i) ||
                          row.match(/<td[^>]*class="[^"]*subject[^"]*"[^>]*>([^<]+)/i);

        if (titleMatch) {
            const title = titleMatch[1].trim();
            if (title.length > 5 && !title.includes('이전') && !title.includes('다음')) {
                // 날짜 추출
                const dateMatch = row.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})/);
                const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` :
                            new Date().toISOString().split('T')[0];

                posts.push({
                    title: title,
                    category: category,
                    status: 'ongoing',
                    organization: '천안시',
                    region: '충남',
                    supportField: category === 'event' ? '행사·네트워크' : '공지사항',
                    startDate: date,
                    endDate: '',
                    description: '',
                    targetAudience: '',
                    applicationUrl: `${BASE_URL}`,
                    views: 0,
                    createdAt: new Date().toISOString().split('T')[0],
                    updatedAt: new Date().toISOString(),
                    source: 'cheonan-crawl'
                });

                count++;
            }
        }
    }

    return posts;
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
    const batch = db.batch();

    posts.forEach((post, index) => {
        const safeTitle = post.title.replace(/[^a-zA-Z0-9가-힣]/g, '').slice(0, 30);
        const docId = `cheonan_${Date.now()}_${index}_${safeTitle}`;
        const docRef = collectionRef.doc(docId);
        batch.set(docRef, post, { merge: true });
    });

    await batch.commit();
    console.log('✅ Firestore 저장 완료!');
}

/**
 * 메인 실행
 */
async function main() {
    console.log('🏛️ 천안시 행사/공지 크롤링 시작 (상세 내용 포함)\n');
    console.log('=' .repeat(50));

    let allPosts = [];

    // 행사캘린더 크롤링
    const events = await crawlBoard(PAGES.events, 'event');
    console.log(`\n   → 행사캘린더: ${events.length}개 수집`);
    allPosts = allPosts.concat(events);

    // 주간행사계획 크롤링
    const weeklyEvents = await crawlBoard(PAGES.weeklyEvents, 'event');
    console.log(`\n   → 주간행사계획: ${weeklyEvents.length}개 수집`);
    allPosts = allPosts.concat(weeklyEvents);

    console.log('\n' + '='.repeat(50));
    console.log(`📊 총 ${allPosts.length}개 데이터 수집 완료`);

    if (allPosts.length > 0) {
        // 수집된 데이터 미리보기
        console.log('\n📝 수집된 데이터 미리보기:');
        allPosts.slice(0, 3).forEach((post, i) => {
            console.log(`\n[${i + 1}] ${post.title}`);
            console.log(`    날짜: ${post.startDate}`);
            console.log(`    내용: ${post.description.substring(0, 100)}...`);
            console.log(`    이미지: ${post.images?.length || 0}개`);
        });

        await saveToFirestore(allPosts);
    }

    console.log('\n✨ 완료! 웹사이트를 새로고침하면 천안시 데이터가 표시됩니다.');
    process.exit(0);
}

main().catch(error => {
    console.error('❌ 오류:', error);
    process.exit(1);
});
