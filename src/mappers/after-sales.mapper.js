const { AFTER_SALES_STATUS } = require('../constants/after-sales.constant');

const AfterSalesMapper = {
    insert(db, request) {
        request.id = request.id || `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        request.created_at = request.created_at || new Date().toISOString();
        request.updated_at = request.updated_at || new Date().toISOString();
        request.status = request.status || AFTER_SALES_STATUS.PENDING_REVIEW;
        db.after_sales = db.after_sales || [];
        db.after_sales.push(request);
        return request;
    },

    findById(db, id) {
        return (db.after_sales || []).find(r => String(r.id) === String(id));
    },

    update(db, id, updates) {
        const list = db.after_sales || [];
        const idx = list.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
        return list[idx];
    },

    delete(db, id) {
        const list = db.after_sales || [];
        const idx = list.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return false;
        list.splice(idx, 1);
        return true;
    },

    listByUser(db, userId, filters = {}) {
        let list = (db.after_sales || []).filter(r => r.user_id === userId);
        if (filters.status) list = list.filter(r => r.status === filters.status);
        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    listByMerchant(db, merchantUserId, filters = {}) {
        let list = (db.after_sales || []).filter(r => {
            const order = db.orders.find(o => o.id === r.order_id);
            if (!order) return false;
            const items = order.items || [];
            return items.some(item => {
                const p = db.products.find(x => x.id === item.product_id);
                return p && p.merchant_user_id === merchantUserId;
            });
        });
        if (filters.status) list = list.filter(r => r.status === filters.status);
        if (filters.keyword) {
            const kw = String(filters.keyword).trim().toLowerCase();
            list = list.filter(r =>
                [r.order_no, r.reason, r.description, r.type]
                    .filter(Boolean).join(' ').toLowerCase().includes(kw)
            );
        }
        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    listAll(db, filters = {}) {
        let list = db.after_sales || [];
        if (filters.status) list = list.filter(r => r.status === filters.status);
        if (filters.keyword) {
            const kw = String(filters.keyword).trim().toLowerCase();
            list = list.filter(r =>
                [r.order_no, r.reason, r.description, r.type]
                    .filter(Boolean).join(' ').toLowerCase().includes(kw)
            );
        }
        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    countByStatus(db) {
        const counts = {};
        const list = db.after_sales || [];
        Object.values(AFTER_SALES_STATUS).forEach(s => counts[s] = 0);
        list.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
        return counts;
    },

    findActiveByOrder(db, orderId) {
        return (db.after_sales || []).find(r =>
            r.order_id === orderId &&
            ['pending_review', 'processing', 'approved'].includes(r.status)
        );
    },

    insertNotice(db, requestId, notice) {
        const list = db.after_sales || [];
        const req = list.find(r => String(r.id) === String(requestId));
        if (!req) return null;
        notice.id = notice.id || `notice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        notice.created_at = notice.created_at || new Date().toISOString();
        req.notices = req.notices || [];
        req.notices.push(notice);
        req.updated_at = new Date().toISOString();
        return notice;
    }
};

module.exports = AfterSalesMapper;