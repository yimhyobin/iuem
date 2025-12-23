/**
 * Firebase 설정 및 초기화
 */

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyAKdUaE-UMifG5-jkjp2mp34deeoFNZFI0",
    authDomain: "iuem-55ef8.firebaseapp.com",
    projectId: "iuem-55ef8",
    storageBucket: "iuem-55ef8.firebasestorage.app",
    messagingSenderId: "247744337986",
    appId: "1:247744337986:web:d065bb57f37f0f157075db"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firestore 및 Auth 인스턴스
const db = firebase.firestore();
const auth = firebase.auth();

console.log('Firebase 초기화 완료');
