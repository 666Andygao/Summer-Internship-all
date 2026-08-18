-- ============================================================
-- 非遗电商数据库性能优化方案 - 索引优化脚本
-- 适用数据库：MySQL 8.0+ / PostgreSQL 13+
-- 核心目标：商品搜索、订单分页查询、营销数据统计 高频接口加速
-- ============================================================

-- ============================================================
-- 1. 商品表 (products) 索引优化
--    优化场景：商品列表、搜索、分类筛选、排序
-- ============================================================

-- 1.1 商品搜索核心复合索引
-- 覆盖：状态过滤 + 删除标记 + 分类筛选 + 排序字段
ALTER TABLE products
    ADD INDEX idx_products_status_category (status, is_deleted, category, created_at);

-- 1.2 商品销量/热度排序索引
-- 优化：按销量、价格排序的商品列表查询
ALTER TABLE products
    ADD INDEX idx_products_sales (sales_count DESC, status, is_deleted);

ALTER TABLE products
    ADD INDEX idx_products_price (price ASC, status, is_deleted);

-- 1.3 商家商品索引
-- 优化：商家后台管理自己的商品列表
ALTER TABLE products
    ADD INDEX idx_products_merchant (merchant_user_id, status, created_at);

-- 1.4 商品创建时间索引
-- 优化：按创建时间排序的最新商品列表
ALTER TABLE products
    ADD INDEX idx_products_created_at (created_at DESC);

-- 1.5 商品标题全文索引（MySQL 8.0+）
-- 优化：商品名称模糊搜索
ALTER TABLE products
    ADD FULLTEXT INDEX ft_products_title (title, brief, description);

-- 1.6 商品标签索引（JSON 字段辅助查询）
-- 优化：按标签筛选商品
ALTER TABLE products
    ADD INDEX idx_products_tag (JSON_EXTRACT(tags, '$[*]'));

-- 1.7 非遗分类索引
ALTER TABLE products
    ADD INDEX idx_products_heritage (heritage_category, status, is_deleted);

-- ============================================================
-- 2. 订单表 (orders) 索引优化
--    优化场景：订单列表分页、状态筛选、时间范围查询
-- ============================================================

-- 2.1 用户订单复合索引（买家视角）
-- 优化："我的订单"列表分页查询
ALTER TABLE orders
    ADD INDEX idx_orders_user_status_created (user_id, status, created_at DESC);

-- 2.2 商家订单复合索引（商家视角）
-- 优化：商家后台订单管理列表
ALTER TABLE orders
    ADD INDEX idx_orders_merchant_status_created (merchant_user_id, status, created_at DESC);

-- 2.3 订单状态索引
-- 优化：按状态筛选订单（如全部已付款订单）
ALTER TABLE orders
    ADD INDEX idx_orders_status (status, created_at DESC);

-- 2.4 订单创建时间索引
-- 优化：按时间范围查询订单、统计报表
ALTER TABLE orders
    ADD INDEX idx_orders_created_at (created_at DESC);

-- 2.5 订单支付状态索引
-- 优化：支付相关查询
ALTER TABLE orders
    ADD INDEX idx_orders_payment_status (payment_status, created_at DESC);

-- 2.6 订单金额索引
-- 优化：营收统计查询
ALTER TABLE orders
    ADD INDEX idx_orders_total_amount (total_amount);

-- 2.7 订单号唯一索引
ALTER TABLE orders
    ADD UNIQUE INDEX uk_orders_no (order_no);

-- ============================================================
-- 3. 订单项表 (order_items) 索引优化
--    优化场景：商品销量排行、订单详情
-- ============================================================

-- 3.1 订单外键索引
ALTER TABLE order_items
    ADD INDEX idx_order_items_order (order_id);

-- 3.2 商品销量统计索引
ALTER TABLE order_items
    ADD INDEX idx_order_items_product (product_id, quantity);

-- 3.3 商家维度订单项索引
ALTER TABLE order_items
    ADD INDEX idx_order_items_merchant (merchant_user_id, product_id, quantity);

-- ============================================================
-- 4. 用户表 (users) 索引优化
-- ============================================================

-- 4.1 用户名唯一索引（登录查询）
-- 注意：如果已存在请跳过
ALTER TABLE users
    ADD UNIQUE INDEX uk_users_username (username);

-- 4.2 角色索引
ALTER TABLE users
    ADD INDEX idx_users_role (role, created_at);

-- 4.3 手机号索引
ALTER TABLE users
    ADD INDEX idx_users_phone (phone);

