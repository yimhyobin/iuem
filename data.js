/**
 * 데이터 관리 모듈
 * localStorage를 사용하여 데이터를 저장하고 관리합니다.
 * 나중에 API 연동 시 이 부분을 수정하면 됩니다.
 */

const DataManager = {
    // 초기 샘플 데이터
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

    // 데이터 초기화
    init: function() {
        if (!localStorage.getItem('posts')) {
            localStorage.setItem('posts', JSON.stringify(this.samplePosts));
        }
    },

    // 모든 게시글 가져오기
    getAllPosts: function() {
        this.init();
        return JSON.parse(localStorage.getItem('posts')) || [];
    },

    // 카테고리별 게시글 가져오기
    getPostsByCategory: function(category) {
        const posts = this.getAllPosts();
        if (category === 'all') return posts;
        return posts.filter(post => post.category === category);
    },

    // 단일 게시글 가져오기
    getPost: function(id) {
        const posts = this.getAllPosts();
        return posts.find(post => post.id === id);
    },

    // 게시글 추가
    addPost: function(postData) {
        try {
            const posts = this.getAllPosts();
            const newPost = {
                ...postData,
                id: Date.now().toString(),
                createdAt: new Date().toISOString().split('T')[0],
                updatedAt: new Date().toISOString().split('T')[0]
            };
            posts.unshift(newPost);
            localStorage.setItem('posts', JSON.stringify(posts));
            return { success: true, message: '게시글이 등록되었습니다.', post: newPost };
        } catch (error) {
            return { success: false, message: '게시글 등록에 실패했습니다.' };
        }
    },

    // 게시글 수정
    updatePost: function(id, postData) {
        try {
            const posts = this.getAllPosts();
            const index = posts.findIndex(post => post.id === id);
            if (index === -1) {
                return { success: false, message: '게시글을 찾을 수 없습니다.' };
            }
            posts[index] = {
                ...posts[index],
                ...postData,
                updatedAt: new Date().toISOString().split('T')[0]
            };
            localStorage.setItem('posts', JSON.stringify(posts));
            return { success: true, message: '게시글이 수정되었습니다.' };
        } catch (error) {
            return { success: false, message: '게시글 수정에 실패했습니다.' };
        }
    },

    // 게시글 삭제
    deletePost: function(id) {
        try {
            const posts = this.getAllPosts();
            const filtered = posts.filter(post => post.id !== id);
            localStorage.setItem('posts', JSON.stringify(filtered));
            return { success: true, message: '게시글이 삭제되었습니다.' };
        } catch (error) {
            return { success: false, message: '게시글 삭제에 실패했습니다.' };
        }
    },

    // 여러 게시글 삭제
    deletePosts: function(ids) {
        try {
            const posts = this.getAllPosts();
            const filtered = posts.filter(post => !ids.includes(post.id));
            localStorage.setItem('posts', JSON.stringify(filtered));
            return { success: true, message: `${ids.length}개의 게시글이 삭제되었습니다.` };
        } catch (error) {
            return { success: false, message: '게시글 삭제에 실패했습니다.' };
        }
    },

    // 검색
    searchPosts: function(filters) {
        let posts = this.getAllPosts();

        // 키워드 검색
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            posts = posts.filter(post =>
                post.title.toLowerCase().includes(keyword) ||
                (post.summary && post.summary.toLowerCase().includes(keyword)) ||
                (post.content && post.content.toLowerCase().includes(keyword))
            );
        }

        // 카테고리 필터
        if (filters.category && filters.category !== 'all') {
            posts = posts.filter(post => post.category === filters.category);
        }

        // 지역 필터
        if (filters.regions && filters.regions.length > 0) {
            posts = posts.filter(post => filters.regions.includes(post.region));
        }

        // 지원분야 필터
        if (filters.supportFields && filters.supportFields.length > 0) {
            posts = posts.filter(post => filters.supportFields.includes(post.supportField));
        }

        // 대상 필터
        if (filters.targets && filters.targets.length > 0) {
            posts = posts.filter(post => filters.targets.includes(post.target));
        }

        // 연령대 필터
        if (filters.ages && filters.ages.length > 0) {
            posts = posts.filter(post => filters.ages.includes(post.age));
        }

        // 창업업력 필터
        if (filters.careers && filters.careers.length > 0) {
            posts = posts.filter(post => filters.careers.includes(post.career));
        }

        // 정렬
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
    },

    // 데이터 내보내기
    exportData: function() {
        const data = {
            posts: this.getAllPosts(),
            exportedAt: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    },

    // 데이터 가져오기
    importData: function(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.posts && Array.isArray(data.posts)) {
                localStorage.setItem('posts', JSON.stringify(data.posts));
                return { success: true, message: `${data.posts.length}개의 게시글을 가져왔습니다.` };
            }
            return { success: false, message: '올바른 데이터 형식이 아닙니다.' };
        } catch (error) {
            return { success: false, message: '데이터 가져오기에 실패했습니다.' };
        }
    },

    // 전체 데이터 삭제
    clearAll: function() {
        localStorage.removeItem('posts');
        return { success: true, message: '모든 데이터가 삭제되었습니다.' };
    }
};

// 카테고리 매핑
const CategoryMap = {
    'support': '지원사업/교육',
    'event': '행사/축제',
    'notice': '공지사항'
};

// 상태 매핑
const StatusMap = {
    'ongoing': '진행중',
    'upcoming': '접수예정',
    'closed': '마감'
};

// 초기화
DataManager.init();
