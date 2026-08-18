const { REVIEW_STATUS } = require('../constants/review.constant');

const ReviewMapper = {
    insert(db, review) {
        review.id = review.id || `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        review.created_at = review.created_at || new Date().toISOString();
        review.updated_at = review.updated_at || new Date().toISOString();
        review.status = review.status || REVIEW_STATUS.APPROVED;
        db.reviews = db.reviews || [];
        db.reviews.push(review);
        return review;
    },

    findById(db, id) {
        return (db.reviews || []).find(r => String(r.id) === String(id));
    },

    update(db, id, updates) {
        const list = db.reviews || [];
        const idx = list.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
        return list[idx];
    },

    delete(db, id) {
        const list = db.reviews || [];
        const idx = list.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return false;
        list.splice(idx, 1);
        return true;
    },

    listByProduct(db, productId, filters = {}) {
        let list = (db.reviews || []).filter(r =>
            r.product_id === productId && r.status !== REVIEW_STATUS.HIDDEN
        );
        if (filters.rating) {
            list = list.filter(r => Number(r.rating) === Number(filters.rating));
        }
        if (filters.has_images === 'true' || filters.has_images === true) {
            list = list.filter(r => Array.isArray(r.files) && r.files.length > 0);
        }
        if (filters.sort === 'rating') {
            list = list.sort((a, b) => Number(b.rating) - Number(a.rating));
        } else {
            list = list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        return list;
    },

    listByOrder(db, orderId) {
        return (db.reviews || []).filter(r => r.order_id === orderId);
    },

    listByUser(db, userId) {
        return (db.reviews || [])
            .filter(r => r.user_id === userId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    findByOrderAndProduct(db, orderId, productId, parentReviewId = null) {
        return (db.reviews || []).find(r =>
            r.order_id === orderId &&
            r.product_id === productId &&
            (r.parent_review_id || null) === (parentReviewId || null)
        );
    },

    countByProduct(db, productId) {
        const list = (db.reviews || []).filter(r =>
            r.product_id === productId && r.status !== REVIEW_STATUS.HIDDEN
        );
        const total = list.length;
        const positiveCount = list.filter(r => Number(r.rating) >= 4).length;
        const avg = total ? list.reduce((s, r) => s + Number(r.rating || 0), 0) / total : 0;
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        list.forEach(r => {
            const k = Math.round(Number(r.rating));
            if (distribution[k] !== undefined) distribution[k]++;
        });
        return {
            total,
            positive_count: positiveCount,
            positive_rate: total ? Math.round((positiveCount / total) * 100) : 0,
            average_rating: Number(avg.toFixed(1)),
            distribution
        };
    },

    listAll(db, filters = {}) {
        let list = db.reviews || [];
        if (filters.product_id) list = list.filter(r => r.product_id === Number(filters.product_id));
        if (filters.status) list = list.filter(r => r.status === filters.status);
        if (filters.user_id) list = list.filter(r => r.user_id === Number(filters.user_id));
        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
};

module.exports = ReviewMapper;