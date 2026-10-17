-- ============================================================
--  华夏风物 · 非遗传承平台 —— MySQL 建表脚本
-- ------------------------------------------------------------
--  设计依据：
--    1) 项目内已有的 DATABASE_ER_SCHEMA 设计（表名、字段类型、索引命名）
--    2) server.js 中实际读写的字段（补齐设计文档未覆盖的运行期字段）
--  说明：
--    - 字符集统一 utf8mb4，支持中文与 emoji
--    - 时间字段用 DATETIME，读写时由 db/repositories 统一转换 ISO 字符串
--    - 数组/对象类型字段用 JSON 存储（tags、images、items、logistics 等）
--    - 执行方式：node db/init.js （自动建表），或 mysql < db/schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------- 用户主表（买家 / 匠人商家 / 管理员）----------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(64)  NOT NULL COMMENT '登录用户名',
  `password`      VARCHAR(255) NOT NULL COMMENT 'bcrypt 哈希后的密码',
  `role`          VARCHAR(32)  NOT NULL DEFAULT 'user' COMMENT 'user/developer/buyer/artisan/admin',
  `registration_role` VARCHAR(32) NOT NULL DEFAULT 'buyer' COMMENT '注册时选择的登录身份',
  `display_name`  VARCHAR(128) NOT NULL DEFAULT '' COMMENT '展示昵称',
  `phone`         VARCHAR(32)  NOT NULL DEFAULT '',
  `avatar`        VARCHAR(255) NOT NULL DEFAULT '',
  `addresses`     JSON         NULL COMMENT '地址快照（历史字段，主数据在 addresses 表）',
  `status`        VARCHAR(32)  NOT NULL DEFAULT 'active',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户主表';

