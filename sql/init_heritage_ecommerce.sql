-- ============================================================
-- 华夏风物 · 非遗传承电商平台 - 数据库初始化脚本
-- 版本: v2.0 (完整版)
-- 适用数据库: MySQL 8.0+ / PostgreSQL 13+
-- 执行顺序: 按文件内注释分组依次执行
-- ============================================================

CREATE DATABASE IF NOT EXISTS heritage_ecommerce
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE heritage_ecommerce;

-- ============================================================
-- 第一部分: 用户与权限
-- ============================================================

-- 1.1 用户表
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
    username        VARCHAR(64)   NOT NULL COMMENT '登录用户名',
    password        VARCHAR(255)  NOT NULL COMMENT '密码(bcrypt加密)',
    role            VARCHAR(32)   NOT NULL DEFAULT 'buyer' COMMENT '角色: buyer/artisan/admin',
    display_name    VARCHAR(64)   NOT NULL COMMENT '昵称/显示名',
    phone           VARCHAR(20)   DEFAULT '' COMMENT '手机号',
    email           VARCHAR(128)  DEFAULT '' COMMENT '邮箱',
    avatar          VARCHAR(500)  DEFAULT '' COMMENT '头像URL',
    bio             VARCHAR(500)  DEFAULT '' COMMENT '个人简介',
    status          VARCHAR(32)   NOT NULL DEFAULT 'active' COMMENT '状态: active/disabled',
    last_login_at   DATETIME      NULL COMMENT '最后登录时间',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted      TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    UNIQUE KEY uk_users_username (username),
    INDEX idx_users_role (role),
    INDEX idx_users_phone (phone)
) ENGINE=InnoDB COMMENT='用户表';

-- 1.2 商家扩展信息表
CREATE TABLE IF NOT EXISTS merchants (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id                 BIGINT       NOT NULL COMMENT '关联users.id',
    shop_name               VARCHAR(128) NOT NULL COMMENT '店铺名称',
    shop_logo               VARCHAR(500) DEFAULT '' COMMENT '店铺Logo',
    shop_banner             VARCHAR(500) DEFAULT '' COMMENT '店铺Banner图',
    intro                   VARCHAR(500) NOT NULL COMMENT '店铺简介',
    heritage_category       VARCHAR(64)  NOT NULL COMMENT '非遗类别: 陶瓷/刺绣/漆器/木版年画等',
    contact_phone           VARCHAR(20)  NOT NULL COMMENT '联系电话',
    contact_email           VARCHAR(128) DEFAULT '' COMMENT '联系邮箱',
    qualification_note      VARCHAR(500) DEFAULT '' COMMENT '资质备注',
    qualification_documents JSON         DEFAULT NULL COMMENT '资质证明文件列表',
    status                  VARCHAR(32)  NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected/disabled',
    certification_status    VARCHAR(32)  NOT NULL DEFAULT 'uncertified' COMMENT 'uncertified/certified/expired',
    certification_expires_at DATETIME   NULL COMMENT '认证到期时间',
    permissions             JSON         DEFAULT NULL COMMENT '权限列表',
    created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted              TINYINT(1)   NOT NULL DEFAULT 0,
    UNIQUE KEY uk_merchants_user_id (user_id),
    INDEX idx_merchants_status (status),
    INDEX idx_merchants_category (heritage_category)
) ENGINE=InnoDB COMMENT='商家扩展信息表';

-- ============================================================
-- 第二部分: 商品与分类
-- ============================================================

-- 2.1 商品分类表
CREATE TABLE IF NOT EXISTS product_categories (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    parent_id   BIGINT       DEFAULT 0 COMMENT '父分类ID，0为顶级',
    name        VARCHAR(64)  NOT NULL COMMENT '分类名称',
    slug        VARCHAR(64)  NOT NULL COMMENT '分类标识',
    icon        VARCHAR(500) DEFAULT '' COMMENT '分类图标',
    sort_order  INT          NOT NULL DEFAULT 0 COMMENT '排序',
    status      VARCHAR(32)  NOT NULL DEFAULT 'enabled',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_categories_slug (slug),
    INDEX idx_categories_parent (parent_id)
) ENGINE=InnoDB COMMENT='商品分类表';

