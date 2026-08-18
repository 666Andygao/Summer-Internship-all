const AFTER_SALES_TYPE = {
    REFUND: 'refund',
    RETURN: 'return',
    EXCHANGE: 'exchange',
    REFUND_ONLY: 'refund_only'
};

const AFTER_SALES_TYPE_LABELS = {
    refund: '退款退货',
    return: '退货',
    exchange: '换货',
    refund_only: '仅退款'
};

const AFTER_SALES_STATUS = {
    PENDING_REVIEW: 'pending_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    CLOSED: 'closed'
};

const AFTER_SALES_STATUS_LABELS = {
    pending_review: '待审核',
    approved: '已同意',
    rejected: '已拒绝',
    processing: '处理中',
    completed: '已完成',
    closed: '已关闭'
};

const AFTER_SALES_TRANSITIONS = {
    pending_review: ['approved', 'rejected', 'processing'],
    approved: ['processing', 'completed'],
    rejected: [],
    processing: ['completed', 'closed'],
    completed: [],
    closed: []
};

const AFTER_SALES_ORDER_STATUS = {
    REFUND_PENDING: 'refund_pending',
    REFUNDING: 'refunding',
    REFUNDED: 'refunded',
    AFTER_SALES: 'after_sales'
};

module.exports = {
    AFTER_SALES_TYPE,
    AFTER_SALES_TYPE_LABELS,
    AFTER_SALES_STATUS,
    AFTER_SALES_STATUS_LABELS,
    AFTER_SALES_TRANSITIONS,
    AFTER_SALES_ORDER_STATUS
};