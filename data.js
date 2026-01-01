/**
 * 데이터 관리 모듈
 * Firebase Firestore를 사용하여 데이터를 저장하고 관리합니다.
 */

const DataManager = {
    samplePosts: [
        {
            id: '1',
            category: 'support',
            status: 'ongoing',
            title: '2025년 창업성장기술개발사업 시행계획 공고',
            organization: '중소벤처기업부',
            department: '중소벤처기업부',
            region: '전국',
            supportField: '사업화',
            target: '일반기업',
            age: '',
            career: '1년 ~ 3년 미만',
            startDate: '2025-01-02',
            endDate: '2025-02-28',
            summary: '창업기업의 기술개발 역량 강화를 위한 지원사업입니다.',
            content: '창업성장기술개발사업은 창업기업의 기술개발 역량 강화를 위해 R&D 자금을 지원하는 사업입니다.',
            link: 'https://www.k-startup.go.kr',
            image: null,
            createdAt: '2025-01-02',
            updatedAt: '2025-01-02'
        },
        {
            id: '2',
            category: 'support',
            status: 'ongoing',
            title: '2025년 예비창업패키지 참여자 모집 공고',
            organization: '창업진흥원',
            department: '중소벤처기업부',
            region: '서울',
            supportField: '멘토링·컨설팅·교육',
            target: '일반인',
            age: '만 20세 ~ 29세',
            career: '예비창업자',
            startDate: '2025-01-15',
            endDate: '2025-03-15',
            summary: '예비창업자를 위한 종합 창업 지원 프로그램입니다.',
            content: '예비창업패키지는 혁신적인 기술 창업 아이디어를 보유한 예비창업자의 원활한 창업 사업화를 위해 사업화 자금, 창업교육, 멘토링 등을 지원합니다.',
            link: 'https://www.k-startup.go.kr',
            image: null,
            createdAt: '2025-01-10',
            updatedAt: '2025-01-10'
        },
        {
            id: '3',
            category: 'support',
            status: 'upcoming',
            title: '2025년 글로벌 스타트업 육성 프로그램',
            organization: 'KOTRA',
            department: '산업통상자원부',
            region: '전국',
            supportField: '글로벌',
            target: '일반기업',
            age: '',
            career: '3년 ~ 5년 미만',
            startDate: '2025-02-01',
            endDate: '2025-03-31',
            summary: '해외 진출을 희망하는 스타트업을 위한 프로그램입니다.',
            content: '글로벌 스타트업 육성 프로그램은 해외 진출을 희망하는 스타트업에게 해외 시장 조사, 바이어 매칭, 현지화 컨설팅 등을 지원합니다.',
            link: 'https://www.kotra.or.kr',
            image: null,
            createdAt: '2025-01-05',
            updatedAt: '2025-01-05'
        },
        {
            id: '4',
            category: 'event',
            status: 'ongoing',
            title: '2025 스타트업 네트워킹 페스티벌',
            organization: '창업진흥원',
            department: '중소벤처기업부',
            region: '서울',
            supportField: '행사·네트워크',
            target: '일반기업',
            age: '',
            career: '',
            startDate: '2025-02-10',
            endDate: '2025-02-12',
            summary: '스타트업과 투자자가 만나는 대규모 네트워킹 행사입니다.',
            content: '스타트업 네트워킹 페스티벌은 혁신 스타트업과 투자자, 대기업이 만나 협력 기회를 모색하는 대규모 행사입니다.',
            link: '',
            image: null,
            createdAt: '2025-01-08',
            updatedAt: '2025-01-08'
        },
        {
            id: '5',
            category: 'notice',
            status: 'ongoing',
            title: '창업지원 포털 시스템 점검 안내',
            organization: '',
            department: '',
            region: '',
            supportField: '',
            target: '',
            age: '',
            career: '',
            startDate: '',
            endDate: '',
            summary: '시스템 점검으로 인한 서비스 일시 중단 안내입니다.',
            content: '보다 나은 서비스 제공을 위해 시스템 점검을 실시합니다. 점검 시간: 2025년 1월 25일 02:00 ~ 06:00',
            link: '',
            image: null,
            createdAt: '2025-01-20',
            updatedAt: '2025-01-20'
        }
    ],

    init: async function() {
        try {
            const snapshot = await db.collection('iuem').limit(1).get();
            if (snapshot.empty) {
                const batch = db.batch();
                this.samplePosts.forEach(post => {
                    const docRef = db.collection('iuem').doc(post.id);
                    batch.set(docRef, post);
                });
                await batch.commit();
                console.log('샘플 데이터 초기화 완료');
            }
        } catch (error) {
            console.error('데이터 초기화 오류:', error);
        }
    },

    getAllPosts: async function(limit = 200) {
        try {
            // limit 적용하여 가져오기
            const snapshot = await db.collection('iuem').limit(limit).get();
            // 게시글만 필터링 (category 필드가 있는 문서만)
            const posts = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(doc => doc.category);
            // 클라이언트에서 정렬
            posts.sort((a, b) => {
                const dateA = new Date(b.createdAt || '1970-01-01');
                const dateB = new Date(a.createdAt || '1970-01-01');
                return dateA - dateB;
            });
            return posts;
        } catch (error) {
            console.error('게시글 조회 오류:', error);
            return [];
        }
    },

    getPostsByCategory: async function(category, limit = 30) {
        try {
            let query = db.collection('iuem');
            if (category !== 'all') {
                query = query.where('category', '==', category);
            }
            query = query.limit(limit);
            const snapshot = await query.get();
            // 게시글만 필터링 (category 필드가 있는 문서만)
            const posts = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(doc => doc.category);
            // 클라이언트에서 정렬
            posts.sort((a, b) => {
                const dateA = new Date(b.createdAt || '1970-01-01');
                const dateB = new Date(a.createdAt || '1970-01-01');
                return dateA - dateB;
            });
            return posts;
        } catch (error) {
            console.error('카테고리별 조회 오류:', error);
            return [];
        }
    },

    getPost: async function(id) {
        try {
            const doc = await db.collection('iuem').doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('게시글 조회 오류:', error);
            return null;
        }
    },

    addPost: async function(postData) {
        try {
            const newPost = {
                ...postData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            const docRef = await db.collection('iuem').add(newPost);
            return { success: true, message: '게시글이 등록되었습니다.', post: { id: docRef.id, ...newPost } };
        } catch (error) {
            console.error('게시글 등록 오류:', error);
            return { success: false, message: '게시글 등록에 실패했습니다.' };
        }
    },

    updatePost: async function(id, postData) {
        try {
            await db.collection('iuem').doc(id).update({
                ...postData,
                updatedAt: new Date().toISOString()
            });
            return { success: true, message: '게시글이 수정되었습니다.' };
        } catch (error) {
            console.error('게시글 수정 오류:', error);
            return { success: false, message: '게시글 수정에 실패했습니다.' };
        }
    },

    deletePost: async function(id) {
        try {
            await db.collection('iuem').doc(id).delete();
            return { success: true, message: '게시글이 삭제되었습니다.' };
        } catch (error) {
            console.error('게시글 삭제 오류:', error);
            return { success: false, message: '게시글 삭제에 실패했습니다.' };
        }
    },

    deletePosts: async function(ids) {
        try {
            const batch = db.batch();
            ids.forEach(id => {
                const docRef = db.collection('iuem').doc(id);
                batch.delete(docRef);
            });
            await batch.commit();
            return { success: true, message: ids.length + '개의 게시글이 삭제되었습니다.' };
        } catch (error) {
            console.error('게시글 삭제 오류:', error);
            return { success: false, message: '게시글 삭제에 실패했습니다.' };
        }
    },

    searchPosts: async function(filters, limit = 300) {
        try {
            let posts = [];

            // 카테고리별로 Firestore에서 직접 쿼리
            if (filters.category && filters.category !== 'all') {
                let firestoreCategory = filters.category;

                // support/education은 Firestore에서 'support' 카테고리
                if (filters.category === 'support' || filters.category === 'education') {
                    firestoreCategory = 'support';
                }
                // seminar/festival은 Firestore에서 'event' 카테고리
                else if (filters.category === 'seminar' || filters.category === 'festival') {
                    firestoreCategory = 'event';
                }

                const snapshot = await db.collection('iuem')
                    .where('category', '==', firestoreCategory)
                    .limit(limit)
                    .get();
                posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // 클라이언트에서 세부 필터링
                switch (filters.category) {
                    case 'support':
                        posts = posts.filter(post => !isEducationField(post.supportField));
                        break;
                    case 'education':
                        posts = posts.filter(post => isEducationField(post.supportField));
                        break;
                    case 'seminar':
                        posts = posts.filter(post => post.source !== 'tour-api');
                        break;
                    case 'festival':
                        posts = posts.filter(post => post.source === 'tour-api');
                        break;
                }
            } else {
                posts = await this.getAllPosts(limit);
            }

            if (filters.keyword) {
                const keyword = filters.keyword.toLowerCase();
                posts = posts.filter(post =>
                    post.title.toLowerCase().includes(keyword) ||
                    (post.summary && post.summary.toLowerCase().includes(keyword)) ||
                    (post.content && post.content.toLowerCase().includes(keyword))
                );
            }

            if (filters.regions && filters.regions.length > 0) {
                posts = posts.filter(post => filters.regions.includes(post.region));
            }

            if (filters.supportFields && filters.supportFields.length > 0) {
                posts = posts.filter(post => filters.supportFields.includes(post.supportField));
            }

            if (filters.targets && filters.targets.length > 0) {
                posts = posts.filter(post => filters.targets.includes(post.target));
            }

            if (filters.ages && filters.ages.length > 0) {
                posts = posts.filter(post => filters.ages.includes(post.age));
            }

            if (filters.careers && filters.careers.length > 0) {
                posts = posts.filter(post => filters.careers.includes(post.career));
            }

            if (filters.sort) {
                switch (filters.sort) {
                    case 'latest':
                        posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        break;
                    case 'startDate':
                        posts.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                        break;
                    case 'endDate':
                        posts.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
                        break;
                }
            }

            return posts;
        } catch (error) {
            console.error('검색 오류:', error);
            return [];
        }
    }
};

const CategoryMap = {
    'support': '지원사업',
    'education': '교육',
    'seminar': '행사/세미나',
    'festival': '축제',
    'event': '행사/축제',  // 하위호환
    'notice': '공지사항'
};

// 교육 관련 키워드 (포함 여부로 체크)
const EducationKeywords = ['교육', '멘토링', '컨설팅', '멘토', '코칭', '아카데미', '캠프'];

// 교육 분야인지 확인
function isEducationField(supportField) {
    if (!supportField) return false;
    return EducationKeywords.some(keyword => supportField.includes(keyword));
}

const StatusMap = {
    'ongoing': '진행중',
    'upcoming': '접수예정',
    'closed': '마감'
};