-- 2.2 商品表
CREATE TABLE IF NOT EXISTS products (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    merchant_user_id        BIGINT        NOT NULL COMMENT '商家用户ID',
    category_id             BIGINT        DEFAULT NULL COMMENT '分类ID',
    category                VARCHAR(64)   NOT NULL DEFAULT '' COMMENT '分类名称(冗余)',
    heritage_category       VARCHAR(64)   NOT NULL DEFAULT '' COMMENT '非遗分类',
    title                   VARCHAR(200)  NOT NULL COMMENT '商品标题',
    brief                   VARCHAR(500)  DEFAULT '' COMMENT '商品简介',
    description             TEXT          COMMENT '商品详情(富文本)',
    story                   TEXT          COMMENT '非遗故事/传承介绍',
    artisan_intro           TEXT          COMMENT '手艺人介绍',
    price                   DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '售价',
    original_price          DECIMAL(12,2) DEFAULT NULL COMMENT '原价',
    stock                   INT           NOT NULL DEFAULT 0 COMMENT '库存',
    sales_count             INT           NOT NULL DEFAULT 0 COMMENT '销量',
    view_count              INT           NOT NULL DEFAULT 0 COMMENT '浏览量',
    cover_image             VARCHAR(500)  DEFAULT '' COMMENT '封面图',
    images                  JSON          DEFAULT NULL COMMENT '商品图片列表',
    video                   VARCHAR(500)  DEFAULT '' COMMENT '商品视频',
    tags                    JSON          DEFAULT NULL COMMENT '标签数组',
    attributes              JSON          DEFAULT NULL COMMENT '规格属性',
    status                  VARCHAR(32)   NOT NULL DEFAULT 'draft' COMMENT 'draft/on_sale/off_sale',
    is_featured             TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '是否特色推荐',
    version                 INT           NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted              TINYINT(1)    NOT NULL DEFAULT 0,
    INDEX idx_products_merchant (merchant_user_id, status),
    INDEX idx_products_category (category, status),
    INDEX idx_products_status (status),
    INDEX idx_products_sales (sales_count DESC),
    INDEX idx_products_created (created_at DESC),
    INDEX idx_products_heritage (heritage_category),
    FULLTEXT INDEX ft_products_search (title, brief, description)
) ENGINE=InnoDB COMMENT='商品表';

-- 2.3 商品属性表
CREATE TABLE IF NOT EXISTS product_attributes (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id  BIGINT       NOT NULL,
    name        VARCHAR(64)  NOT NULL COMMENT '属性名: 如"材质"',
    value       VARCHAR(255) NOT NULL COMMENT '属性值: 如"高岭土"',
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_attrs_product (product_id)
) ENGINE=InnoDB COMMENT='商品属性表';

-- 2.4 商品媒体表
CREATE TABLE IF NOT EXISTS product_media (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id  BIGINT       NOT NULL,
    type        VARCHAR(32)  NOT NULL COMMENT 'image/video',
    url         VARCHAR(500) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_media_product (product_id)
) ENGINE=InnoDB COMMENT='商品媒体表';

-- ============================================================
-- 第三部分: 订单与支付
-- ============================================================

