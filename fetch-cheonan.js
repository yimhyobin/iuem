/**
 * 천안시 행사/공지 크롤링 스크립트
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
 * 상세 페이지에서 이미지와 내용 추출
 */
async function fetchDetailPage(url) {
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
                imgUrl = `${BASE_URL}${imgUrl}`;
            }
            // 실제 콘텐츠 이미지만 (아이콘, 버튼, 로고 제외)
            if ((imgUrl.includes('.jpg') || imgUrl.includes('.jpeg') ||
                 imgUrl.includes('.png') || imgUrl.includes('.gif')) &&
                !imgUrl.includes('icon') && !imgUrl.includes('btn') &&
                !imgUrl.includes('logo') && !imgUrl.includes('img/sub')) {
                images.push(imgUrl);
            }
        }

        // 본문 내용 추출 (여러 패턴 시도)
        let content = '';
        const contentPatterns = [
            /<div[^>]*class="[^"]*view_con[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<td[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/td>/i,
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
async function fetchBoardList(pageUrl, category) {
    const url = `${BASE_URL}${pageUrl}`;
    console.log(`📡 크롤링 중: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP 오류: ${response.status}`);
        }

        const html = await response.text();
        const posts = [];

        // 게시글 목록 파싱 (정규식 사용)
        const titleRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
        const dateRegex = /\d{4}-\d{2}-\d{2}|\d{4}\.\d{2}\.\d{2}/g;

        let match;
        const titles = [];
        while ((match = titleRegex.exec(html)) !== null) {
            const href = match[1];
            const title = match[2].trim();

            // 게시글 링크만 필터링 (selectBoardArticle 포함)
            if (href.includes('selectBoardArticle') || href.includes('nttId=')) {
                titles.push({
                    url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
                    title: title
                });
            }
        }

        // 날짜 추출
        const dates = html.match(dateRegex) || [];

        // 게시글 데이터 생성
        for (let i = 0; i < Math.min(titles.length, 15); i++) {
            const item = titles[i];
            if (item.title.length < 5) continue;
            if (item.title.includes('이전') || item.title.includes('다음')) continue;

            console.log(`   [${i + 1}] ${item.title.substring(0, 40)}...`);

            // 상세 페이지에서 이미지와 내용 가져오기
            const detail = await fetchDetailPage(item.url);

            posts.push({
                title: item.title,
                category: category,
                status: 'ongoing',
                organization: '천안시',
                region: '충남',
                supportField: category === 'event' ? '행사·네트워크' : '공지사항',
                startDate: dates[i] ? dates[i].replace(/\./g, '-') : new Date().toISOString().split('T')[0],
                endDate: '',
                description: detail.content,
                targetAudience: '',
                applicationUrl: item.url,
                image: detail.images[0] || '',
                images: detail.images,
                views: 0,
                createdAt: new Date().toISOString().split('T')[0],
                updatedAt: new Date().toISOString(),
                source: 'cheonan-crawl'
            });

            // API 호출 간격
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        return posts;
    } catch (error) {
        console.error(`❌ 크롤링 실패 (${pageUrl}):`, error.message);
        return [];
    }
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
        const docId = `cheonan_${index}_${safeTitle}`;
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
    console.log('🏛️ 천안시 행사/공지 크롤링 시작\n');

    let allPosts = [];

    // 행사캘린더 크롤링
    console.log('\n📅 행사캘린더 크롤링...');
    const events = await fetchBoardList(PAGES.events, 'event');
    console.log(`   → ${events.length}개 행사 발견`);
    allPosts = allPosts.concat(events);

    // 주간행사계획 크롤링
    console.log('\n📋 주간행사계획 크롤링...');
    const weeklyEvents = await fetchBoardList(PAGES.weeklyEvents, 'event');
    console.log(`   → ${weeklyEvents.length}개 주간행사 발견`);
    allPosts = allPosts.concat(weeklyEvents);

    console.log(`\n📊 총 ${allPosts.length}개 데이터 수집 완료`);

    if (allPosts.length > 0) {
        await saveToFirestore(allPosts);
    }

    console.log('\n✨ 완료!');
    process.exit(0);
}

main().catch(error => {
    console.error('❌ 오류:', error);
    process.exit(1);
});
