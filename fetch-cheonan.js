/**
 * 천안시 행사/공지 크롤링 스크립트
 *
 * 사용법: node fetch-cheonan.js
 *
 * 필요 패키지: npm install cheerio node-fetch
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
    notices: '/cop/bbs/BBSMSTR_000000000462/selectBoardList.do'       // 공지사항
};

/**
 * HTML에서 텍스트 추출 (간단한 파싱)
 */
function extractText(html, startTag, endTag) {
    const startIdx = html.indexOf(startTag);
    if (startIdx === -1) return '';
    const endIdx = html.indexOf(endTag, startIdx + startTag.length);
    if (endIdx === -1) return '';
    return html.substring(startIdx + startTag.length, endIdx).trim();
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
        // 일반적인 게시판 패턴: <td class="subject">...<a href="...">제목</a>...</td>
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
        for (let i = 0; i < Math.min(titles.length, 20); i++) {
            const item = titles[i];
            if (item.title.length < 5) continue; // 너무 짧은 제목 제외
            if (item.title.includes('이전') || item.title.includes('다음')) continue; // 페이징 링크 제외

            posts.push({
                title: item.title,
                category: category,
                status: 'ongoing',
                organization: '천안시',
                region: '천안',
                supportField: category === 'event' ? '행사·네트워크' : '공지사항',
                startDate: dates[i] ? dates[i].replace(/\./g, '-') : new Date().toISOString().split('T')[0],
                endDate: '',
                description: '',
                targetAudience: '',
                applicationUrl: item.url,
                views: 0,
                createdAt: new Date().toISOString().split('T')[0],
                updatedAt: new Date().toISOString(),
                source: 'cheonan-crawl'
            });
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

    console.log(`💾 Firestore에 ${posts.length}개 데이터 저장 중...`);

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
    console.log(`   ${events.length}개 행사 발견`);
    allPosts = allPosts.concat(events);

    // 주간행사계획 크롤링
    console.log('\n📋 주간행사계획 크롤링...');
    const weeklyEvents = await fetchBoardList(PAGES.weeklyEvents, 'event');
    console.log(`   ${weeklyEvents.length}개 주간행사 발견`);
    allPosts = allPosts.concat(weeklyEvents);

    // 공지사항 크롤링
    console.log('\n📢 공지사항 크롤링...');
    const notices = await fetchBoardList(PAGES.notices, 'notice');
    console.log(`   ${notices.length}개 공지사항 발견`);
    allPosts = allPosts.concat(notices);

    console.log(`\n📊 총 ${allPosts.length}개 데이터 수집 완료\n`);

    if (allPosts.length > 0) {
        await saveToFirestore(allPosts);
    }

    console.log('\n✨ 완료! 웹사이트를 새로고침하면 천안시 데이터가 표시됩니다.');
    process.exit(0);
}

main().catch(error => {
    console.error('❌ 오류:', error);
    process.exit(1);
});
