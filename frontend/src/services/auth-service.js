/**
 * ============================================
 * 前端認證服務 (Auth Service)
 * ============================================
 * 
 * 主要功能:
 * 1. 使用者註冊、登入、登出
 * 2. 監聽登入狀態變化
 * 3. 實名認證（呼叫後端 Cloud Function）
 * 4. LINE 帳號綁定碼生成
 * 5. 監聽使用者資料變化（即時同步）
 */

// TODO: 加入 Google 登入支援
// TODO: 實作密碼重設功能
// TODO: 加入登入狀態快取機制

import { auth, db, functions } from '../config.js';

export const authService = {
    /**
     * 監聽登入狀態變化（即時）
     * @param {Function} callback - 登入狀態變化時的回調函數
     * @returns {Function} unsubscribe 函數
     */
    onAuthStateChanged(callback) {
        return auth.onAuthStateChanged(callback);
    },

    /**
     * 註冊新使用者
     * Pseudocode:
     * - 使用 Firebase Auth 建立使用者帳戶
     * - 後端會自動觸發 checkSchoolEmail，驗證學校信箱
     * 
     * @param {string} email - 學校信箱
     * @param {string} password - 密碼
     * @returns {Promise} Firebase User Credential
     */
    async signUp(email, password) {
        return auth.createUserWithEmailAndPassword(email, password);
    },

    /**
     * 使用者登入
     * @param {string} email - 學校信箱
     * @param {string} password - 密碼
     * @returns {Promise} Firebase User Credential
     */
    async login(email, password) {
        return auth.signInWithEmailAndPassword(email, password);
    },

    /**
     * 使用者登出
     * @returns {Promise}
     */
    async logout() {
        return auth.signOut();
    },

    /**
     * 發送認證連結 (取代原有的 signUp)
     */
    async sendVerificationLink(email) {
        // 設定連結點擊後導回的網址 (即當前頁面)
        const actionCodeSettings = {
            url: window.location.href, // 重定向回目前頁面
            handleCodeInApp: true,
        };
        return auth.sendSignInLinkToEmail(email, actionCodeSettings);
    },

    /**
     * 檢查網址是否為登入連結
     */
    isSignInWithEmailLink(url) {
        return auth.isSignInWithEmailLink(url);
    },

    /**
     * 使用連結登入
     */
    async signInWithLink(email, url) {
        return auth.signInWithEmailLink(email, url);
    },

    /**
     * 更新使用者密碼 (用於連結登入後的密碼設定)
     */
    async updateUserPassword(password) {
        if (!auth.currentUser) throw new Error("無使用者登入");
        return auth.currentUser.updatePassword(password);
    },

    /**
     * 實名認證（後端 Callable Function）
     * Pseudocode:
     * - 呼叫後端 completeProfile function
     * - 後端會儲存真實姓名和學號到私密資料區
     * - 更新公開資料（暱稱、LINE通知設定）
     * 
     * @param {Object} data - { realName, studentId, nickname, isLineNotifyEnabled }
     * @returns {Promise} { success: true, message: "實名認證完成" }
     */
    async completeProfile(data) {
        const completeProfileFn = functions.httpsCallable('completeProfile');
        return completeProfileFn(data);
    },

    /**
     * 監聽使用者個人資料變化（即時同步）
     * Pseudocode:
     * - 訂閱 users/{uid} 文件的變化
     * - 當資料更新時自動觸發 callback
     * 
     * @param {string} uid - 使用者 UID
     * @param {Function} callback - 資料變化時的回調函數
     * @returns {Function} unsubscribe 函數
     * 
     * TODO: 加入錯誤處理回調
     */
    onProfileSnapshot(uid, callback) {
        return db.collection('users').doc(uid).onSnapshot(callback);
    },

    /**
     * 取得 LINE 綁定碼（6位數字）
     * Pseudocode:
     * - 呼叫後端生成 6 位數綁定碼
     * - 綁定碼有效期限為 5 分鐘
     * - 使用者在 LINE Bot 中輸入此碼完成綁定
     * 
     * @returns {Promise} { success: true, code: "123456", expiresAt: Timestamp }
     */
    async getBindingCode() {
        const generateBindingCode = functions.httpsCallable('generateBindingCode');
        return generateBindingCode();
    },

    /**
     * 解除 LINE 帳號綁定
     */
    async unbindLineAccount() {
        const unbindLineAccount = functions.httpsCallable('unbindLineAccount');
        return unbindLineAccount();
    }
};
