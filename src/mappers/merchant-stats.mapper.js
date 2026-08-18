const { ORDER_STATUS } = require('../constants/order.constant');

const REVENUE_ORDER_STATUSES = [
    ORDER_STATUS.PENDING_SHIPMENT,
    ORDER_STATUS.PENDING_RECEIPT,
    ORDER_STATUS.COMPLETED
];

const MerchantStatsMapper = {

    buildMerchantOrderIndex(db) {
        const index = new Map();
        const products = db.products || [];
        const skuToMerchant = new Map();
        for (const p of products) {
            if (!p || p.is_deleted) continue;
            if (!p.merchant_user_id) continue;
            skuToMerchant.set(p.id, p.merchant_user_id);
        }
        const orders = db.orders || [];
        for (const order of orders) {
            const items = Array.isArray(order.items) ? order.items : [];
            for (const item of items) {
                if (!item || !item.product_id) continue;
                const merchantUserId = skuToMerchant.get(item.product_id);
                if (!merchantUserId) continue;
                let bucket = index.get(merchantUserId);
                if (!bucket) {
                    bucket = [];
                    index.set(merchantUserId, bucket);
                }
                bucket.push(order);
            }
        }
        return { index, skuToMerchant };
    },

    buildProductIndex(db) {
        const map = new Map();
        for (const p of (db.products || [])) {
            if (p && p.id) map.set(p.id, p);
        }
        return map;
    },

    filterOrdersByStatus(orders, statuses) {
        const statusSet = new Set(statuses);
        return orders.filter(o => statusSet.has(o.status));
    },

    todayDateKey() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    aggregateSalesRank(orders, productMap) {
        const map = new Map();
        for (const order of orders) {
            const items = Array.isArray(order.items) ? order.items : [];
            for (const item of items) {
                if (!item || !item.product_id) continue;
                const productId = item.product_id;
                const product = productMap.get(productId);
                if (!product || product.is_deleted) continue;
                const quantity = Number(item.quantity) || 0;
                const price = Number(item.price) || 0;
                const subtotal = quantity * price;
                let row = map.get(productId);
                if (!row) {
                    row = {
                        product_id: productId,
                        product_title: item.title || product.title || '',
                        product_cover_image: item.cover_image || product.cover_image || '',
                        total_quantity: 0,
                        total_amount: 0
                    };
                    map.set(productId, row);
                }
                row.total_quantity += quantity;
                row.total_amount += subtotal;
            }
        }
        const list = Array.from(map.values());
        list.sort((a, b) => {
            if (b.total_quantity !== a.total_quantity) return b.total_quantity - a.total_quantity;
            return b.total_amount - a.total_amount;
        });
        return list;
    },

    slicePage(list, offset, size) {
        return list.slice(offset, offset + size);
    },

    queryRevenueSummary(orders, todayKey) {
        let todayOrderCount = 0;
        let todayRevenue = 0;
        let totalOrderCount = 0;
        let totalRevenue = 0;
        for (const order of orders) {
            if (REVENUE_ORDER_STATUSES.indexOf(order.status) === -1) continue;
            totalOrderCount += 1;
            const amount = Number(order.total_amount) || 0;
            totalRevenue += amount;
            if (order.created_at && order.created_at.slice(0, 10) === todayKey) {
                todayOrderCount += 1;
                todayRevenue += amount;
            }
        }
        return {
            today_order_count: todayOrderCount,
            today_revenue: Number(todayRevenue.toFixed(2)),
            total_order_count: totalOrderCount,
            total_revenue: Number(totalRevenue.toFixed(2))
        };
    }
};

MerchantStatsMapper.REVENUE_ORDER_STATUSES = REVENUE_ORDER_STATUSES;

module.exports = MerchantStatsMapper;