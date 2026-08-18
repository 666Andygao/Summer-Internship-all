const { ORDER_STATUS } = require('../constants/order.constant');

function cancelOrderBySystem(db, order, reason) {
    if (order.status !== ORDER_STATUS.PENDING_PAYMENT) return;
    order.status = ORDER_STATUS.CANCELLED;
    order.cancel_reason = reason || '系统自动取消';
    order.cancelled_at = new Date().toISOString();
    order.updated_at = new Date().toISOString();
    if (order.deductions) {
        for (const d of order.deductions) {
            releaseStock(db, d.product_id, d.qty);
        }
    }
}

function releaseStock(db, productId, quantity) {
    const p = db.products.find(x => x.id === productId);
    if (p) {
        p.stock = Math.max(0, Number(p.stock) + Number(quantity));
    }
}

function scanAndCancelExpiredOrders(db, saveDB) {
    const now = Date.now();
    let cancelled = 0;
    (db.orders || []).forEach(o => {
        if (o.status !== ORDER_STATUS.PENDING_PAYMENT) return;
        if (!o.timeout_at) return;
        const ts = new Date(o.timeout_at).getTime();
        if (isNaN(ts) || ts > now) return;
        cancelOrderBySystem(db, o, '超时未支付，系统自动取消');
        cancelled++;
    });
    if (cancelled > 0) {
        saveDB(db);
        console.log(`[OrderTimeout] 自动取消超时订单 ${cancelled} 笔`);
    }
    return cancelled;
}

function startOrderTimeoutScheduler(loadDB, saveDB) {
    setInterval(() => {
        const db = loadDB();
        scanAndCancelExpiredOrders(db, saveDB);
    }, 15 * 1000);
    const db = loadDB();
    scanAndCancelExpiredOrders(db, saveDB);
}

module.exports = {
    cancelOrderBySystem,
    releaseStock,
    scanAndCancelExpiredOrders,
    startOrderTimeoutScheduler
};