/**
 * 인증 관리 모듈
 * localStorage를 사용하여 사용자 인증을 관리합니다.
 */

const Auth = {
    // 기본 관리자 계정 (실제 운영 시에는 보안 강화 필요)
    defaultAdmin: {
        userId: 'admin',
        password: 'admin1234',
        userName: '관리자',
        email: 'admin@example.com',
        isAdmin: true,
        createdAt: '2025-01-01'
    },

    // 초기화
    init: function() {
        if (!localStorage.getItem('users')) {
            localStorage.setItem('users', JSON.stringify([this.defaultAdmin]));
        } else {
            // 기본 관리자 계정이 없으면 추가
            const users = JSON.parse(localStorage.getItem('users'));
            const hasAdmin = users.some(user => user.userId === 'admin');
            if (!hasAdmin) {
                users.push(this.defaultAdmin);
                localStorage.setItem('users', JSON.stringify(users));
            }
        }
    },

    // 모든 사용자 가져오기
    getAllUsers: function() {
        this.init();
        return JSON.parse(localStorage.getItem('users')) || [];
    },

    // 로그인
    login: function(userId, password) {
        this.init();
        const users = this.getAllUsers();
        const user = users.find(u => u.userId === userId && u.password === password);

        if (user) {
            const sessionUser = {
                userId: user.userId,
                userName: user.userName,
                email: user.email,
                isAdmin: user.isAdmin || false
            };
            sessionStorage.setItem('currentUser', JSON.stringify(sessionUser));
            return {
                success: true,
                message: `${user.userName}님, 환영합니다!`,
                isAdmin: user.isAdmin || false
            };
        }

        return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    },

    // 로그아웃
    logout: function() {
        sessionStorage.removeItem('currentUser');
        return { success: true, message: '로그아웃 되었습니다.' };
    },

    // 현재 로그인한 사용자 가져오기
    getCurrentUser: function() {
        const user = sessionStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    },

    // 로그인 상태 확인
    isLoggedIn: function() {
        return this.getCurrentUser() !== null;
    },

    // 관리자 권한 확인
    isAdmin: function() {
        const user = this.getCurrentUser();
        return user && user.isAdmin;
    },

    // 회원가입
    register: function(userData) {
        this.init();
        const users = this.getAllUsers();

        // 아이디 중복 확인
        if (users.some(u => u.userId === userData.userId)) {
            return { success: false, message: '이미 사용중인 아이디입니다.' };
        }

        // 이메일 중복 확인
        if (users.some(u => u.email === userData.email)) {
            return { success: false, message: '이미 사용중인 이메일입니다.' };
        }

        const newUser = {
            ...userData,
            isAdmin: false,
            createdAt: new Date().toISOString().split('T')[0]
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        return { success: true, message: '회원가입이 완료되었습니다.' };
    },

    // 아이디 중복 확인
    checkDuplicate: function(userId) {
        const users = this.getAllUsers();
        const exists = users.some(u => u.userId === userId);
        return { available: !exists };
    },

    // 사용자 정보 수정
    updateUser: function(userId, userData) {
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.userId === userId);

        if (index === -1) {
            return { success: false, message: '사용자를 찾을 수 없습니다.' };
        }

        users[index] = { ...users[index], ...userData };
        localStorage.setItem('users', JSON.stringify(users));

        return { success: true, message: '사용자 정보가 수정되었습니다.' };
    },

    // 사용자 삭제
    deleteUser: function(userId) {
        if (userId === 'admin') {
            return { success: false, message: '기본 관리자 계정은 삭제할 수 없습니다.' };
        }

        const users = this.getAllUsers();
        const filtered = users.filter(u => u.userId !== userId);
        localStorage.setItem('users', JSON.stringify(filtered));

        return { success: true, message: '사용자가 삭제되었습니다.' };
    },

    // 관리자 권한 부여
    grantAdmin: function(userId) {
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.userId === userId);

        if (index === -1) {
            return { success: false, message: '사용자를 찾을 수 없습니다.' };
        }

        users[index].isAdmin = true;
        localStorage.setItem('users', JSON.stringify(users));

        return { success: true, message: '관리자 권한이 부여되었습니다.' };
    },

    // 관리자 권한 해제
    revokeAdmin: function(userId) {
        if (userId === 'admin') {
            return { success: false, message: '기본 관리자의 권한은 해제할 수 없습니다.' };
        }

        const users = this.getAllUsers();
        const index = users.findIndex(u => u.userId === userId);

        if (index === -1) {
            return { success: false, message: '사용자를 찾을 수 없습니다.' };
        }

        users[index].isAdmin = false;
        localStorage.setItem('users', JSON.stringify(users));

        return { success: true, message: '관리자 권한이 해제되었습니다.' };
    }
};

// 초기화
Auth.init();
