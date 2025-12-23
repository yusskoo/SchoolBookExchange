import { functions } from '../config.js';

export const reviewService = {
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
