const ORDER_STATUS = {
    PENDING_PAYMENT: 'pending_payment',
    PENDING_SHIPMENT: 'pending_shipment',
    PENDING_RECEIPT: 'pending_receipt',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    AFTER_SALES: 'after_sales'
};

const ORDER_STATUS_LABELS = {
    pending_payment: '待付款',
    pending_shipment: '待发货',
    pending_receipt: '待收货',
    completed: '已完成',
    cancelled: '已取消',
    after_sales: '售后中'
};

const ORDER_TRANSITIONS = {
    pending_payment: ['pending_shipment', 'cancelled'],
    pending_shipment: ['pending_receipt', 'after_sales', 'cancelled'],
    pending_receipt: ['completed', 'after_sales'],
    completed: ['after_sales'],
    cancelled: [],
    after_sales: ['completed']
};

const ORDER_TIMEOUT_MS = 30 * 60 * 1000;

const DEDUCT_TYPE = {
    NONE: 'none',
    DEDUCTED: 'deducted',
    COMMITTED: 'committed',
    RELEASED: 'released'
};

module.exports = {
    ORDER_STATUS,
    ORDER_STATUS_LABELS,
    ORDER_TRANSITIONS,
    ORDER_TIMEOUT_MS,
    DEDUCT_TYPE
};