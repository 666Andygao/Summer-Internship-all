const PAYMENT_METHODS = {
    ALIPAY: 'alipay',
    WECHAT: 'wechat',
    BANK: 'bank'
};

const ALLOWED_PAYMENT_METHODS = Object.values(PAYMENT_METHODS);

const PAYMENT_STATUS = {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
    TIMEOUT: 'timeout',
    REFUNDING: 'refunding',
    REFUNDED: 'refunded'
};

const PAYMENT_STATUS_LABELS = {
    pending: '待支付',
    success: '支付成功',
    failed: '支付失败',
    timeout: '支付超时',
    refunding: '退款中',
    refunded: '已退款'
};

const PAYMENT_GATEWAYS = {
    alipay: '支付宝支付',
    wechat: '微信支付',
    bank: '银行卡支付'
};

const PAYMENT_LOG_LEVELS = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    SUCCESS: 'success'
};

module.exports = {
    PAYMENT_METHODS,
    ALLOWED_PAYMENT_METHODS,
    PAYMENT_STATUS,
    PAYMENT_STATUS_LABELS,
    PAYMENT_GATEWAYS,
    PAYMENT_LOG_LEVELS
};