-- 3.1 订单表
CREATE TABLE IF NOT EXISTS orders (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no            VARCHAR(32)    NOT NULL COMMENT '订单号',
    user_id             BIGINT         NOT NULL COMMENT '买家用户ID',
    merchant_user_id    BIGINT         NOT NULL COMMENT '商家用户ID',
    status              VARCHAR(32)    NOT NULL DEFAULT 'pending_payment' COMMENT 'pending_payment/paid/pending_shipment/shipped/completed/cancelled',
    payment_status      VARCHAR(32)    NOT NULL DEFAULT 'unpaid' COMMENT 'unpaid/paid/refunded',
    payment_method      VARCHAR(32)    DEFAULT '' COMMENT 'wechat/alipay/bank_transfer/balance',
    total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '订单总金额',
    product_amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '商品金额',
    shipping_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '运费',
    discount_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '优惠金额',
    shipping_company    VARCHAR(64)    DEFAULT '' COMMENT '物流公司',
    tracking_number     VARCHAR(64)    DEFAULT '' COMMENT '运单号',
    receiver_name       VARCHAR(64)    NOT NULL COMMENT '收货人',
    receiver_phone      VARCHAR(20)    NOT NULL COMMENT '收货电话',
    receiver_address    VARCHAR(500)   NOT NULL COMMENT '收货地址',
    remark              VARCHAR(500)   DEFAULT '' COMMENT '买家备注',
    cancel_reason       VARCHAR(500)   DEFAULT '' COMMENT '取消原因',
    cancelled_at        DATETIME       NULL COMMENT '取消时间',
    paid_at             DATETIME       NULL COMMENT '支付时间',
    shipped_at          DATETIME       NULL COMMENT '发货时间',
    completed_at        DATETIME       NULL COMMENT '完成时间',
    status_history      JSON           DEFAULT NULL COMMENT '状态变更历史',
    created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_orders_no (order_no),
    INDEX idx_orders_user (user_id, status),
    INDEX idx_orders_merchant (merchant_user_id, status),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created (created_at DESC),
    INDEX idx_orders_payment (payment_status)
) ENGINE=InnoDB COMMENT='订单表';

-- 3.2 订单项表
CREATE TABLE IF NOT EXISTS order_items (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT         NOT NULL,
    product_id      BIGINT         NOT NULL,
    merchant_user_id BIGINT        NOT NULL COMMENT '商家ID(冗余,用于统计)',
    product_title   VARCHAR(200)   NOT NULL COMMENT '商品标题(快照)',
    product_image   VARCHAR(500)   DEFAULT '' COMMENT '商品图片(快照)',
    price           DECIMAL(12,2)  NOT NULL COMMENT '下单时价格(快照)',
    quantity        INT            NOT NULL COMMENT '购买数量',
    subtotal        DECIMAL(12,2)  NOT NULL COMMENT '小计金额',
    created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_product (product_id),
    INDEX idx_order_items_merchant (merchant_user_id)
) ENGINE=InnoDB COMMENT='订单项表';

-- 3.3 支付表
CREATE TABLE IF NOT EXISTS payments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT         NOT NULL,
    user_id         BIGINT         NOT NULL,
    payment_method  VARCHAR(32)    NOT NULL COMMENT 'wechat/alipay/bank_transfer/balance',
    amount          DECIMAL(12,2)  NOT NULL,
    status          VARCHAR(32)    NOT NULL DEFAULT 'pending' COMMENT 'pending/success/failed/refunded',
    third_party_no  VARCHAR(128)  DEFAULT '' COMMENT '第三方支付流水号',
    callback_data   JSON           DEFAULT NULL COMMENT '回调数据',
    paid_at         DATETIME       NULL,
    created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payments_order (order_id),
    INDEX idx_payments_user (user_id),
    INDEX idx_payments_status (status)
) ENGINE=InnoDB COMMENT='支付表';

-- ============================================================
-- 第四部分: 购物车与收藏
-- ============================================================

-- 4.1 购物车表
CREATE TABLE IF NOT EXISTS carts (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT        NOT NULL,
    product_id  BIGINT        NOT NULL,
    quantity    INT           NOT NULL DEFAULT 1,
    selected    TINYINT(1)    NOT NULL DEFAULT 1,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_carts_user_product (user_id, product_id),
    INDEX idx_carts_user (user_id)
) ENGINE=InnoDB COMMENT='购物车表';