-- ============================================================
-- 5. 商家表 (merchants) 索引优化
-- ============================================================

ALTER TABLE merchants
    ADD INDEX idx_merchants_user_id (user_id);

ALTER TABLE merchants
    ADD INDEX idx_merchants_status (status, created_at);

ALTER TABLE merchants
    ADD INDEX idx_merchants_category (heritage_category, status);

-- ============================================================
-- 6. 购物车表 (carts) 索引优化
-- ============================================================

ALTER TABLE carts
    ADD INDEX idx_carts_user (user_id, selected);

ALTER TABLE carts
    ADD INDEX idx_carts_user_product (user_id, product_id);

-- ============================================================
-- 7. 评价表 (reviews) 索引优化
-- ============================================================

ALTER TABLE reviews
    ADD INDEX idx_reviews_product (product_id, created_at DESC);

ALTER TABLE reviews
    ADD INDEX idx_reviews_user (user_id, created_at DESC);

ALTER TABLE reviews
    ADD INDEX idx_reviews_order (order_id);

ALTER TABLE reviews
    ADD INDEX idx_reviews_rating_product (product_id, rating, created_at DESC);

-- ============================================================
-- 8. 售后表 (after_sales) 索引优化
-- ============================================================

ALTER TABLE after_sales
    ADD INDEX idx_after_sales_order (order_id);

ALTER TABLE after_sales
    ADD INDEX idx_after_sales_user (user_id, status);

ALTER TABLE after_sales
    ADD INDEX idx_after_sales_merchant (merchant_user_id, status);

-- ============================================================
-- 9. 地址表 (addresses) 索引优化
-- ============================================================

ALTER TABLE addresses
    ADD INDEX idx_addresses_user (user_id, is_default);

-- ============================================================
-- 10. 支付表 (payments) 索引优化
-- ============================================================

ALTER TABLE payments
    ADD INDEX idx_payments_order (order_id);

ALTER TABLE payments
    ADD INDEX idx_payments_user (user_id, status);

ALTER TABLE payments
    ADD INDEX idx_payments_method (payment_method, status);

-- ============================================================
-- 11. 第三方商品映射表 (third_party_product_mapping) 索引优化
-- ============================================================

ALTER TABLE third_party_product_mapping
    ADD INDEX idx_tp_mapping_source (source_name, source_product_id);

ALTER TABLE third_party_product_mapping
    ADD INDEX idx_tp_mapping_internal (internal_product_id);

-- ============================================================
-- 12. 抓取日志表 (product_crawl_log) 索引优化
-- ============================================================

ALTER TABLE product_crawl_log
    ADD INDEX idx_crawl_log_status_created (status, created_at DESC);

ALTER TABLE product_crawl_log
    ADD INDEX idx_crawl_log_source_task (source_name, task_name);

-- ============================================================
-- 性能监控查询 SQL
-- 用于验证索引效果
-- ============================================================

-- 检查索引使用情况
EXPLAIN SELECT * FROM products
WHERE status = 'on_sale' AND is_deleted = 0
ORDER BY sales_count DESC
LIMIT 20 OFFSET 0;

-- 订单分页查询索引验证
EXPLAIN SELECT * FROM orders
WHERE user_id = 1 AND status = 'pending_shipment'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- 商品搜索索引验证
EXPLAIN SELECT * FROM products
WHERE category = '陶瓷' AND status = 'on_sale'
AND MATCH(title, brief) AGAINST ('青花瓷' IN NATURAL LANGUAGE MODE)
LIMIT 20;

-- 商家营收统计索引验证
EXPLAIN SELECT
    COUNT(*) AS today_orders,
    SUM(total_amount) AS today_revenue
FROM orders
WHERE merchant_user_id = 1
    AND status IN ('pending_shipment', 'pending_receipt', 'completed')
    AND DATE(created_at) = CURDATE();

-- ============================================================
-- 慢查询优化建议
-- ============================================================

-- 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow_query.log';

-- 开启查询缓存（MySQL 8.0 已移除，改用 Redis/本地缓存层）
-- 建议在应用层实现：商品详情缓存、热门搜索缓存、商家统计缓存

-- 定期执行 ANALYZE TABLE 更新统计信息
-- ANALYZE TABLE products, orders, order_items, users, merchants;

-- 分库分表建议（数据量超百万级时）
-- 1. orders 表按 user_id 分表：orders_0 ~ orders_9
-- 2. order_items 表按 order_id 分表
-- 3. product_crawl_log 按月分区