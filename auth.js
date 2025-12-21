/**
 * 인증 관리 모듈
 * Firebase Authentication을 사용하여 사용자 인증을 관리합니다.
 */

const Auth = {
    currentUser: null,

    // 회원가입
    register: async function(userData) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(
                userData.email,
                userData.password
            );

            await db.collection('users').doc(userCredential.user.uid).set({
                userId: userData.userId,
                userName: userData.userName,
                email: userData.email,
                isAdmin: false,
                createdAt: new Date().toISOString().split('T')[0]
            });

            return { success: true, message: '회원가입이 완료되었습니다.' };
        } catch (error) {
            console.error('회원가입 오류:', error);
            if (error.code === 'auth/email-already-in-use') {
                return { success: false, message: '이미 사용중인 이메일입니다.' };
            }
            if (error.code === 'auth/weak-password') {
                return { success: false, message: '비밀번호는 6자 이상이어야 합니다.' };
            }
            return { success: false, message: '회원가입에 실패했습니다.' };
        }
    },

    // 로그인
    login: async function(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const userDoc = await db.collection('users').doc(userCredential.user.uid).get();

            if (userDoc.exists) {
                this.currentUser = {
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                    userName: userDoc.data().userName,
                    isAdmin: userDoc.data().isAdmin || false
                };

                return {
                    success: true,
                    message: this.currentUser.userName + '님, 환영합니다!',
                    isAdmin: this.currentUser.isAdmin
                };
            }

            return { success: false, message: '사용자 정보를 찾을 수 없습니다.' };
        } catch (error) {
            console.error('로그인 오류:', error);
            return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
        }
    },

    // 로그아웃
    logout: async function() {
        try {
            await auth.signOut();
            this.currentUser = null;
            return { success: true, message: '로그아웃 되었습니다.' };
        } catch (error) {
            console.error('로그아웃 오류:', error);
            return { success: false, message: '로그아웃에 실패했습니다.' };
        }
    },

    // 현재 로그인한 사용자 가져오기
    getCurrentUser: function() {
        return this.currentUser;
    },

    // 로그인 상태 확인
    isLoggedIn: function() {
        return this.currentUser !== null;
    },

    // 관리자 권한 확인
    isAdmin: function() {
        return this.currentUser && this.currentUser.isAdmin;
    },

    // 모든 사용자 가져오기 (관리자용)
    getAllUsers: async function() {
        try {
            const snapshot = await db.collection('users').get();
            return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('사용자 목록 조회 오류:', error);
            return [];
        }
    },

    // 관리자 권한 부여
    grantAdmin: async function(uid) {
        try {
            await db.collection('users').doc(uid).update({ isAdmin: true });
            return { success: true, message: '관리자 권한이 부여되었습니다.' };
        } catch (error) {
            console.error('권한 부여 오류:', error);
            return { success: false, message: '권한 부여에 실패했습니다.' };
        }
    },

    // 관리자 권한 해제
    revokeAdmin: async function(uid) {
        try {
            await db.collection('users').doc(uid).update({ isAdmin: false });
            return { success: true, message: '관리자 권한이 해제되었습니다.' };
        } catch (error) {
            console.error('권한 해제 오류:', error);
            return { success: false, message: '권한 해제에 실패했습니다.' };
        }
    }
};

// Firebase 인증 상태 변경 시 UI 업데이트
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            Auth.currentUser = {
                uid: user.uid,
                email: user.email,
                userName: userDoc.data().userName,
                isAdmin: userDoc.data().isAdmin || false
            };
        }
    } else {
        Auth.currentUser = null;
    }

    if (typeof updateAuthUI === 'function') {
        updateAuthUI();
    }
});
