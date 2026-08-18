const MerchantStatsMapper = require('../mappers/merchant-stats.mapper');
const StatPageUtil = require('../utils/stat-page.util');
const { ORDER_STATUS } = require('../constants/order.constant');

const REVENUE_ORDER_STATUSES = [
    ORDER_STATUS.PENDING_SHIPMENT,
    ORDER_STATUS.PENDING_RECEIPT,
    ORDER_STATUS.COMPLETED
];

const MerchantStatsService = {

    _resolveMerchantUserId(db, tokenUser) {
        if (!tokenUser) throw new Error('请先登录');
        const role = (tokenUser.role || '').toLowerCase();
        if (role !== 'artisan' && role !== 'developer') {
            throw new Error('仅非遗手艺人商家可查看数据统计');
        }
        return tokenUser.id;
    },

    listSalesRank(db, tokenUser, page, size) {
        const merchantUserId = this._resolveMerchantUserId(db, tokenUser);
        const currentPage = StatPageUtil.normalizePage(page);
        const currentSize = StatPageUtil.normalizeSize(size);
        const offset = StatPageUtil.toOffset(currentPage, currentSize);

        const { index } = MerchantStatsMapper.buildMerchantOrderIndex(db);
        const productMap = MerchantStatsMapper.buildProductIndex(db);

        const merchantOrders = index.get(merchantUserId) || [];
        const validOrders = MerchantStatsMapper.filterOrdersByStatus(merchantOrders, REVENUE_ORDER_STATUSES);

        const aggregated = MerchantStatsMapper.aggregateSalesRank(validOrders, productMap);
        const total = aggregated.length;
        const items = MerchantStatsMapper.slicePage(aggregated, offset, currentSize);

        return StatPageUtil.build(items, total, currentPage, currentSize);
    },

    getRevenueSummary(db, tokenUser) {
        const merchantUserId = this._resolveMerchantUserId(db, tokenUser);
        const { index } = MerchantStatsMapper.buildMerchantOrderIndex(db);
        const merchantOrders = index.get(merchantUserId) || [];
        const todayKey = MerchantStatsMapper.todayDateKey();
        const summary = MerchantStatsMapper.queryRevenueSummary(merchantOrders, todayKey);
        return {
            today_order_count: summary.today_order_count || 0,
            today_revenue: summary.today_revenue || 0,
            total_order_count: summary.total_order_count || 0,
            total_revenue: summary.total_revenue || 0
        };
    }
};

module.exports = MerchantStatsService;