-- ---------- 商家扩展资料 ----------
CREATE TABLE IF NOT EXISTS `merchants` (
  `id`                   BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`              BIGINT       NOT NULL COMMENT '关联 users.id',
  `shop_name`            VARCHAR(128) NOT NULL DEFAULT '',
  `intro`                TEXT         NULL,
  `heritage_category`    VARCHAR(128) NOT NULL DEFAULT '',
  `contact_phone`        VARCHAR(32)  NOT NULL DEFAULT '',
  `qualification_note`   TEXT         NULL,
  `status`               VARCHAR(32)  NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  `approved_by`          BIGINT       NULL COMMENT '批准该申请的开发者 users.id',
  `certification_status` VARCHAR(32)  NOT NULL DEFAULT 'none',
  `permissions`          JSON         NULL COMMENT '权限标识数组',
  `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_merchants_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商家扩展资料表';

-- ---------- 商品主表 ----------
CREATE TABLE IF NOT EXISTS `products` (
  `id`                  BIGINT        NOT NULL AUTO_INCREMENT,
  `merchant_id`         BIGINT        NULL,
  `merchant_user_id`    BIGINT        NULL COMMENT '关联 users.id（匠人）',
  `merchant_name`       VARCHAR(128)  NOT NULL DEFAULT '',
  `title`               VARCHAR(255)  NOT NULL,
  `subtitle`            VARCHAR(255)  NOT NULL DEFAULT '',
  `brief`               VARCHAR(500)  NOT NULL DEFAULT '',
  `description`         TEXT          NULL,
  `detail_description`  TEXT          NULL,
  `price`               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `stock`               INT           NOT NULL DEFAULT 0,
  `category`            VARCHAR(128)  NOT NULL DEFAULT '非遗手作',
  `tags`                JSON          NULL,
  `specifications`      JSON          NULL COMMENT '规格选项',
  `cover_image`         VARCHAR(255)  NOT NULL DEFAULT '',
  `main_images`         JSON          NULL,
  `detail_images`       JSON          NULL,
  `video_url`           VARCHAR(255)  NOT NULL DEFAULT '',
  `model_url`           VARCHAR(255)  NOT NULL DEFAULT '' COMMENT '3D 模型地址',
  `story`               TEXT          NULL COMMENT '器物故事',
  `artisan_intro`       TEXT          NULL COMMENT '匠人介绍',
  `heritage_background` TEXT          NULL COMMENT '非遗背景',
  `is_recommended`      TINYINT(1)    NOT NULL DEFAULT 0,
  `recommend_reason`    VARCHAR(500)  NOT NULL DEFAULT '',
  `featured_section`    VARCHAR(128)  NOT NULL DEFAULT '',
  `sales_count`         INT           NOT NULL DEFAULT 0,
  `status`              VARCHAR(32)   NOT NULL DEFAULT 'published' COMMENT 'published/unpublished/deleted',
  `is_deleted`          TINYINT(1)    NOT NULL DEFAULT 0,
  `created_at`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_merchant_user_id` (`merchant_user_id`),
  KEY `idx_products_category` (`category`),
  KEY `idx_products_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品主表';

-- ---------- 收货地址 ----------
CREATE TABLE IF NOT EXISTS `addresses` (
  `id`             BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`        BIGINT       NOT NULL,
  `recipient_name` VARCHAR(64)  NOT NULL,
  `phone`          VARCHAR(32)  NOT NULL,
  `province`       VARCHAR(64)  NOT NULL DEFAULT '',
  `city`           VARCHAR(64)  NOT NULL DEFAULT '',
  `district`       VARCHAR(64)  NOT NULL DEFAULT '',
  `detail`         VARCHAR(255) NOT NULL DEFAULT '',
  `is_default`     TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_addresses_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收货地址表';

-- ---------- 商品收藏 ----------
CREATE TABLE IF NOT EXISTS `favorites` (
  `id`         BIGINT   NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT   NOT NULL,
  `product_id` BIGINT   NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_favorites_user_product` (`user_id`, `product_id`),
  KEY `idx_favorites_user_id` (`user_id`),
  KEY `idx_favorites_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收藏表';

-- ---------- 购物车（支持登录用户与游客）----------
CREATE TABLE IF NOT EXISTS `carts` (
  `id`            BIGINT        NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT        NULL COMMENT '登录用户；游客为空',
  `guest_id`      VARCHAR(128)  NULL COMMENT '游客标识',
  `product_id`    BIGINT        NOT NULL,
  `title`         VARCHAR(255)  NOT NULL DEFAULT '',
  `price`         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `quantity`      INT           NOT NULL DEFAULT 1,
  `cover_image`   VARCHAR(255)  NOT NULL DEFAULT '',
  `merchant_id`   BIGINT        NULL,
  `merchant_name` VARCHAR(128)  NOT NULL DEFAULT '',
  `selected`      TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_carts_user_id` (`user_id`),
  KEY `idx_carts_guest_id` (`guest_id`),
  KEY `idx_carts_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购物车表';

-- ---------- 订单主表 ----------
CREATE TABLE IF NOT EXISTS `orders` (
  `id`                   BIGINT        NOT NULL AUTO_INCREMENT,
  `order_no`             VARCHAR(64)   NOT NULL,
  `user_id`              BIGINT        NOT NULL,
  `buyer_id`             BIGINT        NULL,
  `buyer_name`           VARCHAR(128)  NOT NULL DEFAULT '',
  `address_id`           BIGINT        NULL,
  `shipping_address`     JSON          NULL COMMENT '下单时的地址快照',
  `remarks`              TEXT          NULL,
  `coupon_code`          VARCHAR(64)   NOT NULL DEFAULT '',
  `coupon_desc`          VARCHAR(255)  NOT NULL DEFAULT '',
  `subtotal`             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `shipping_fee`         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount`      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount`         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status`               VARCHAR(32)   NOT NULL DEFAULT 'pending_payment',
  `items`                JSON          NULL COMMENT '订单明细快照',
  `payment`              JSON          NULL COMMENT '当前支付状态',
  `payment_logs`         JSON          NULL COMMENT '支付日志',
  `payment_credentials`  JSON          NULL COMMENT '支付凭据',
  `created_at`           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_order_no` (`order_no`),
  KEY `idx_orders_user_id` (`user_id`),
  KEY `idx_orders_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单主表';

-- ---------- 订单明细 ----------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id`          BIGINT        NOT NULL AUTO_INCREMENT,
  `order_id`    BIGINT        NOT NULL,
  `product_id`  BIGINT        NOT NULL,
  `title`       VARCHAR(255)  NOT NULL DEFAULT '',
  `price`       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `quantity`    INT           NOT NULL DEFAULT 1,
  `cover_image` VARCHAR(255)  NOT NULL DEFAULT '',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

-- ---------- 售后申请 ----------
CREATE TABLE IF NOT EXISTS `after_sales` (
  `id`            VARCHAR(64)   NOT NULL COMMENT '形如 as_时间戳_随机串',
  `order_id`      BIGINT        NULL,
  `order_no`      VARCHAR(64)   NOT NULL DEFAULT '',
  `user_id`       BIGINT        NOT NULL,
  `type`          VARCHAR(32)   NOT NULL DEFAULT 'refund' COMMENT 'refund/return/exchange/refund_only',
  `reason`        TEXT          NULL,
  `amount`        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `description`   TEXT          NULL,
  `logistics`     JSON          NULL,
  `status`        VARCHAR(32)   NOT NULL DEFAULT 'pending_review',
  `reviewed_by`   BIGINT        NULL,
  `review_remark` TEXT          NULL,
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_after_sales_order_id` (`order_id`),
  KEY `idx_after_sales_user_id` (`user_id`),
  KEY `idx_after_sales_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='售后申请表';

-- ---------- 商品评价 ----------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id`               VARCHAR(64) NOT NULL COMMENT '形如 review_时间戳_随机串',
  `order_id`         BIGINT      NULL,
  `order_no`         VARCHAR(64) NOT NULL DEFAULT '',
  `product_id`       BIGINT      NULL,
  `user_id`          BIGINT      NOT NULL,
  `user_name`        VARCHAR(128) NOT NULL DEFAULT '',
  `rating`           TINYINT     NOT NULL DEFAULT 5,
  `content`          TEXT        NULL,
  `experience`       TEXT        NULL,
  `files`            JSON        NULL COMMENT '评价图片/视频',
  `parent_review_id` BIGINT      NULL COMMENT '追评指向的原评价',
  `status`           VARCHAR(32) NOT NULL DEFAULT 'approved',
  `reply`            JSON        NULL COMMENT '商家回复',
  `reply_at`         DATETIME    NULL,
  `is_hidden`        TINYINT(1)  NOT NULL DEFAULT 0,
  `is_blocked`       TINYINT(1)  NOT NULL DEFAULT 0,
  `created_at`       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_product_id` (`product_id`),
  KEY `idx_reviews_user_id` (`user_id`),
  KEY `idx_reviews_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品评价表';

-- ---------- 会话（买家 ↔ 匠人/开发者）----------
CREATE TABLE IF NOT EXISTS `conversations` (
  `id`           BIGINT   NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT   NOT NULL,
  `developer_id` BIGINT   NOT NULL,
  `product_id`   BIGINT   NULL,
  `product_name` VARCHAR(255) NOT NULL DEFAULT '',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conversations_user_id` (`user_id`),
  KEY `idx_conversations_developer_id` (`developer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='咨询会话表';

-- ---------- 消息 ----------
CREATE TABLE IF NOT EXISTS `messages` (
  `id`              BIGINT       NOT NULL AUTO_INCREMENT,
  `conversation_id` BIGINT       NOT NULL,
  `sender_id`       BIGINT       NOT NULL,
  `content`         TEXT         NULL,
  `file_path`       VARCHAR(255) NOT NULL DEFAULT '',
  `file_type`       VARCHAR(128) NOT NULL DEFAULT '' COMMENT 'image/视频 MIME 类型',
  `file_name`       VARCHAR(255) NOT NULL DEFAULT '',
  `is_read`         TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_conversation_id` (`conversation_id`),
  KEY `idx_messages_sender_id` (`sender_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息表';

-- ---------- 投诉 / 纠纷 ----------
CREATE TABLE IF NOT EXISTS `complaints` (
  `id`          VARCHAR(64)  NOT NULL COMMENT '形如 complaint_时间戳_随机串',
  `order_id`    BIGINT       NULL,
  `order_no`    VARCHAR(64)  NOT NULL DEFAULT '',
  `user_id`     BIGINT       NOT NULL,
  `type`        VARCHAR(32)  NOT NULL DEFAULT 'complaint' COMMENT 'complaint/dispute',
  `reason`      VARCHAR(255) NOT NULL DEFAULT '',
  `description` TEXT         NULL,
  `evidence`    JSON         NULL,
  `status`      VARCHAR(32)  NOT NULL DEFAULT 'pending',
  `remark`      TEXT         NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_complaints_order_id` (`order_id`),
  KEY `idx_complaints_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投诉/纠纷表';

-- ---------- 好友关系 ----------
CREATE TABLE IF NOT EXISTS `friends` (
  `id`           BIGINT      NOT NULL AUTO_INCREMENT,
  `from_user_id` BIGINT      NOT NULL COMMENT '发起方',
  `to_user_id`   BIGINT      NOT NULL COMMENT '接收方',
  `status`       VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'pending/accepted/rejected',
  `created_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_friends_pair` (`from_user_id`, `to_user_id`),
  KEY `idx_friends_to_user_id` (`to_user_id`),
  KEY `idx_friends_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='好友关系表';

SET FOREIGN_KEY_CHECKS = 1;