-- 4.2 收藏表
CREATE TABLE IF NOT EXISTS favorites (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    product_id  BIGINT       NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_favorites_user_product (user_id, product_id),
    INDEX idx_favorites_user (user_id)
) ENGINE=InnoDB COMMENT='收藏表';

-- ============================================================
-- 第五部分: 地址与售后
-- ============================================================

-- 5.1 收货地址表
CREATE TABLE IF NOT EXISTS addresses (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    receiver_name   VARCHAR(64)  NOT NULL,
    receiver_phone  VARCHAR(20)  NOT NULL,
    province        VARCHAR(32)  NOT NULL,
    city            VARCHAR(32)  NOT NULL,
    district        VARCHAR(32)  NOT NULL,
    detail          VARCHAR(200) NOT NULL,
    is_default      TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_addresses_user (user_id)
) ENGINE=InnoDB COMMENT='收货地址表';

-- 5.2 售后表
CREATE TABLE IF NOT EXISTS after_sales (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT        NOT NULL,
    user_id         BIGINT        NOT NULL COMMENT '买家ID',
    merchant_user_id BIGINT       NOT NULL COMMENT '商家ID',
    type            VARCHAR(32)   NOT NULL COMMENT 'refund(仅退款)/return(退货退款)/exchange(换货)',
    reason          VARCHAR(500)  NOT NULL COMMENT '售后原因',
    description     VARCHAR(1000) DEFAULT '' COMMENT '详细描述',
    images          JSON          DEFAULT NULL COMMENT '凭证图片',
    refund_amount   DECIMAL(12,2) DEFAULT NULL COMMENT '申请退款金额',
    status          VARCHAR(32)   NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected/completed/cancelled',
    reviewer_id     BIGINT        DEFAULT NULL COMMENT '审核人ID',
    review_note     VARCHAR(500)  DEFAULT '' COMMENT '审核备注',
    reviewed_at     DATETIME      NULL COMMENT '审核时间',
    logistics_company VARCHAR(64) DEFAULT '' COMMENT '退货物流公司',
    tracking_number  VARCHAR(64) DEFAULT '' COMMENT '退货运单号',
    completed_at    DATETIME      NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_after_sales_order (order_id),
    INDEX idx_after_sales_user (user_id),
    INDEX idx_after_sales_merchant (merchant_user_id),
    INDEX idx_after_sales_status (status)
) ENGINE=InnoDB COMMENT='售后表';

-- ============================================================
-- 第六部分: 评价
-- ============================================================

-- 6.1 评价表
CREATE TABLE IF NOT EXISTS reviews (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT        NOT NULL,
    product_id      BIGINT        NOT NULL,
    order_id        BIGINT        NOT NULL,
    rating          TINYINT       NOT NULL COMMENT '1-5 评分',
    content         VARCHAR(1000) NOT NULL COMMENT '评价内容',
    images          JSON          DEFAULT NULL COMMENT '评价图片',
    reply           VARCHAR(500)  DEFAULT '' COMMENT '商家回复',
    reply_at        DATETIME      NULL COMMENT '商家回复时间',
    status          VARCHAR(32)   NOT NULL DEFAULT 'approved' COMMENT 'pending/approved/rejected/hidden',
    is_additional   TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '是否追加评价',
    parent_id       BIGINT        DEFAULT NULL COMMENT '父评价ID(追加评价)',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reviews_product (product_id),
    INDEX idx_reviews_user (user_id),
    INDEX idx_reviews_order (order_id),
    INDEX idx_reviews_rating (rating, product_id)
) ENGINE=InnoDB COMMENT='评价表';

-- ============================================================
-- 第七部分: 客服与投诉
-- ============================================================

