const ReviewMapper = require('../mappers/review.mapper');
const { REVIEW_STATUS } = require('../constants/review.constant');

const ReviewService = {
    createReview(db, order, user, payload) {
        const { rating, content, experience, product_id, files = [], parent_review_id = null } = payload;
        if (!order) throw new Error('订单不存在');
        if (order.user_id !== user.id && order.buyer_id !== user.id) {
            throw new Error('你无权评价该订单');
        }
        if (order.status !== 'completed') {
            throw new Error('只有已完成订单才能评价');
        }
        if (!rating) throw new Error('请选择评分');
        if (!content && !experience) throw new Error('请填写评价内容或购买体验');

        const productId = product_id || order.items?.[0]?.product_id;
        if (!productId) throw new Error('未找到关联商品');

        const existing = ReviewMapper.findByOrderAndProduct(db, order.id, productId, parent_review_id);
        if (existing && !parent_review_id) {
            throw new Error('该订单已评价，不能重复评价');
        }

        const review = ReviewMapper.insert(db, {
            order_id: order.id,
            order_no: order.order_no,
            user_id: user.id,
            user_name: user.display_name || user.username || '匿名用户',
            product_id: productId,
            rating: Number(rating) || 5,
            content: content || '',
            experience: experience || '',
            files: Array.isArray(files) ? files : [],
            parent_review_id: parent_review_id || null,
            status: REVIEW_STATUS.APPROVED
        });
        return review;
    },

    addAdditional(db, reviewId, userId, payload) {
        const review = ReviewMapper.findById(db, reviewId);
        if (!review) throw new Error('评价不存在');
        if (review.user_id !== userId) throw new Error('你无权追加评价');

        const { content, experience, files = [] } = payload;
        if (!content && !experience) throw new Error('请填写追加评价内容');

        return ReviewMapper.update(db, reviewId, {
            additional_content: content || '',
            additional_experience: experience || '',
            additional_files: Array.isArray(files) ? files : []
        });
    },

    listByProduct(db, productId, filters = {}) {
        const list = ReviewMapper.listByProduct(db, productId, filters);
        const page = Math.max(1, Number(filters.page) || 1);
        const pageSize = Math.max(1, Math.min(50, Number(filters.pageSize) || 10));
        const start = (page - 1) * pageSize;
        const items = list.slice(start, start + pageSize);
        const stats = ReviewMapper.countByProduct(db, productId);
        return {
            reviews: items,
            stats,
            pagination: {
                page,
                pageSize,
                total: list.length,
                totalPages: Math.max(1, Math.ceil(list.length / pageSize))
            }
        };
    },

    replyReview(db, reviewId, merchantId, content) {
        const review = ReviewMapper.findById(db, reviewId);
        if (!review) throw new Error('评价不存在');
        if (!content) throw new Error('请输入回复内容');
        return ReviewMapper.update(db, reviewId, {
            reply: content,
            reply_at: new Date().toISOString()
        });
    },

    approveReview(db, reviewId, status = REVIEW_STATUS.APPROVED, reason = '') {
        const review = ReviewMapper.findById(db, reviewId);
        if (!review) throw new Error('评价不存在');
        return ReviewMapper.update(db, reviewId, {
            status,
            review_reason: reason
        });
    },

    blockReview(db, reviewId, blocked = true, reason = '') {
        const review = ReviewMapper.findById(db, reviewId);
        if (!review) throw new Error('评价不存在');
        return ReviewMapper.update(db, reviewId, {
            is_blocked: Boolean(blocked),
            review_reason: reason || '违规内容',
            status: blocked ? REVIEW_STATUS.BLOCKED : REVIEW_STATUS.APPROVED
        });
    },

    hideReview(db, reviewId, hidden = true) {
        const review = ReviewMapper.findById(db, reviewId);
        if (!review) throw new Error('评价不存在');
        return ReviewMapper.update(db, reviewId, {
            is_hidden: Boolean(hidden),
            status: hidden ? REVIEW_STATUS.HIDDEN : REVIEW_STATUS.APPROVED
        });
    },

    deleteReview(db, reviewId) {
        const review = ReviewMapper.findById(db, reviewId);
        if (!review) throw new Error('评价不存在');
        return ReviewMapper.delete(db, reviewId);
    },

    getStats(db, productId) {
        return ReviewMapper.countByProduct(db, productId);
    },

    getReview(db, reviewId) {
        const review = ReviewMapper.findById(db, reviewId);
        if (!review) throw new Error('评价不存在');
        return {
            ...review,
            visibility: {
                is_hidden: Boolean(review.is_hidden),
                is_blocked: Boolean(review.is_blocked),
                status: review.status || REVIEW_STATUS.APPROVED
            }
        };
    },

    listByOrder(db, orderId) {
        return ReviewMapper.listByOrder(db, orderId);
    },

    listByUser(db, userId) {
        return ReviewMapper.listByUser(db, userId);
    },

    listAll(db, filters = {}) {
        return ReviewMapper.listAll(db, filters);
    }
};

module.exports = ReviewService;