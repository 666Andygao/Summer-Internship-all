const REVIEW_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    HIDDEN: 'hidden',
    BLOCKED: 'blocked'
};

const REVIEW_STATUS_LABELS = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    hidden: '已隐藏',
    blocked: '已屏蔽'
};

const REVIEW_SORT = {
    TIME: 'time',
    RATING: 'rating',
    DEFAULT: 'time'
};

const REVIEW_FILTERS = {
    HAS_IMAGES: 'has_images',
    RATING: 'rating'
};

module.exports = {
    REVIEW_STATUS,
    REVIEW_STATUS_LABELS,
    REVIEW_SORT,
    REVIEW_FILTERS
};