import { auth, db, functions } from '../config.js';

export const authService = {
    // 監聽登入狀態
    onAuthStateChanged(callback) {
        return auth.onAuthStateChanged(callback);
    },

    // 註冊
    async signUp(email, password) {
        return auth.createUserWithEmailAndPassword(email, password);
    },

    // 登入
    async login(email, password) {
        return auth.signInWithEmailAndPassword(email, password);
    },

    // 登出
    async logout() {
        return auth.signOut();
    },

    // 實名認證
    async completeProfile(data) {
        const completeProfileFn = functions.httpsCallable('completeProfile');
        return completeProfileFn(data);
    },

    // 監聽 User Profile 資料
    onProfileSnapshot(uid, callback) {
        return db.collection('users').doc(uid).onSnapshot(callback);
    },

    // 獲取 LINE 綁定碼
    async getBindingCode() {
        const generateBindingCode = functions.httpsCallable('generateBindingCode');
        return generateBindingCode();
    }
};
