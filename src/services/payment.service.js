const PaymentMapper = require('../mappers/payment.mapper');
const { PAYMENT_METHODS, ALLOWED_PAYMENT_METHODS, PAYMENT_STATUS, PAYMENT_STATUS_LABELS, PAYMENT_GATEWAYS, PAYMENT_LOG_LEVELS } = require('../constants/payment.constant');

const PaymentService = {
    createPaymentOrder(db, order, paymentMethod = PAYMENT_METHODS.ALIPAY) {
        if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
            throw new Error('不支持的支付方式');
        }
        if (order.status !== 'pending_payment') {
            throw new Error('当前订单状态无需支付');
        }
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const payment = {
            payment_id: paymentId,
            order_id: order.id,
            order_no: order.order_no,
            amount: Number(order.total_amount || 0),
            payment_method: paymentMethod,
            status: PAYMENT_STATUS.PENDING,
            qr_code: `/uploads/payments/${paymentMethod}.png`,
            gateway: PAYMENT_GATEWAYS[paymentMethod] || '支付宝支付',
            attempts: (order.payment?.attempts || 0) + 1,
            last_attempt_at: new Date().toISOString(),
            timeout_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
        };
        order.payment = payment;
        order.payment_logs = [...(order.payment_logs || [])];
        PaymentMapper.createLog(db, {
            order_id: order.id,
            order_no: order.order_no,
            level: PAYMENT_LOG_LEVELS.INFO,
            detail: `发起支付，方式=${paymentMethod}`,
            created_at: new Date().toISOString()
        });
        PaymentMapper.createCredential(db, {
            payment_id: paymentId,
            order_id: order.id,
            order_no: order.order_no,
            payment_method: paymentMethod,
            amount: Number(order.total_amount || 0),
            status: PAYMENT_STATUS.PENDING,
            note: '支付请求发起'
        });
        return payment;
    },

    processCallback(db, order, payload, callbackToken) {
        if (!order) throw new Error('订单不存在');
        if (callbackToken !== 'dev-placeholder-payment') {
            throw new Error('支付回调签名无效');
        }
        const { status = 'success', payment_method = PAYMENT_METHODS.ALIPAY, payment_id, amount } = payload;
        const paymentStatus = status === 'success' ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.FAILED;

        if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
            throw new Error('不支持的支付方式');
        }
        const expectedAmount = Number(order.total_amount || 0);
        const actualAmount = Number(amount || order.total_amount || 0);
        if (expectedAmount && actualAmount && Math.abs(actualAmount - expectedAmount) > 0.01) {
            PaymentMapper.createLog(db, {
                order_id: order.id,
                order_no: order.order_no,
                level: PAYMENT_LOG_LEVELS.ERROR,
                detail: `金额校验失败: 期望${expectedAmount}, 实际${actualAmount}`,
                created_at: new Date().toISOString()
            });
            throw new Error('支付金额与订单金额不一致');
        }

        order.payment = {
            ...(order.payment || {}),
            payment_id: payment_id || order.payment?.payment_id || `pay_${Date.now()}`,
            payment_method,
            amount: actualAmount,
            status: paymentStatus,
            result: paymentStatus,
            paid_at: paymentStatus === PAYMENT_STATUS.SUCCESS ? new Date().toISOString() : null
        };

        if (paymentStatus === PAYMENT_STATUS.SUCCESS) {
            PaymentMapper.createLog(db, {
                order_id: order.id,
                order_no: order.order_no,
                level: PAYMENT_LOG_LEVELS.SUCCESS,
                detail: '支付回调成功',
                created_at: new Date().toISOString()
            });
        } else {
            PaymentMapper.createLog(db, {
                order_id: order.id,
                order_no: order.order_no,
                level: PAYMENT_LOG_LEVELS.WARNING,
                detail: '支付回调失败',
                created_at: new Date().toISOString()
            });
        }

        PaymentMapper.createCredential(db, {
            payment_id: order.payment.payment_id,
            order_id: order.id,
            order_no: order.order_no,
            payment_method,
            amount: actualAmount,
            status: paymentStatus,
            note: paymentStatus === PAYMENT_STATUS.SUCCESS ? '支付回调成功' : '支付回调失败'
        });

        return order.payment;
    },

    retryPayment(db, order, paymentMethod) {
        if (order.status !== 'pending_payment') {
            throw new Error('当前订单无需重试支付');
        }
        return this.createPaymentOrder(db, order, paymentMethod || order.payment?.payment_method || PAYMENT_METHODS.ALIPAY);
    },

    timeoutPayment(db, order) {
        if (!order.payment || order.payment.status === PAYMENT_STATUS.SUCCESS) {
            throw new Error('支付已成功，无需超时处理');
        }
        order.payment = {
            ...(order.payment || {}),
            status: PAYMENT_STATUS.TIMEOUT,
            result: PAYMENT_STATUS.TIMEOUT,
            timeout_at: new Date().toISOString()
        };
        PaymentMapper.createLog(db, {
            order_id: order.id,
            order_no: order.order_no,
            level: PAYMENT_LOG_LEVELS.WARNING,
            detail: '订单支付超时',
            created_at: new Date().toISOString()
        });
        return order.payment;
    },

    verifyConsistency(order) {
        const payment = order.payment || {};
        const issues = [];
        const orderStatus = order.status;
        const paymentStatus = payment.status;

        if (orderStatus === 'paid' && paymentStatus !== PAYMENT_STATUS.SUCCESS) {
            issues.push('订单已付款，但支付状态不是 success');
        }
        if (orderStatus === 'pending_payment' && [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.TIMEOUT].includes(paymentStatus)) {
            issues.push('待支付订单存在成功/超时的支付状态');
        }
        if (paymentStatus === PAYMENT_STATUS.SUCCESS && orderStatus !== 'paid') {
            issues.push('支付成功，但订单状态不是 paid');
        }
        if (paymentStatus === PAYMENT_STATUS.TIMEOUT && orderStatus === 'paid') {
            issues.push('支付超时，但订单已付款');
        }
        if (payment.amount && order.total_amount && Math.abs(Number(payment.amount) - Number(order.total_amount)) > 0.01) {
            issues.push('支付金额与订单金额不一致');
        }

        return {
            valid: issues.length === 0,
            issues,
            order_status: orderStatus,
            payment_status: paymentStatus
        };
    },

    createRefund(db, order, refundAmount, reason) {
        const payment = order.payment;
        if (!payment || payment.status !== PAYMENT_STATUS.SUCCESS) {
            throw new Error('订单未支付，无法退款');
        }
        const amount = Number(refundAmount || order.total_amount || 0);
        if (amount <= 0) throw new Error('退款金额必须大于0');
        if (amount > Number(order.total_amount || 0)) {
            throw new Error('退款金额不能超过订单实付金额');
        }
        const refund = PaymentMapper.createRefund(db, {
            order_id: order.id,
            order_no: order.order_no,
            payment_id: payment.payment_id,
            amount,
            reason: reason || '',
            status: PAYMENT_STATUS.PENDING,
            created_at: new Date().toISOString()
        });
        payment.status = PAYMENT_STATUS.REFUNDING;
        payment.refund_amount = amount;
        payment.refund_id = refund.id;
        PaymentMapper.createLog(db, {
            order_id: order.id,
            order_no: order.order_no,
            level: PAYMENT_LOG_LEVELS.INFO,
            detail: `发起退款，金额=${amount}，原因=${reason || ''}`,
            created_at: new Date().toISOString()
        });
        return refund;
    },

    completeRefund(db, order, refundId, success = true) {
        const refund = PaymentMapper.findRefundById(db, refundId);
        if (!refund) throw new Error('退款记录不存在');
        refund.status = success ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.FAILED;
        refund.completed_at = new Date().toISOString();
        if (success) {
            order.payment.status = PAYMENT_STATUS.REFUNDED;
        }
        PaymentMapper.createLog(db, {
            order_id: order.id,
            order_no: order.order_no,
            level: success ? PAYMENT_LOG_LEVELS.SUCCESS : PAYMENT_LOG_LEVELS.ERROR,
            detail: success ? `退款完成，金额=${refund.amount}` : '退款失败',
            created_at: new Date().toISOString()
        });
        return refund;
    },

    getPaymentDetails(db, order) {
        return {
            payment: order.payment || null,
            credentials: PaymentMapper.listCredentialsByOrder(db, order.id),
            logs: PaymentMapper.listLogsByOrder(db, order.id),
            verification: this.verifyConsistency(order)
        };
    }
};

module.exports = PaymentService;