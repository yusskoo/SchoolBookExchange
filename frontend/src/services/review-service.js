/**
 * ============================================
 * 前端評論服務 (Review Service)
 * ============================================
 * 
 * 主要功能:
 * 1. 新增交易評論（呼叫後端 Callable Function）
 * 
 * 評論規則:
 * - 只有已完成的交易可以評分
 * - 每位參與者只能評價對方一次
 * - 評分範圍：1-5 星
 */

// TODO: 加入評論列表查詢功能
// TODO: 實作評論編輯功能
// TODO: 加入評論檢舉功能

import { functions } from '../config.js';

export const reviewService = {
    /**
     * 新增評論（呼叫後端 Cloud Function）
     * 
     * Pseudocode:
     * 1. 呼叫後端 addReview function
     * 2. 後端會驗證：
     *    - 交易是否已完成
     *    - 使用者是否為交易參與者
     *    - 是否已評價過
     * 3. 後端會自動更新被評價者的平均評分
     * 
     * @param {string} transactionId - 交易 ID
     * @param {string} targetUid - 被評價者 UID
     * @param {number} rating - 評分（1-5）
     * @param {string} comment - 評論內容（選填）
     * @returns {Promise} { success: true }
     * 
     * TODO: 加入前端評分驗證（提前檢查避免無效請求）
     * TODO: 實作評論草稿儲存功能
     */
    async addReview(transactionId, targetUid, rating, comment) {
        const addReviewFn = functions.httpsCallable('addReview');
        const result = await addReviewFn({
            transactionId,
            targetUid,
            rating,
            comment
        });
        return result.data;
    }
};
