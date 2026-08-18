const AfterSalesMapper = require('../mappers/after-sales.mapper');
const PaymentMapper = require('../mappers/payment.mapper');
const { AFTER_SALES_TYPE, AFTER_SALES_STATUS, AFTER_SALES_TRANSITIONS, AFTER_SALES_ORDER_STATUS } = require('../constants/after-sales.constant');
const { PAYMENT_STATUS } = require('../constants/payment.constant');

const AfterSalesService = {
    createRequest(db, order, userId, payload) {
        const { type, reason, amount, description, logistics } = payload;
        if (!order) throw new Error('订单不存在');
        if (order.user_id !== userId && order.buyer_id !== userId) {
            throw new Error('你无权申请该订单售后');
        }
        const allowedOrderStatus = ['paid', 'pending_shipment', 'shipped', 'completed', 'pending_receipt', 'after_sales'];
        if (!allowedOrderStatus.includes(order.status)) {
            throw new Error('当前订单状态不支持售后申请');
        }
        const existing = AfterSalesMapper.findActiveByOrder(db, order.id);
        if (existing) throw new Error('该订单已有正在处理的售后申请');

        const normalizedType = ['refund', 'return', 'exchange', 'refund_only'].includes(type) ? type : 'refund';
        const requestAmount = Number(amount || order.total_amount || 0);

        const request = AfterSalesMapper.insert(db, {
            order_id: order.id,
            order_no: order.order_no,
            user_id: userId,
            type: normalizedType,
            reason: reason || '未提供原因',
            amount: requestAmount,
            description: description || '',
            logistics: logistics || null,
            status: AFTER_SALES_STATUS.PENDING_REVIEW
        });

        order.after_sales = [...(order.after_sales || []), request.id];
        AfterSalesMapper.insertNotice(db, request.id, {
            message: '售后申请已提交，等待商家审核',
            level: 'info'
        });
        return request;
    },

    updateRequest(db, requestId, userId, updates) {
        const request = AfterSalesMapper.findById(db, requestId);
        if (!request) throw new Error('售后申请不存在');
        if (request.user_id !== userId) throw new Error('你无权修改该售后申请');
        if (request.status !== AFTER_SALES_STATUS.PENDING_REVIEW) {
            throw new Error('当前售后申请已进入审核流程，不能修改');
        }
        const { reason, amount, description, logistics } = updates;
        const patch = {};
        if (reason !== undefined) patch.reason = reason;
        if (amount !== undefined) patch.amount = Number(amount);
        if (description !== undefined) patch.description = description;
        if (logistics !== undefined) patch.logistics = logistics;
        return AfterSalesMapper.update(db, requestId, patch);
    },

    reviewRequest(db, requestId, decision, reviewerId, remark = '') {
        const request = AfterSalesMapper.findById(db, requestId);
        if (!request) throw new Error('售后申请不存在');

        const normalized = String(decision || '').toLowerCase();
        let newStatus;
        if (['approve', 'approved'].includes(normalized)) {
            newStatus = AFTER_SALES_STATUS.APPROVED;
        } else if (['reject', 'rejected'].includes(normalized)) {
            newStatus = AFTER_SALES_STATUS.REJECTED;
        } else if (normalized === 'processing') {
            newStatus = AFTER_SALES_STATUS.PROCESSING;
        } else if (['complete', 'completed'].includes(normalized)) {
            newStatus = AFTER_SALES_STATUS.COMPLETED;
        } else {
            throw new Error('无效的审核决定');
        }

        const allowed = AFTER_SALES_TRANSITIONS[request.status] || [];
        if (!allowed.includes(newStatus)) {
            throw new Error(`状态 ${request.status} 不可变更为 ${newStatus}`);
        }

        const updated = AfterSalesMapper.update(db, requestId, {
            status: newStatus,
            reviewed_by: reviewerId,
            review_remark: remark || ''
        });

        const order = db.orders.find(o => o.id === request.order_id);
        if (order) {
            if (newStatus === AFTER_SALES_STATUS.APPROVED) {
                order.status = AFTER_SALES_ORDER_STATUS.REFUND_PENDING;
                order.updated_at = new Date().toISOString();
                AfterSalesMapper.insertNotice(db, requestId, {
                    message: `审核通过，退款金额=${request.amount}，等待退款执行`,
                    level: 'success'
                });
            } else if (newStatus === AFTER_SALES_STATUS.REJECTED) {
                order.status = order.status === AFTER_SALES_ORDER_STATUS.REFUND_PENDING
                    ? 'pending_shipment'
                    : order.status;
                order.updated_at = new Date().toISOString();
                AfterSalesMapper.insertNotice(db, requestId, {
                    message: `审核拒绝，原因：${remark || '商家未说明'}`,
                    level: 'warning'
                });
            }
        }

        return updated;
    },

    updateLogistics(db, requestId, userId, logisticsPayload) {
        const request = AfterSalesMapper.findById(db, requestId);
        if (!request) throw new Error('售后申请不存在');
        if (request.user_id !== userId) throw new Error('你无权录入该售后物流');

        const { company, tracking_no, remark } = logisticsPayload;
        if (!company && !tracking_no) throw new Error('请至少填写物流公司或运单号');

        const patch = {
            logistics: {
                ...(request.logistics || {}),
                company: company || '',
                tracking_no: tracking_no || '',
                remark: remark || '',
                updated_at: new Date().toISOString()
            }
        };
        if (request.status === AFTER_SALES_STATUS.PENDING_REVIEW) {
            patch.status = AFTER_SALES_STATUS.PROCESSING;
        }
        const updated = AfterSalesMapper.update(db, requestId, patch);
        AfterSalesMapper.insertNotice(db, requestId, {
            message: '退货物流信息已更新，请关注最新状态',
            level: 'info'
        });
        return updated;
    },

    completeRequest(db, requestId, userId, payload) {
        const request = AfterSalesMapper.findById(db, requestId);
        if (!request) throw new Error('售后申请不存在');

        const order = db.orders.find(o => o.id === request.order_id);
        if (!order) throw new Error('关联订单不存在');

        const { refund_amount, refund_status = 'completed', remark = '' } = payload;
        const finalRefundAmount = Number(refund_amount ?? request.amount ?? 0);

        if (finalRefundAmount > 0) {
            try {
                const PaymentService = require('./payment.service');
                if (refund_status === 'completed') {
                    const refunds = PaymentMapper.listRefundsByOrder(db, order.id);
                    if (!refunds.length) {
                        PaymentService.createRefund(db, order, finalRefundAmount, request.reason);
                    }
                    const lastRefund = refunds[refunds.length - 1];
                    if (lastRefund) {
                        PaymentService.completeRefund(db, order, lastRefund.id, true);
                    }
                }
            } catch (e) {
                console.error('退款处理异常:', e.message);
            }
        }

        const updated = AfterSalesMapper.update(db, requestId, {
            status: AFTER_SALES_STATUS.CLOSED,
            refund_amount: finalRefundAmount,
            refund_status,
            result_remark: remark || '售后已完成',
            completed_at: new Date().toISOString()
        });

        if (order.status === AFTER_SALES_ORDER_STATUS.REFUND_PENDING ||
            order.status === AFTER_SALES_ORDER_STATUS.REFUNDING ||
            order.status === AFTER_SALES_ORDER_STATUS.AFTER_SALES) {
            order.status = 'completed';
            order.updated_at = new Date().toISOString();
        }

        AfterSalesMapper.insertNotice(db, requestId, {
            message: '售后流程已完成，退款结果已更新',
            level: refund_status === 'completed' ? 'success' : 'warning'
        });
        return updated;
    },

    getTrace(db, requestId) {
        const request = AfterSalesMapper.findById(db, requestId);
        if (!request) throw new Error('售后申请不存在');
        const notices = request.notices || [];
        const timeline = [
            { status: 'created', label: '售后申请已提交', at: request.created_at },
            { status: request.status, label: request.status === AFTER_SALES_STATUS.CLOSED ? '售后已完成' : '售后处理中', at: request.updated_at }
        ];
        return { request, timeline, notices };
    },

    listByUser(db, userId, filters) {
        return AfterSalesMapper.listByUser(db, userId, filters);
    },

    listByMerchant(db, merchantUserId, filters) {
        return AfterSalesMapper.listByMerchant(db, merchantUserId, filters);
    },

    listAll(db, filters) {
        return AfterSalesMapper.listAll(db, filters);
    },

    getStats(db, merchantUserId) {
        const list = merchantUserId
            ? AfterSalesMapper.listByMerchant(db, merchantUserId)
            : (db.after_sales || []);
        const counts = AfterSalesMapper.countByStatus(db);
        const totalAmount = list.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        return {
            total: list.length,
            total_amount: totalAmount.toFixed(2),
            status_breakdown: counts
        };
    }
};

module.exports = AfterSalesService;