-- 7.1 会话表
CREATE TABLE IF NOT EXISTS conversations (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL COMMENT '发起者ID',
    merchant_id     BIGINT       NOT NULL COMMENT '接收者ID',
    last_message    VARCHAR(500) DEFAULT '' COMMENT '最后一条消息',
    last_at         DATETIME     NULL COMMENT '最后消息时间',
    unread_count_user INT        NOT NULL DEFAULT 0 COMMENT '买家未读数',
    unread_count_merchant INT    NOT NULL DEFAULT 0 COMMENT '商家未读数',
    status          VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_conversations_user (user_id),
    INDEX idx_conversations_merchant (merchant_id)
) ENGINE=InnoDB COMMENT='客服会话表';

-- 7.2 消息表
CREATE TABLE IF NOT EXISTS messages (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT       NOT NULL,
    sender_id       BIGINT       NOT NULL,
    receiver_id     BIGINT       NOT NULL,
    type            VARCHAR(32)  NOT NULL DEFAULT 'text' COMMENT 'text/image/file',
    content         TEXT         NOT NULL,
    is_read         TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_messages_conversation (conversation_id),
    INDEX idx_messages_sender (sender_id)
) ENGINE=InnoDB COMMENT='客服消息表';

-- 7.3 投诉表
CREATE TABLE IF NOT EXISTS complaints (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    merchant_user_id BIGINT      DEFAULT NULL,
    order_id        BIGINT       DEFAULT NULL,
    type            VARCHAR(32)  NOT NULL COMMENT 'service/product/logistics/other',
    title           VARCHAR(200) NOT NULL,
    content         VARCHAR(2000) NOT NULL,
    images          JSON         DEFAULT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'pending' COMMENT 'pending/processing/resolved/rejected',
    handler_id      BIGINT       DEFAULT NULL COMMENT '处理人ID',
    reply           VARCHAR(500) DEFAULT '',
    handled_at      DATETIME     NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_complaints_user (user_id),
    INDEX idx_complaints_status (status)
) ENGINE=InnoDB COMMENT='投诉表';

-- ============================================================
-- 第八部分: 第三方商品导入扩展模块
-- ============================================================

-- 8.1 第三方商品映射表
CREATE TABLE IF NOT EXISTS third_party_product_mapping (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_name        VARCHAR(64)   NOT NULL COMMENT '来源平台: jd/taobao/tmall',
    source_product_id  VARCHAR(128)  NOT NULL COMMENT '第三方商品ID',
    source_url        VARCHAR(1000) NOT NULL COMMENT '第三方商品URL',
    internal_product_id BIGINT      DEFAULT NULL COMMENT '内部商品ID(导入后关联)',
    merchant_user_id  BIGINT        NOT NULL COMMENT '导入商家',
    source_title      VARCHAR(500)  DEFAULT '' COMMENT '第三方商品标题快照',
    source_price      DECIMAL(12,2) DEFAULT NULL COMMENT '第三方价格快照',
    status            VARCHAR(32)   NOT NULL DEFAULT 'pending' COMMENT 'pending/imported/failed',
    import_at         DATETIME      NULL COMMENT '导入完成时间',
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tp_source (source_name, source_product_id),
    INDEX idx_tp_internal (internal_product_id),
    INDEX idx_tp_merchant (merchant_user_id)
) ENGINE=InnoDB COMMENT='第三方商品映射表';

-- 8.2 抓取日志表
CREATE TABLE IF NOT EXISTS product_crawl_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_name     VARCHAR(64)   NOT NULL COMMENT 'jd/taobao/tmall',
    task_name       VARCHAR(128)  NOT NULL COMMENT '任务名称',
    source_product_id VARCHAR(128) DEFAULT NULL,
    source_url      VARCHAR(1000) DEFAULT '',
    status          VARCHAR(32)   NOT NULL DEFAULT 'pending' COMMENT 'pending/running/success/failed',
    retry_count     INT           NOT NULL DEFAULT 0 COMMENT '重试次数',
    error_message   VARCHAR(1000) DEFAULT '' COMMENT '错误信息',
    response_time_ms INT          DEFAULT NULL COMMENT '响应时间(毫秒)',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_crawl_status (status),
    INDEX idx_crawl_source (source_name),
    INDEX idx_crawl_created (created_at DESC)
) ENGINE=InnoDB COMMENT='抓取日志表';

