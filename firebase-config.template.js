/**
 * Firebase 설정 및 초기화
 * 
 * 사용법:
 * 1. 이 파일을 firebase-config.js로 복사
 * 2. 아래 값들을 실제 Firebase 프로젝트 설정값으로 변경
 */

// Firebase 설정 (Firebase Console에서 확인)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firestore 및 Auth 인스턴스
const db = firebase.firestore();
const auth = firebase.auth();

console.log('Firebase 초기화 완료');
