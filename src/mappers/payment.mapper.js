const { PAYMENT_STATUS } = require('../constants/payment.constant');

const PaymentMapper = {
    createCredential(db, credential) {
        credential.id = credential.id || `cred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.payment_credentials = db.payment_credentials || [];
        db.payment_credentials.push(credential);
        return credential;
    },

    listCredentialsByOrder(db, orderId) {
        return (db.payment_credentials || []).filter(c => c.order_id === orderId);
    },

    createLog(db, log) {
        log.id = log.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.payment_logs = db.payment_logs || [];
        db.payment_logs.push(log);
        return log;
    },

    listLogsByOrder(db, orderId) {
        return (db.payment_logs || [])
            .filter(l => l.order_id === orderId)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },

    createPayment(db, payment) {
        payment.id = payment.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        payment.created_at = payment.created_at || new Date().toISOString();
        payment.status = payment.status || PAYMENT_STATUS.PENDING;
        db.payments = db.payments || [];
        db.payments.push(payment);
        return payment;
    },

    findPaymentById(db, paymentId) {
        return (db.payments || []).find(p => p.id === paymentId || p.payment_id === paymentId);
    },

    updatePayment(db, paymentId, updates) {
        const payments = db.payments || [];
        const idx = payments.findIndex(p => p.id === paymentId || p.payment_id === paymentId);
        if (idx === -1) return null;
        payments[idx] = { ...payments[idx], ...updates, updated_at: new Date().toISOString() };
        return payments[idx];
    },

    listPaymentsByOrder(db, orderId) {
        return (db.payments || [])
            .filter(p => p.order_id === orderId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    createRefund(db, refund) {
        refund.id = refund.id || `refund_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        refund.created_at = refund.created_at || new Date().toISOString();
        refund.status = refund.status || PAYMENT_STATUS.PENDING;
        db.refunds = db.refunds || [];
        db.refunds.push(refund);
        return refund;
    },

    findRefundById(db, refundId) {
        return (db.refunds || []).find(r => r.id === refundId);
    },

    listRefundsByOrder(db, orderId) {
        return (db.refunds || []).filter(r => r.order_id === orderId);
    }
};

module.exports = PaymentMapper;