-- ============================================================
-- 第九部分: 基础数据初始化
-- ============================================================

-- 9.1 插入管理员账号 (密码: admin123456)
INSERT INTO users (username, password, role, display_name, phone, status)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', '平台管理员', '13800000000', 'active')
ON DUPLICATE KEY UPDATE username = username;

-- 9.2 插入测试买家 (密码: buyer123456)
INSERT INTO users (username, password, role, display_name, phone, status)
VALUES ('test_buyer', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'buyer', '测试买家', '13900000001', 'active')
ON DUPLICATE KEY UPDATE username = username;

-- 9.3 插入测试商家 (密码: artisan123456)
INSERT INTO users (username, password, role, display_name, phone, status)
VALUES ('test_artisan', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'artisan', '测试非遗手艺人', '13900000002', 'active')
ON DUPLICATE KEY UPDATE username = username;

-- 9.4 插入非遗商品分类
INSERT INTO product_categories (parent_id, name, slug, icon, sort_order) VALUES
(0, '陶瓷', 'ceramic', '/icons/ceramic.svg', 1),
(0, '刺绣', 'embroidery', '/icons/embroidery.svg', 2),
(0, '漆器', 'lacquer', '/icons/lacquer.svg', 3),
(0, '木版年画', 'woodblock', '/icons/woodblock.svg', 4),
(0, '编织', 'weaving', '/icons/weaving.svg', 5),
(0, '银饰', 'silver', '/icons/silver.svg', 6),
(0, '木雕', 'woodcarving', '/icons/woodcarving.svg', 7),
(0, '石雕', 'stonecarving', '/icons/stonecarving.svg', 8),
(0, '皮影', 'shadow-puppetry', '/icons/shadow.svg', 9),
(0, '其他非遗', 'other', '/icons/other.svg', 10)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 9.5 插入非遗子分类
INSERT INTO product_categories (parent_id, name, slug, icon, sort_order) VALUES
(1, '景德镇瓷', 'jingdezhen', '', 1),
(1, '青花瓷', 'blue-white', '', 2),
(1, '粉彩瓷', 'famille-rose', '', 3),
(1, '建水紫陶', 'jianshui', '', 4),
(1, '汝窑', 'ru-ware', '', 5),
(2, '苏绣', 'suzhou', '', 1),
(2, '蜀绣', 'sichuan', '', 2),
(2, '湘绣', 'hunan', '', 3),
(2, '粤绣', 'guangdong', '', 4),
(2, '苗绣', 'miao', '', 5),
(3, '成都漆艺', 'chengdu', '', 1),
(3, '彝族漆器', 'yi', '', 2),
(5, '青神竹编', 'qingshen', '', 1),
(5, '藏族唐卡', 'thangka', '', 1);

-- 9.6 插入非遗测试商品样例
INSERT INTO products (merchant_user_id, category, heritage_category, title, brief, description, price, stock, cover_image, tags, status) VALUES
(1, '陶瓷', '景德镇瓷', '手工青花瓷茶具套装', '景德镇非遗传承人手绘，缠枝莲纹青花瓷茶具', '精选景德镇高岭土，1300度高温烧制，手工绘制缠枝莲纹，含茶壶1把、茶杯4只、茶托4个，礼盒装。', 688.00, 50, '/uploads/sample/blue-white-tea.jpg', '["青花瓷","茶具","非遗","景德镇"]', 'on_sale'),
(1, '陶瓷', '建水紫陶', '建水紫陶梅花壶', '云南建水紫陶，手工雕刻梅花', '建水紫陶采用当地五彩泥土，经雕刻打磨，古朴典雅，壶身雕刻梅花图案，寓意高洁。', 298.00, 30, '/uploads/sample/zitao-mei.jpg', '["紫陶","建水","茶壶"]', 'on_sale'),
(1, '刺绣', '蜀绣', '蜀绣芙蓉围巾', '成都蜀绣手工围巾，缠枝芙蓉图案', '采用真丝面料，传统蜀绣工艺，图案为缠枝芙蓉，色彩典雅，适合秋冬佩戴。', 1288.00, 20, '/uploads/sample/shuxiu-scarf.jpg', '["蜀绣","围巾","非遗"]', 'on_sale'),
(1, '刺绣', '苏绣', '苏绣荷花屏风', '苏州手工苏绣双面绣荷花屏风', '苏州苏绣大师精心绣制，双面绣工艺，荷花图案，寓意和美美满。', 3680.00, 5, '/uploads/sample/suxiu-screen.jpg', '["苏绣","屏风","高端"]', 'on_sale'),
(1, '漆器', '成都漆艺', '成都漆艺首饰盒', '四川成都漆艺，螺钿镶嵌首饰盒', '成都漆艺非遗传承，采用天然大漆，螺钿镶嵌工艺，典雅华贵。', 588.00, 15, '/uploads/sample/qi-box.jpg', '["漆艺","首饰盒","成都"]', 'on_sale'),
(1, '木版年画', '绵竹木版年画', '绵竹门神年画', '四川绵竹木版年画，传统门神', '绵竹木版年画始于明代，色彩鲜艳，线条饱满，传承百年的民俗艺术。', 128.00, 100, '/uploads/sample/wooddoor-god.jpg', '["年画","绵竹","门神"]', 'on_sale'),
(1, '编织', '青神竹编', '青神竹编茶具垫', '四川青神竹编，手工编织茶具垫', '青神竹编采用优质竹丝，手工编织，工艺精细，图案精美。', 88.00, 200, '/uploads/sample/bamboo-mat.jpg', '["竹编","青神","茶具"]', 'on_sale'),
(1, '银饰', '苗族银饰', '苗族手工银手镯', '贵州苗族手工打造，传统苗银手镯', '苗族银饰非遗工艺，手工錾刻，图案精美，佩戴典雅。', 468.00, 40, '/uploads/sample/miao-silver.jpg', '["银饰","苗族","手镯"]', 'on_sale');

-- ============================================================
-- 第十部分: 视图与存储过程
-- ============================================================

-- 10.1 商家销量统计视图
CREATE OR REPLACE VIEW v_merchant_sales_stats AS
SELECT
    o.merchant_user_id,
    DATE(o.created_at) AS stat_date,
    COUNT(DISTINCT o.id) AS order_count,
    SUM(o.total_amount) AS total_revenue
FROM orders o
WHERE o.status IN ('pending_shipment', 'pending_receipt', 'completed')
GROUP BY o.merchant_user_id, DATE(o.created_at);

-- 10.2 商品销量排行视图
CREATE OR REPLACE VIEW v_product_sales_rank AS
SELECT
    oi.product_id,
    oi.merchant_user_id,
    p.title AS product_title,
    p.cover_image AS product_cover_image,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.subtotal) AS total_amount
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE p.is_deleted = 0
GROUP BY oi.product_id, oi.merchant_user_id, p.title, p.cover_image
ORDER BY total_quantity DESC;

-- ============================================================
-- 附录: 权限说明
-- ============================================================
-- 角色说明:
--   buyer  - 普通买家: 浏览商品、购物车、下单、评价
--   artisan - 非遗手艺人商家: 发布商品、管理订单、处理售后、查看统计
--   admin  - 平台管理员: 全权限管理、用户管理、投诉处理
--
-- 订单状态流转:
--   pending_payment → paid → pending_shipment → shipped → completed
--                           ↘ cancelled
--
-- 支付方式:
--   wechat(微信) / alipay(支付宝) / bank_transfer(银行卡) / balance(余额)
--
-- 售后类型:
--   refund(仅退款) / return(退货退款) / exchange(换货)