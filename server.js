// 读取 .env 配置（零依赖实现，见 lib/env.js；部署时可用真实环境变量覆盖）
require('./lib/env').load();

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { accessLogger } = require('./lib/logger');

const app = express();

// ============ 服务配置（全部支持环境变量，便于部署到服务器）============
const PORT = Number(process.env.PORT) || 3000;
// 监听所有网卡，外部才能访问；本地开发同样适用
const HOST = process.env.HOST || '0.0.0.0';

// JWT 签名密钥：生产必须通过 .env 注入，否则给出告警（不硬编码真实密钥）
const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || DEV_JWT_SECRET;
const PAYMENT_CALLBACK_TOKEN = process.env.PAYMENT_CALLBACK_TOKEN || 'dev-placeholder-payment';

// bcrypt 强度因子（cost）：每 +1 计算耗时翻倍。10 为旧值，12 为当前推荐值。
// 老用户的哈希会在下次成功登录时自动升级（见 /api/login 的惰性重哈希）。
const BCRYPT_COST = Number(process.env.BCRYPT_COST) || 12;

// 登录防爆破：按「用户名|IP」统计失败次数
const LOGIN_MAX_FAILURES = 5;              // 窗口内允许的最大失败次数
const LOGIN_WINDOW_MS = 15 * 60 * 1000;    // 统计窗口 15 分钟
const LOGIN_LOCK_MS = 15 * 60 * 1000;      // 触发后锁定 15 分钟
const loginFailures = new Map();           // key -> { count, firstAt, lockedUntil }

// 取「用户名|IP」作为限流键（同时按账号与来源 IP 限制，避免仅换账号或仅换 IP 即绕过）
function loginKey(username, req) {
    const ip = (req.ip || req.connection?.remoteAddress || 'unknown').toString();
    return `${String(username || '').toLowerCase()}|${ip}`;
}

/**
 * 检查是否处于锁定状态
 * @returns {number} 剩余锁定秒数；0 表示未锁定
 */
function loginLockRemaining(key) {
    const rec = loginFailures.get(key);
    if (!rec || !rec.lockedUntil) return 0;
    const remain = rec.lockedUntil - Date.now();
    if (remain <= 0) {
        loginFailures.delete(key);   // 锁定期已过，清零重新计数
        return 0;
    }
    return Math.ceil(remain / 1000);
}

/** 记录一次登录失败，必要时进入锁定 */
function recordLoginFailure(key) {
    const now = Date.now();
    const rec = loginFailures.get(key);
    // 超出统计窗口则重新计数
    if (!rec || now - rec.firstAt > LOGIN_WINDOW_MS) {
        loginFailures.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
        return;
    }
    rec.count += 1;
    if (rec.count >= LOGIN_MAX_FAILURES) {
        rec.lockedUntil = now + LOGIN_LOCK_MS;
    }
}

/** 登录成功：清除失败记录 */
function clearLoginFailures(key) {
    loginFailures.delete(key);
}

// 允许跨域的来源白名单（逗号分隔）。留空 = 不开放跨域（同源部署无需跨域，最安全）
const CORS_ORIGINS = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const ALLOWED_PAYMENT_METHODS = ['alipay', 'wechat', 'bank'];
const ROLE_TYPES = {
    BUYER: 'buyer',
    ARTISAN: 'artisan',
    ADMIN: 'admin'
};

function normalizeRole(role) {
    if (!role) return ROLE_TYPES.BUYER;
    if (role === 'user' || role === 'buyer') return ROLE_TYPES.BUYER;
    if (role === 'developer' || role === 'artisan') return ROLE_TYPES.ARTISAN;
    if (role === ROLE_TYPES.ADMIN) return ROLE_TYPES.ADMIN;
    return role;
}

function isBuyerRole(role) {
    return normalizeRole(role) === ROLE_TYPES.BUYER;
}

function isArtisanRole(role) {
    return normalizeRole(role) === ROLE_TYPES.ARTISAN;
}

function isValidRole(role) {
    return Object.values(ROLE_TYPES).includes(normalizeRole(role));
}

function getRegistrationRole(user, db = loadDB()) {
    if (user.registration_role) return normalizeRole(user.registration_role);
    const isApprovedMerchant = db.merchants.some(merchant =>
        String(merchant.user_id) === String(user.id) && merchant.status === 'approved');
    return normalizeRole(user.role) === ROLE_TYPES.ARTISAN && isApprovedMerchant
        ? ROLE_TYPES.BUYER
        : normalizeRole(user.role);
}

function requireRole(requiredRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: '请先登录' });
        const role = normalizeRole(req.user.role);
        if (!requiredRoles.includes(role)) {
            return res.status(403).json({ error: '当前角色无权限访问此接口' });
        }
        next();
    };
}

function requireDeveloperApprover(req, res, next) {
    const db = loadDB();
    const user = db.users.find(item => String(item.id) === String(req.user.id));
    if (!user) return res.status(401).json({ error: '用户不存在，请重新登录' });

    const registrationRole = getRegistrationRole(user, db);
    if (![ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN].includes(registrationRole)) {
        return res.status(403).json({ error: '只有开发者或管理员可以审核商家申请' });
    }
    next();
}

function requireApprovedMerchant(req, res, next) {
    const db = loadDB();
    const merchant = db.merchants.find(m => m.user_id === req.user.id);
    if (!merchant) return res.status(403).json({ error: '请先提交商家入驻申请' });
    if (merchant.status !== 'approved') {
        return res.status(403).json({ error: '商家申请通过审核后才能管理或上架商品' });
    }
    req.merchant = merchant;
    next();
}

function isPublishedMerchantProduct(db, product) {
    const merchant = db.merchants.find(item =>
        (product.merchant_user_id != null && item.user_id === product.merchant_user_id) ||
        (product.merchant_id != null && item.id === product.merchant_id));
    return product.status === 'published' && !product.is_deleted && merchant?.status === 'approved';
}

const BUSINESS_FLOW = {
    name: '非遗电商业务完整流程',
    summary: '注册与入驻 → 商品上架与展示 → 购物车与下单 → 支付 → 商家发货 → 收货与评价 → 售后与客服 → 数据统计',
    stages: [
        {
            id: 'user',
            name: '用户与商家入驻',
            steps: [
                '用户注册',
                '角色选择：普通买家 / 非遗手艺人商家',
                '登录校验',
                '完善个人资料或店铺资料',
                '提交资质并等待审核',
                '入驻成功后进入对应后台'
            ]
        },
        {
            id: 'product',
            name: '商品管理与展示',
            steps: [
                '商家发布商品',
                '填写商品标题、简介、详情',
                '上传封面图、主图、详情图和视频',
                '配置分类、标签、规格、库存和价格',
                '设置上下架状态',
                '买家浏览、搜索、筛选和详情查看'
            ]
        },
        {
            id: 'cart',
            name: '购物车与订单创建',
            steps: [
                '买家加入购物车',
                '修改数量和勾选商品',
                '计算商品金额、运费和优惠',
                '选择收货地址',
                '提交订单确认',
                '生成订单号，状态变为待付款'
            ]
        },
        {
            id: 'payment',
            name: '支付与状态流转',
            steps: [
                '买家选择支付方式',
                '发起支付请求',
                '支付回调和金额校验',
                '支付成功后状态变为已付款',
                '商家确认订单并进入待发货',
                '订单状态持续流转：待付款 → 已付款 → 待发货 → 已发货 → 已完成'
            ]
        },
        {
            id: 'shipping',
            name: '商家订单管理与发货',
            steps: [
                '商家查看订单列表',
                '筛选和查询订单',
                '确认订单数据信息',
                '填写物流公司和运单号',
                '执行发货',
                '订单状态更新为已发货'
            ]
        },
        {
            id: 'after-sales',
            name: '售后与客服',
            steps: [
                '买家申请退款、退货、换货或仅退款',
                '填写售后原因和物流信息',
                '商家审核并做出批准或拒绝',
                '处理退货物流和退款结果',
                '商家回复买家咨询',
                '处理投诉和纠纷工单'
            ]
        },
        {
            id: 'review',
            name: '评价与口碑',
            steps: [
                '买家确认收货',
                '提交评分和评价内容',
                '上传图片或视频',
                '商家回复评价',
                '平台处理违规内容',
                '统计好评率和口碑数据'
            ]
        },
        {
            id: 'analytics',
            name: '数据统计与经营分析',
            steps: [
                '统计销量',
                '统计收入',
                '分析订单趋势',
                '统计热门商品',
                '输出商家经营报表',
                '支持后续运营优化'
            ]
        }
    ],
    mermaid: `flowchart TD
    A[用户注册与入驻] --> B[角色选择与登录]
    B --> C[完善个人资料/店铺资料]
    C --> D[提交资质审核]
    D --> E[商家后台启用]
    E --> F[商品发布与管理]
    F --> G[买家浏览与搜索]
    G --> H[加入购物车]
    H --> I[下单确认]
    I --> J[支付]
    J --> K[订单状态流转]
    K --> L[商家发货]
    L --> M[买家收货]
    M --> N[评价]
    N --> O[售后与客服]
    O --> P[数据统计与分析]
    P --> Q[经营优化]
`
};

const DATABASE_ER_SCHEMA = {
    er_description: {
        summary: '非遗电商数据库采用“用户—商家—商品—订单—支付—售后—评价—客服—统计”主线，核心实体之间关系为：用户创建订单，商家发布商品，商品属于分类/属性，订单包含多个订单项，支付绑定单个订单，售后与投诉挂接订单，评价挂接商品和订单，客服会话关联买家与商家。',
        entities: [
            'users: 用户基础表，统一承载买家、商家、管理员角色信息',
            'merchants: 商家扩展信息表，关联 users.id，保存店铺、资质、认证信息',
            'products: 商品主表，关联 merchants.id，保存商品基础信息和状态',
            'product_categories: 商品分类表，支持层级分类管理',
            'product_attributes: 商品属性表，保存规格、材质、颜色、尺寸等动态属性',
            'orders: 订单主表，关联 users.id 与收货地址',
            'order_items: 订单明细表，关联 orders.id 与 products.id',
            'payments: 支付表，关联 orders.id',
            'after_sales: 售后表，关联 orders.id 与 users.id',
            'reviews: 评价表，关联 users.id、products.id、orders.id',
            'conversations: 咨询会话表，连接买家与商家/平台',
            'messages: 消息详情表，关联 conversations.id 与发送者用户',
            'complaints: 投诉/纠纷表，关联订单和用户',
            'favorites: 收藏表，关联用户和商品',
            'addresses: 收货地址表，关联用户',
            'carts: 购物车表，关联用户/游客和商品'
        ],
        relationships: [
            'users 1:N merchants',
            'users 1:N addresses',
            'users 1:N orders',
            'users 1:N favorites',
            'users 1:N reviews',
            'users 1:N after_sales',
            'users 1:N complaints',
            'merchants 1:N products',
            'products 1:N order_items',
            'products 1:N reviews',
            'orders 1:N order_items',
            'orders 1:1 payments',
            'orders 1:N after_sales',
            'orders 1:N complaints',
            'conversations 1:N messages',
            'users 1:N conversations (buyer side)',
            'users 1:N conversations (merchant side)'
        ]
    },
    tables: [
        {
            table_name: 'users',
            description: '用户主表，承载买家/商家/管理员账户信息',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: ['idx_users_username', 'idx_users_role'] },
                { name: 'username', type: 'varchar(64)', pk: false, nullable: false, default: null, index: ['uniq_users_username'] },
                { name: 'password', type: 'varchar(255)', pk: false, nullable: false, default: null, index: [] },
                { name: 'role', type: 'varchar(32)', pk: false, nullable: false, default: "'buyer'", index: ['idx_users_role'] },
                { name: 'display_name', type: 'varchar(128)', pk: false, nullable: false, default: null, index: ['idx_users_display_name'] },
                { name: 'phone', type: 'varchar(32)', pk: false, nullable: true, default: null, index: ['idx_users_phone'] },
                { name: 'avatar', type: 'varchar(255)', pk: false, nullable: true, default: null, index: [] },
                { name: 'status', type: 'varchar(32)', pk: false, nullable: false, default: "'active'", index: ['idx_users_status'] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: ['idx_users_created_at'] },
                { name: 'updated_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'merchants',
            description: '商家扩展资料表，关联用户表',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'user_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['uniq_merchants_user_id', 'idx_merchants_user_id'] },
                { name: 'shop_name', type: 'varchar(128)', pk: false, nullable: false, default: null, index: ['idx_merchants_shop_name'] },
                { name: 'intro', type: 'text', pk: false, nullable: true, default: null, index: [] },
                { name: 'heritage_category', type: 'varchar(128)', pk: false, nullable: true, default: null, index: ['idx_merchants_category'] },
                { name: 'contact_phone', type: 'varchar(32)', pk: false, nullable: true, default: null, index: [] },
                { name: 'qualification_note', type: 'text', pk: false, nullable: true, default: null, index: [] },
                { name: 'certification_status', type: 'varchar(32)', pk: false, nullable: false, default: "'pending'", index: ['idx_merchants_cert_status'] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: ['idx_merchants_created_at'] },
                { name: 'updated_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'products',
            description: '商品主表',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'merchant_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_products_merchant_id'] },
                { name: 'merchant_user_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_products_merchant_user_id'] },
                { name: 'title', type: 'varchar(255)', pk: false, nullable: false, default: null, index: ['idx_products_title'] },
                { name: 'slug', type: 'varchar(255)', pk: false, nullable: true, default: null, index: ['idx_products_slug'] },
                { name: 'summary', type: 'varchar(500)', pk: false, nullable: true, default: null, index: [] },
                { name: 'description', type: 'text', pk: false, nullable: true, default: null, index: [] },
                { name: 'cover_image', type: 'varchar(255)', pk: false, nullable: true, default: null, index: [] },
                { name: 'images', type: 'json', pk: false, nullable: true, default: null, index: [] },
                { name: 'video_url', type: 'varchar(255)', pk: false, nullable: true, default: null, index: [] },
                { name: 'category_id', type: 'bigint', pk: false, nullable: true, default: null, index: ['idx_products_category_id'] },
                { name: 'tags', type: 'json', pk: false, nullable: true, default: null, index: [] },
                { name: 'price', type: 'decimal(10,2)', pk: false, nullable: false, default: '0.00', index: ['idx_products_price'] },
                { name: 'stock', type: 'int', pk: false, nullable: false, default: '0', index: ['idx_products_stock'] },
                { name: 'sales_count', type: 'int', pk: false, nullable: false, default: '0', index: ['idx_products_sales_count'] },
                { name: 'status', type: 'varchar(32)', pk: false, nullable: false, default: "'draft'", index: ['idx_products_status'] },
                { name: 'is_deleted', type: 'tinyint(1)', pk: false, nullable: false, default: '0', index: ['idx_products_is_deleted'] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: ['idx_products_created_at'] },
                { name: 'updated_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'product_categories',
            description: '商品分类表，支持树状分类和非遗文创品类管理',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'parent_id', type: 'bigint', pk: false, nullable: true, default: null, index: ['idx_product_categories_parent_id'] },
                { name: 'name', type: 'varchar(128)', pk: false, nullable: false, default: null, index: ['idx_product_categories_name'] },
                { name: 'level', type: 'tinyint', pk: false, nullable: false, default: '1', index: ['idx_product_categories_level'] },
                { name: 'sort_order', type: 'int', pk: false, nullable: false, default: '0', index: [] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'product_attributes',
            description: '商品属性表，用于保存规格、材质、尺寸等结构化信息',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'product_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_product_attributes_product_id'] },
                { name: 'attribute_name', type: 'varchar(64)', pk: false, nullable: false, default: null, index: [] },
                { name: 'attribute_value', type: 'varchar(255)', pk: false, nullable: false, default: null, index: [] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'addresses',
            description: '用户收货地址表',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'user_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_addresses_user_id'] },
                { name: 'recipient_name', type: 'varchar(64)', pk: false, nullable: false, default: null, index: [] },
                { name: 'phone', type: 'varchar(32)', pk: false, nullable: false, default: null, index: [] },
                { name: 'province', type: 'varchar(64)', pk: false, nullable: false, default: null, index: [] },
                { name: 'city', type: 'varchar(64)', pk: false, nullable: false, default: null, index: [] },
                { name: 'district', type: 'varchar(64)', pk: false, nullable: false, default: null, index: [] },
                { name: 'detail', type: 'varchar(255)', pk: false, nullable: false, default: null, index: [] },
                { name: 'is_default', type: 'tinyint(1)', pk: false, nullable: false, default: '0', index: ['idx_addresses_default'] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'favorites',
            description: '用户收藏表',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'user_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_favorites_user_id'] },
                { name: 'product_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_favorites_product_id'] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'carts',
            description: '购物车表，支持登录态和游客临时购物车',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'user_id', type: 'bigint', pk: false, nullable: true, default: null, index: ['idx_carts_user_id'] },
                { name: 'guest_id', type: 'varchar(128)', pk: false, nullable: true, default: null, index: ['idx_carts_guest_id'] },
                { name: 'product_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_carts_product_id'] },
                { name: 'merchant_id', type: 'bigint', pk: false, nullable: true, default: null, index: ['idx_carts_merchant_id'] },
                { name: 'quantity', type: 'int', pk: false, nullable: false, default: '1', index: [] },
                { name: 'selected', type: 'tinyint(1)', pk: false, nullable: false, default: '1', index: [] },
                { name: 'price', type: 'decimal(10,2)', pk: false, nullable: false, default: '0.00', index: [] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] },
                { name: 'updated_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'orders',
            description: '订单主表',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'order_no', type: 'varchar(64)', pk: false, nullable: false, default: null, index: ['uniq_orders_order_no'] },
                { name: 'user_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_orders_user_id'] },
                { name: 'buyer_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_orders_buyer_id'] },
                { name: 'address_id', type: 'bigint', pk: false, nullable: true, default: null, index: ['idx_orders_address_id'] },
                { name: 'shipping_address', type: 'json', pk: false, nullable: true, default: null, index: [] },
                { name: 'subtotal', type: 'decimal(10,2)', pk: false, nullable: false, default: '0.00', index: [] },
                { name: 'shipping_fee', type: 'decimal(10,2)', pk: false, nullable: false, default: '0.00', index: [] },
                { name: 'discount_amount', type: 'decimal(10,2)', pk: false, nullable: false, default: '0.00', index: [] },
                { name: 'total_amount', type: 'decimal(10,2)', pk: false, nullable: false, default: '0.00', index: ['idx_orders_total_amount'] },
                { name: 'status', type: 'varchar(32)', pk: false, nullable: false, default: "'pending_payment'", index: ['idx_orders_status'] },
                { name: 'remarks', type: 'text', pk: false, nullable: true, default: null, index: [] },
                { name: 'coupon_code', type: 'varchar(64)', pk: false, nullable: true, default: null, index: [] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: ['idx_orders_created_at'] },
                { name: 'updated_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'order_items',
            description: '订单明细表',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'order_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_order_items_order_id'] },
                { name: 'product_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_order_items_product_id'] },
                { name: 'title', type: 'varchar(255)', pk: false, nullable: false, default: null, index: [] },
                { name: 'price', type: 'decimal(10,2)', pk: false, nullable: false, default: '0.00', index: [] },
                { name: 'quantity', type: 'int', pk: false, nullable: false, default: '1', index: [] },
                { name: 'cover_image', type: 'varchar(255)', pk: false, nullable: true, default: null, index: [] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'payments',
            description: '支付表，保存支付请求、结果和校验状态',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'order_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['uniq_payments_order_id', 'idx_payments_order_id'] },
                { name: 'payment_method', type: 'varchar(32)', pk: false, nullable: false, default: "'alipay'", index: ['idx_payments_method'] },
                { name: 'payment_id', type: 'varchar(128)', pk: false, nullable: true, default: null, index: ['idx_payments_payment_id'] },
                { name: 'amount', type: 'decimal(10,2)', pk: false, nullable: false, default: '0.00', index: [] },
                { name: 'status', type: 'varchar(32)', pk: false, nullable: false, default: "'pending'", index: ['idx_payments_status'] },
                { name: 'result', type: 'varchar(32)', pk: false, nullable: true, default: null, index: [] },
                { name: 'paid_at', type: 'datetime', pk: false, nullable: true, default: null, index: [] },
                { name: 'timeout_at', type: 'datetime', pk: false, nullable: true, default: null, index: [] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] },
                { name: 'updated_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'payment_credentials',
            description: '支付凭证表，用于存储支付回调凭据和校验日志',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'order_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_payment_credentials_order_id'] },
                { name: 'credential_type', type: 'varchar(32)', pk: false, nullable: false, default: null, index: [] },
                { name: 'credential_value', type: 'text', pk: false, nullable: false, default: null, index: [] },
                { name: 'status', type: 'varchar(32)', pk: false, nullable: false, default: "'pending'", index: ['idx_payment_credentials_status'] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'after_sales',
            description: '售后申请表',
            columns: [
                { name: 'id', type: 'varchar(64)', pk: true, nullable: false, default: null, index: [] },
                { name: 'order_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_after_sales_order_id'] },
                { name: 'user_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_after_sales_user_id'] },
                { name: 'type', type: 'varchar(32)', pk: false, nullable: false, default: "'refund'", index: ['idx_after_sales_type'] },
                { name: 'reason', type: 'text', pk: false, nullable: false, default: null, index: [] },
                { name: 'amount', type: 'decimal(10,2)', pk: false, nullable: false, default: '0.00', index: [] },
                { name: 'description', type: 'text', pk: false, nullable: true, default: null, index: [] },
                { name: 'logistics', type: 'json', pk: false, nullable: true, default: null, index: [] },
                { name: 'status', type: 'varchar(32)', pk: false, nullable: false, default: "'pending_review'", index: ['idx_after_sales_status'] },
                { name: 'reviewed_by', type: 'bigint', pk: false, nullable: true, default: null, index: ['idx_after_sales_reviewer'] },
                { name: 'review_remark', type: 'text', pk: false, nullable: true, default: null, index: [] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: ['idx_after_sales_created_at'] },
                { name: 'updated_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'reviews',
            description: '商品评价表',
            columns: [
                { name: 'id', type: 'varchar(64)', pk: true, nullable: false, default: null, index: [] },
                { name: 'order_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_reviews_order_id'] },
                { name: 'product_id', type: 'bigint', pk: false, nullable: true, default: null, index: ['idx_reviews_product_id'] },
                { name: 'user_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_reviews_user_id'] },
                { name: 'rating', type: 'tinyint', pk: false, nullable: false, default: '5', index: ['idx_reviews_rating'] },
                { name: 'content', type: 'text', pk: false, nullable: true, default: null, index: [] },
                { name: 'experience', type: 'text', pk: false, nullable: true, default: null, index: [] },
                { name: 'files', type: 'json', pk: false, nullable: true, default: null, index: [] },
                { name: 'status', type: 'varchar(32)', pk: false, nullable: false, default: "'approved'", index: ['idx_reviews_status'] },
                { name: 'reply', type: 'json', pk: false, nullable: true, default: null, index: [] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: ['idx_reviews_created_at'] },
                { name: 'updated_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'conversations',
            description: '咨询会话表，记录买家与商家/客服之间的会话',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'user_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_conversations_user_id'] },
                { name: 'developer_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_conversations_developer_id'] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: ['idx_conversations_created_at'] }
            ]
        },
        {
            table_name: 'messages',
            description: '消息表，保存对话消息内容',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'conversation_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_messages_conversation_id'] },
                { name: 'sender_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_messages_sender_id'] },
                { name: 'content', type: 'text', pk: false, nullable: true, default: null, index: [] },
                { name: 'file_path', type: 'varchar(255)', pk: false, nullable: true, default: null, index: [] },
                { name: 'file_type', type: 'varchar(128)', pk: false, nullable: true, default: null, index: [] },
                { name: 'file_name', type: 'varchar(255)', pk: false, nullable: true, default: null, index: [] },
                { name: 'is_read', type: 'tinyint(1)', pk: false, nullable: false, default: '0', index: ['idx_messages_is_read'] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: ['idx_messages_created_at'] }
            ]
        },
        {
            table_name: 'complaints',
            description: '投诉/纠纷表',
            columns: [
                { name: 'id', type: 'varchar(64)', pk: true, nullable: false, default: null, index: [] },
                { name: 'order_id', type: 'bigint', pk: false, nullable: true, default: null, index: ['idx_complaints_order_id'] },
                { name: 'user_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_complaints_user_id'] },
                { name: 'type', type: 'varchar(32)', pk: false, nullable: false, default: "'complaint'", index: ['idx_complaints_type'] },
                { name: 'reason', type: 'varchar(255)', pk: false, nullable: false, default: null, index: [] },
                { name: 'description', type: 'text', pk: false, nullable: false, default: null, index: [] },
                { name: 'evidence', type: 'json', pk: false, nullable: true, default: null, index: [] },
                { name: 'status', type: 'varchar(32)', pk: false, nullable: false, default: "'pending'", index: ['idx_complaints_status'] },
                { name: 'remark', type: 'text', pk: false, nullable: true, default: null, index: [] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: ['idx_complaints_created_at'] },
                { name: 'updated_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ]
        },
        {
            table_name: 'coupons',
            description: '优惠券表（可扩展字段）',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'code', type: 'varchar(64)', pk: false, nullable: false, default: null, index: ['uniq_coupons_code'] },
                { name: 'name', type: 'varchar(128)', pk: false, nullable: false, default: null, index: [] },
                { name: 'type', type: 'varchar(32)', pk: false, nullable: false, default: "'full_reduction'", index: [] },
                { name: 'value', type: 'decimal(10,2)', pk: false, nullable: false, default: '0.00', index: [] },
                { name: 'threshold', type: 'decimal(10,2)', pk: false, nullable: true, default: null, index: [] },
                { name: 'valid_from', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] },
                { name: 'valid_to', type: 'datetime', pk: false, nullable: false, default: null, index: ['idx_coupons_valid_to'] },
                { name: 'status', type: 'varchar(32)', pk: false, nullable: false, default: "'active'", index: ['idx_coupons_status'] }
            ]
        }
    ],
    reserved_tables: [
        {
            table_name: 'third_party_product_mapping',
            purpose: '第三方商品映射表，保存平台商品与外部电商/采集源商品的对应关系，便于跨平台比价、商品合并和同步更新。',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'local_product_id', type: 'bigint', pk: false, nullable: false, default: null, index: ['idx_tp_mapping_local_product_id'] },
                { name: 'source_name', type: 'varchar(64)', pk: false, nullable: false, default: null, index: ['idx_tp_mapping_source_name'] },
                { name: 'source_product_id', type: 'varchar(128)', pk: false, nullable: false, default: null, index: ['idx_tp_mapping_source_product_id'] },
                { name: 'source_url', type: 'varchar(512)', pk: false, nullable: true, default: null, index: [] },
                { name: 'mapping_status', type: 'varchar(32)', pk: false, nullable: false, default: "'active'", index: ['idx_tp_mapping_status'] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: ['idx_tp_mapping_created_at'] },
                { name: 'updated_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: [] }
            ],
            index_plan: 'local_product_id + source_name + source_product_id 建立联合唯一索引，避免重复映射。'
        },
        {
            table_name: 'product_crawl_log',
            purpose: '抓取日志表，记录商品抓取任务执行状态、频率和异常信息，便于排查同步问题。',
            columns: [
                { name: 'id', type: 'bigint', pk: true, nullable: false, default: 'AUTO_INCREMENT', index: [] },
                { name: 'source_name', type: 'varchar(64)', pk: false, nullable: false, default: null, index: ['idx_crawl_log_source_name'] },
                { name: 'task_name', type: 'varchar(128)', pk: false, nullable: false, default: null, index: ['idx_crawl_log_task_name'] },
                { name: 'source_product_id', type: 'varchar(128)', pk: false, nullable: true, default: null, index: ['idx_crawl_log_source_product_id'] },
                { name: 'status', type: 'varchar(32)', pk: false, nullable: false, default: "'pending'", index: ['idx_crawl_log_status'] },
                { name: 'request_url', type: 'varchar(512)', pk: false, nullable: true, default: null, index: [] },
                { name: 'response_code', type: 'int', pk: false, nullable: true, default: null, index: [] },
                { name: 'error_message', type: 'text', pk: false, nullable: true, default: null, index: [] },
                { name: 'cost_ms', type: 'int', pk: false, nullable: true, default: null, index: [] },
                { name: 'created_at', type: 'datetime', pk: false, nullable: false, default: 'CURRENT_TIMESTAMP', index: ['idx_crawl_log_created_at'] }
            ],
            index_plan: '按 source_name、status、created_at 建立索引，便于查看抓取成功率和异常轨迹。'
        }
    ],
    notes: [
        '主键统一使用 bigint 或字符串 ID；业务流水号使用 order_no、review_id 等独立字段保证跨表追踪。',
        '索引优先建立在查询字段上：用户账号、角色、订单状态、支付状态、商品状态、时间范围、规格查询等。',
        '为提升性能，建议将订单、支付、售后、评价等高频查询表按 created_at 和 status 组合建立索引。',
        '第三方商品映射表與抓取日志表需在后续数据采集模块实现时引入，当前已预留接口和设计位置。'
    ]
};

const API_RESTFUL_SPEC = {
    title: 'RESTful 接口通用规范',
    summary: '遵循统一资源定位、统一请求方式和统一响应结构，使用 HTTP Method 映射 CRUD，所有接口返回统一 JSON 格式，并通过状态码和错误码区分成功与失败。',
    resource_rules: [
        '资源命名统一使用名词复数，如 /api/users、/api/orders、/api/products。',
        '路径中使用 /:id 表示单个资源，子资源使用 /:id/children 表达，如 /api/orders/:id/items。',
        'GET 仅查询，不产生副作用；POST 创建资源；PUT/PATCH 更新资源；DELETE 删除资源。',
        '动作类接口必须避免写入业务动作语义到路径中，建议使用 /status、/pay、/cancel 等状态动作资源。',
        '分页查询使用 page、size 或 page、limit；排序使用 sort 字段。',
        '幂等性要求：PUT、DELETE、PATCH 在业务语义允许情况下应保持幂等；状态更新类接口需显式业务校验。'
    ],
    response_standard: {
        success: {
            code: 200,
            message: 'success',
            data: '具体返回对象或数组'
        },
        created: {
            code: 201,
            message: 'created',
            data: '新建对象'
        },
        bad_request: {
            code: 400,
            message: '参数错误',
            error: '详细错误说明'
        },
        unauthorized: {
            code: 401,
            message: '未登录或令牌失效',
            error: '请先登录'
        },
        forbidden: {
            code: 403,
            message: '无权限',
            error: '当前角色无权限访问此接口'
        },
        not_found: {
            code: 404,
            message: '资源不存在',
            error: '订单不存在'
        },
        server_error: {
            code: 500,
            message: '内部服务错误',
            error: '系统异常'
        }
    },
    conventions: [
        '请求头统一使用 Authorization: Bearer xxx 传递 JWT。',
        '所有接口返回统一使用 JSON，对象字段命名统一采用 snake_case。',
        '日期字段统一使用 ISO-8601 格式，例如 2026-08-08T10:00:00.000Z。',
        '分页返回结构建议为 { items, total, page, size, total_pages }。',
        '查询参数使用 snake_case，如 status、merchant_id、order_no。',
        '错误信息需要明确指出失败原因，避免只返回 generic error。'
    ],
    examples: [
        'GET /api/products?page=1&size=20&status=published',
        'POST /api/orders { "address_id": 12, "coupon_code": "WELCOME" }',
        'PATCH /api/orders/100/status { "status": "shipped" }',
        'POST /api/after-sales { "order_id": 100, "type": "refund", "reason": "质量问题" }'
    ]
};

const PROJECT_LAYER_ARCHITECTURE = {
    title: '项目分层架构规范',
    description: '建议采用 Controller / Service / Mapper（Repository） / Utils 的四层或五层分层结构，将 HTTP、业务、数据访问、工具方法分离，保障职责清晰和扩展性。',
    layers: [
        {
            name: 'Controller',
            responsibility: '接收 HTTP 请求，参数校验，调用 Service，返回统一响应。',
            files: [
                'UserController',
                'ProductController',
                'OrderController',
                'PaymentController',
                'AfterSalesController',
                'MerchantController'
            ],
            rules: [
                '不写复杂业务逻辑，只负责参数解析与返回封装。',
                '尽量保持方法短小，单个接口只做一类事情。',
                '通过统一异常处理器捕获业务异常。'
            ]
        },
        {
            name: 'Service',
            responsibility: '承载核心业务逻辑，协调多个 Mapper、校验状态、生成订单、处理支付和售后流程。',
            files: [
                'UserService',
                'ProductService',
                'CartService',
                'OrderService',
                'PaymentService',
                'AfterSalesService',
                'MerchantService',
                'AnalyticsService'
            ],
            rules: [
                '事务性逻辑集中在 Service 层。',
                '状态流转规则必须在 Service 中统一处理。',
                '不要在 Controller 中直接操作数据库。'
            ]
        },
        {
            name: 'Mapper / Repository',
            responsibility: '负责数据持久化访问，封装数据库查询、写入和复杂 SQL。',
            files: [
                'UserMapper',
                'ProductMapper',
                'OrderMapper',
                'PaymentMapper',
                'AfterSalesMapper',
                'ReviewMapper',
                'ComplaintMapper'
            ],
            rules: [
                '只负责 CRUD 和数据访问，不写业务判断。',
                '结果集推荐转换为 DTO / VO 对象。',
                '名称统一为 Mapper 或 Repository。'
            ]
        },
        {
            name: 'Utils / Common',
            responsibility: '放通用工具方法，如加解密、时间处理、分页、校验、序列号生成、图片处理。',
            files: [
                'JwtUtil',
                'PasswordUtil',
                'DateUtil',
                'PageUtil',
                'IdGeneratorUtil',
                'FileUploadUtil',
                'MoneyUtil',
                'ValidationUtil'
            ],
            rules: [
                '方法需具备可复用性和无状态性。',
                '工具类不能依赖 Controller 或 Service 实例。',
                '统一处理排序、分页、金额格式化等通用能力。'
            ]
        }
    ],
    recommended_package_structure: {
        root: [
            'controller',
            'service',
            'mapper',
            'entity',
            'dto',
            'vo',
            'utils',
            'config',
            'exception',
            'middleware',
            'constants',
            'docs'
        ],
        example: [
            'controller/UserController.java',
            'service/UserService.java',
            'service/impl/UserServiceImpl.java',
            'mapper/UserMapper.java',
            'entity/User.java',
            'dto/UserLoginRequest.java',
            'vo/UserInfoVO.java',
            'utils/JwtUtil.java',
            'exception/BusinessException.java',
            'config/SwaggerConfig.java'
        ]
    },
    coding_principles: [
        'Controller 只负责请求响应，Service 管理业务流程，Mapper 管理数据访问。',
        'DTO 用于接收参数，VO 用于输出数据，Entity 用于持久化结构。',
        '统一处理异常，避免在各层随意抛出裸异常。',
        '模块职责单一，避免“胖控制器”和“万能 Service”。',
        '业务状态字段和枚举统一管理，避免魔法字符串散落在代码里。'
    ]
};

const STAGE_DELIVERY_CHECKLIST = {
    phase: '本阶段交付物清单',
    version: 'v1.0',
    core_objective: '完成非遗电商业务需求梳理、设计方案整理和可运行的后端基础原型交付。',
    deliverables: [
        {
            category: '业务与需求交付',
            items: [
                '完整梳理非遗电商主业务流程：注册入驻、商品管理、购物车、订单、支付、售后、评价、商家后台、数据统计。',
                '输出标准化业务流程图说明，覆盖从用户到商家、从浏览到成交的全链路。',
                '明确角色划分：普通买家、非遗手艺人商家、平台管理员。',
                '设计关键功能模块与状态流转，确保后续开发基于统一业务规则。'
            ]
        },
        {
            category: '数据模型交付',
            items: [
                '输出数据库 ER 图文字描述。',
                '设计核心表结构：users、merchants、products、product_categories、orders、order_items、payments、after_sales、reviews、complaints 等。',
                '设计字段、类型、主键、索引与说明，满足业务查询和扩展需求。',
                '预留第三方商品映射表 third_party_product_mapping 和抓取日志表 product_crawl_log 的落地位置。'
            ]
        },
        {
            category: '接口与架构交付',
            items: [
                '输出 RESTful 接口通用规范，包括 URL、HTTP Method、统一返回结构、状态码约定。',
                '输出项目分层架构规范：Controller / Service / Mapper / Utils / DTO / VO。',
                '明确开发职责边界，支持后续真实项目按模块拆分。'
            ]
        },
        {
            category: '代码实现交付',
            items: [
                '实现通用后端入口，支持 JSON 数据持久化与静态资源访问。',
                '实现用户认证与授权：注册、登录、JWT 校验、角色鉴权。',
                '实现普通买家功能：浏览、搜索、收藏、购物车、下单、支付、评价。',
                '实现非遗手艺人商家功能：入驻、商品发布、库存管理、订单处理、发货、售后审核。',
                '实现平台通用功能：客服会话、投诉处理、数据查询与统计。'
            ]
        },
        {
            category: '模块级成果',
            items: [
                '商品基础管理：分类、属性、价格、库存、上下架。',
                '商品内容管理：详情、图片、视频、富文本描述。',
                '商品展示与检索：筛选、搜索、推荐、详情页。',
                '购物车模块：添加、删除、数量调整、选中结算。',
                '订单模块：创建订单、状态流转、订单查询、订单管理。',
                '支付模块：支付方式选择、支付记录、回调验证。',
                '售后模块：退换货、退款、物流信息、审核流程。',
                '评价模块：评价提交、回复、查询、好评率统计。',
                '商家后台模块：商品管理、订单管理、售后客服、数据统计。'
            ]
        }
    ],
    completion_status: '已完成当前阶段设计与基础实现，适合用于汇报、评审和后续真实工程落地。',
    next_stage: [
        '将 JSON 持久化升级为真实 MySQL/PostgreSQL 数据库。',
        '拆分为 Controller / Service / Mapper 真实项目目录结构。',
        '补充前端页面与后端联调脚本。',
        '完善支付网关、物流接口和第三方商品抓取模块。'
    ]
};

// ============ 中间件 ============
// CORS：仅放行白名单来源；未配置则关闭跨域（同源部署无需跨域，避免任意站点调用 API）
app.use(cors(CORS_ORIGINS.length
    ? { origin: CORS_ORIGINS, credentials: true }
    : { origin: false }));
// 安全响应头（零依赖，等价于 helmet 的最小子集）：
//   nosniff         —— 禁止浏览器按内容猜测类型（防 MIME 混淆攻击）
//   SAMEORIGIN      —— 禁止被第三方站点以 iframe 嵌入（防点击劫持）
//   Referrer-Policy —— 跨站请求不泄露完整 URL
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
// 访问日志：记录时间/IP/方法/路径/状态码/耗时（经反向代理时读取真实 IP）
app.use(accessLogger({
    enabled: process.env.LOG_ACCESS !== 'off',
    trustProxy: process.env.TRUST_PROXY === '1'
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ============ 静态资源安全策略 ============
// 背景：原先直接 express.static(__dirname) 会把整个项目目录暴露，
//       导致 /database.json（全部密码哈希、私信）与 /server.js 源码可被任何人下载。
// 策略：① 敏感路径黑名单（源码/配置/数据/依赖/内部目录）→ 404
//       ② 扩展名白名单兜底（只放行前端真正需要的资源类型，含 3D 模型）
const ALLOWED_EXT = new Set([
    // 页面与样式脚本
    '.html', '.htm', '.css', '.js', '.mjs',
    // 图片
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico',
    // 字体
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    // 音视频（消息中心上传的图片/视频）
    '.mp4', '.webm', '.ogg', '.mp3', '.wav',
    // 3D 模型（非遗器物展示页使用）
    '.glb', '.gltf', '.obj', '.mtl', '.fbx', '.stl', '.bin'
]);

// 敏感路径黑名单（即使扩展名合法也一律拒绝）
const SENSITIVE_PATTERNS = [
    /^\/database\.json$/i,              // 数据库（含密码哈希、私信、订单）
    /^\/package(-lock)?\.json$/i,       // 依赖清单
    /^\/server\.js$/i,                  // 后端源码
    /^\/vite\.config\.js$/i,
    /^\/ecosystem\.config\.js$/i,
    /^\/docker-compose\.ya?ml$/i,
    /^\/nginx\.conf/i,
    /^\/(start-server|build-shop)\.bat$/i,
    /^\/\.env/i,                        // 环境变量（密钥）
    /^\/\.git/i,                        // .git / .gitignore / .gitattributes
    /^\/\.claude/i,
    /^\/node_modules(\/|$)/i,
    /^\/db(\/|$)/i,                     // 数据库连接配置与 schema
    /^\/docs(\/|$)/i,                   // 内部文档
    /^\/tests(\/|$)/i,
    /^\/report-gen(\/|$)/i,             // 报告生成脚本
    /^\/heritage-ecommerce-springboot(\/|$)/i,  // 队友的 Java 工程
    /^\/feiyi-ecommerce\/(src|node_modules|package|vite\.config|\.env)/i,
    /^\/uploads\/.*\.(js|json|env|html)$/i      // 上传目录不应存在可执行/配置文件
];

app.use((req, res, next) => {
    let decoded;
    try {
        decoded = decodeURIComponent(req.path);
    } catch (e) {
        return res.status(400).end();   // 非法 URL 编码
    }
    // 阻断路径穿越（.. 与反斜杠）
    if (decoded.includes('..') || decoded.includes('\\')) {
        return res.status(400).end();
    }
    const normalized = decoded.replace(/\/+/g, '/').toLowerCase();

    // ① 敏感路径：伪装成不存在，避免暴露"这里有东西"
    if (SENSITIVE_PATTERNS.some(re => re.test(normalized))) {
        return res.status(404).end();
    }
    // ② 扩展名白名单：带扩展名但不在白名单内（如 .json/.yml/.log/.sql）一律 404
    const ext = path.extname(normalized);
    if (ext && !ALLOWED_EXT.has(ext)) {
        return res.status(404).end();
    }
    next();
});

// 仅托管前端静态资源（dotfiles:'deny' 额外拒绝所有点开头的文件）
app.use(express.static(__dirname, { dotfiles: 'deny' }));

app.get('/api/business-flow', (req, res) => {
    res.json(BUSINESS_FLOW);
});

app.get('/api/business-flow/mermaid', (req, res) => {
    res.type('text/plain');
    res.send(BUSINESS_FLOW.mermaid);
});

app.get('/api/database-er', (req, res) => {
    res.json(DATABASE_ER_SCHEMA);
});

app.get('/api/design/restful-spec', (req, res) => {
    res.json(API_RESTFUL_SPEC);
});

app.get('/api/design/project-architecture', (req, res) => {
    res.json(PROJECT_LAYER_ARCHITECTURE);
});

app.get('/api/design/delivery-checklist', (req, res) => {
    res.json(STAGE_DELIVERY_CHECKLIST);
});

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
const imagesDir = path.join(uploadsDir, 'images');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

// 文件上传配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isVideo = file.mimetype.startsWith('video/');
        cb(null, isVideo ? videosDir : imagesDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, uuidv4() + ext);
    }
});
// 允许上传的扩展名白名单（mime 由客户端提供不可全信，双重要求更稳）
// 注意：不包含 .svg —— 内联 SVG 可携带脚本，存在存储型 XSS 风险
const ALLOWED_UPLOAD_EXT = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
    '.mp4', '.webm', '.ogg', '.mov'
]);
const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    fileFilter: (req, file, cb) => {
        const mimeOk = /^(video\/|image\/)/.test(file.mimetype);
        const ext = path.extname(file.originalname || '').toLowerCase();
        cb(null, mimeOk && ALLOWED_UPLOAD_EXT.has(ext));
    }
});

// ============ 数据层（MySQL）============
// 数据持久化已从 database.json 迁移到 MySQL：
//   - 启动时 db/store.js 把全量数据载入内存（await store.init()）
//   - loadDB() 同步返回内存数据，保持原有同步语义
//   - saveDB() 更新内存并按表差异同步到 MySQL（串行队列，保证写入顺序）
// 这样业务端点代码无需改动，而数据真正落在数据库中，支持备份与 SQL 查询。
const store = require('./db/store');
const dbPool = require('./db/pool');

// 兼容原有调用：获取内存中的数据对象
function loadDB() {
    return store.loadDB();
}

// 兼容原有调用：保存数据到内存并同步至 MySQL
function saveDB(data) {
    return store.saveDB(data);
}

function saveDBDurable(data) {
    return store.saveDBDurable(data);
}

// 内存数据对象，由 store.init() 在服务启动时填充
let db = null;

// ============ 健康检查 ============
// 供 PM2 / Nginx / 负载均衡探活：无需鉴权，返回服务与数据库状态
app.get('/api/health', async (req, res) => {
    const mode = store.getMode();
    if (mode === 'json') {
        const lastErr = store.getLastError();
        return res.status(lastErr ? 503 : 200).json({
            status: lastErr ? 'degraded' : 'ok',
            uptime_seconds: Math.round(process.uptime()),
            db: 'json',
            db_version: null,
            last_persist_error: lastErr ? lastErr.message : null,
            time: new Date().toISOString()
        });
    }

    const ping = await dbPool.ping();
    const lastErr = store.getLastError();
    // 仅以数据库连通性判定健康；持久化错误作为诊断信息返回（避免一次性错误永久置为不健康）
    const healthy = ping.ok;
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        uptime_seconds: Math.round(process.uptime()),
        db: ping.ok ? 'connected' : 'error',
        db_version: ping.version || null,
        last_persist_error: lastErr ? lastErr.message : null,
        time: new Date().toISOString()
    });
});

// ============ 在线状态（presence）============
// 说明：用户活跃时间保存在内存中，属于「实时状态」而非持久数据，
//       因此服务重启后清空是符合预期的语义（与 store.js 的单进程内存模型一致）。
const presence = new Map();                 // userId -> 最近活跃时间戳(ms)
const ONLINE_THRESHOLD_MS = 60 * 1000;      // 60 秒内有心跳/请求即视为「在线」

/** 刷新某用户的活跃时间 */
function touchPresence(userId) {
    if (userId === undefined || userId === null) return;
    presence.set(Number(userId), Date.now());
}

/**
 * 计算用户的在线状态
 * @returns {{is_online:boolean, last_seen:string|null}}
 */
function userStatus(user) {
    const last = presence.get(Number(user.id));
    return {
        is_online: !!last && (Date.now() - last) <= ONLINE_THRESHOLD_MS,
        last_seen: last ? new Date(last).toISOString() : null
    };
}

// ============ 认证中间件 ============
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: '请先登录' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = loadDB().users.find(item => String(item.id) === String(decoded.id));
        if (!user) return res.status(401).json({ error: '用户不存在，请重新登录' });
        req.user = {
            ...decoded,
            id: user.id,
            role: user.role,
            display_name: user.display_name || decoded.display_name
        };
        touchPresence(user.id);   // 任意携带有效令牌的请求都刷新在线状态
        next();
    } catch (e) {
        return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
}

function optionalAuthMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        req.user = null;
        next();
    }
}

function getCartScope(req) {
    const authUserId = req.user ? req.user.id : null;
    let guestId = (req.headers['x-guest-id'] || req.query?.guest_id || req.body?.guest_id || '').toString().trim();
    if (!authUserId && !guestId) {
        guestId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    return { authUserId, guestId };
}

function syncGuestCartToUser(req, db) {
    const { authUserId, guestId } = getCartScope(req);
    if (!authUserId || !guestId) return false;

    const guestItems = db.carts.filter(item => item.guest_id === guestId && item.user_id !== authUserId);
    if (!guestItems.length) return false;

    const userItems = db.carts.filter(item => item.user_id === authUserId);
    guestItems.forEach(guestItem => {
        const existing = userItems.find(item => item.product_id === guestItem.product_id);
        if (existing) {
            existing.quantity = (Number(existing.quantity) || 0) + (Number(guestItem.quantity) || 0);
            existing.selected = existing.selected || guestItem.selected;
            existing.price = guestItem.price;
            existing.updated_at = new Date().toISOString();
        } else {
            db.carts.push({
                ...guestItem,
                user_id: authUserId,
                guest_id: ''
            });
        }
    });

    db.carts = db.carts.filter(item => !(item.guest_id === guestId && item.user_id !== authUserId));
    return true;
}

function buildCartResponse(req, db, items) {
    const { authUserId, guestId } = getCartScope(req);
    const normalizedItems = items.map(item => {
        const product = db.products.find(p => p.id === item.product_id);
        const quantity = Number(item.quantity) || 0;

        let productStatus = 'normal';
        let warning = '';
        let availableStock = 0;
        let currentPrice = Number(item.price) || 0;

        if (!product || !isPublishedMerchantProduct(db, product)) {
            productStatus = 'invalid';
            warning = '该商品已下架、商家尚未通过审核或不存在';
        } else {
            availableStock = Number(product.stock) || 0;
            currentPrice = Number(product.price) || currentPrice;
            if (availableStock <= 0) {
                productStatus = 'out_of_stock';
                warning = '当前库存不足';
            } else if (availableStock < quantity) {
                productStatus = 'stock_warning';
                warning = `当前仅剩 ${availableStock} 件`; 
            }
        }

        return {
            ...item,
            product_status: productStatus,
            warning,
            available_stock: availableStock,
            current_price: currentPrice,
            is_valid: productStatus === 'normal'
        };
    });

    const selectedItems = normalizedItems.filter(item => item.selected !== false);
    const totalQuantity = normalizedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalPrice = normalizedItems.reduce((sum, item) => sum + (Number(item.current_price) || 0) * (Number(item.quantity) || 0), 0);
    const selectedPrice = selectedItems.reduce((sum, item) => sum + (Number(item.current_price) || 0) * (Number(item.quantity) || 0), 0);

    const warnings = normalizedItems
        .filter(item => item.warning)
        .map(item => ({ product_id: item.product_id, title: item.title, warning: item.warning }));

    return {
        items: normalizedItems,
        summary: {
            totalQuantity,
            totalPrice,
            selectedCount: selectedItems.length,
            selectedPrice
        },
        warnings,
        guest_id: guestId || null,
        is_guest: !authUserId,
        invalid_count: normalizedItems.filter(item => item.product_status === 'invalid').length,
        stock_warning_count: normalizedItems.filter(item => item.product_status === 'stock_warning' || item.product_status === 'out_of_stock').length
    };
}

function getCouponRule(code) {
    const normalized = String(code || '').trim().toUpperCase();
    const rules = {
        WELCOME10: { type: 'percent', value: 10, minAmount: 100, maxDiscount: 20, desc: '新用户折扣' },
        FULL200: { type: 'fixed', value: 20, minAmount: 200, desc: '满200减20' }
    };
    return rules[normalized] || null;
}

function calculateSettlement(items, couponCode) {
    const selectedItems = (items || []).filter(item => item.selected !== false);
    const subtotal = selectedItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    const shippingFee = subtotal >= 200 ? 0 : 10;

    let discountAmount = 0;
    let coupon = null;

    if (couponCode) {
        const rule = getCouponRule(couponCode);
        if (rule && subtotal >= rule.minAmount) {
            if (rule.type === 'percent') {
                discountAmount = Math.min(Math.round(subtotal * rule.value / 100), rule.maxDiscount || subtotal);
            } else if (rule.type === 'fixed') {
                discountAmount = Math.min(rule.value, subtotal);
            }
            coupon = { code: String(couponCode).trim().toUpperCase(), ...rule };
        }
    }

    const payableAmount = Math.max(0, subtotal - discountAmount + shippingFee);
    return {
        selectedItems,
        subtotal,
        shippingFee,
        discountAmount,
        coupon,
        totalAmount: payableAmount
    };
}

function createPaymentRequest(order, paymentMethod = 'alipay') {
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
        payment_id: paymentId,
        order_id: order.id,
        order_no: order.order_no,
        amount: order.total_amount,
        payment_method: paymentMethod,
        status: 'pending',
        qr_code: `/uploads/payments/${paymentMethod}.png`,
        gateway: paymentMethod === 'wechat' ? '微信支付' : paymentMethod === 'bank' ? '银行卡支付' : '支付宝支付',
        created_at: new Date().toISOString()
    };
}

function buildPaymentLog(order, detail, level = 'info') {
    return {
        order_id: order.id,
        order_no: order.order_no,
        level,
        detail,
        created_at: new Date().toISOString()
    };
}

function appendPaymentCredential(order, paymentPayload = {}) {
    const credential = {
        id: `cred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        payment_id: paymentPayload.payment_id || order.payment?.payment_id || `pay_${Date.now()}`,
        order_id: order.id,
        order_no: order.order_no,
        payment_method: paymentPayload.payment_method || 'alipay',
        amount: Number(paymentPayload.amount || order.total_amount || 0),
        status: paymentPayload.status || 'pending',
        created_at: new Date().toISOString(),
        note: paymentPayload.note || ''
    };
    order.payment_credentials = [...(order.payment_credentials || []), credential];
    return credential;
}

function validatePaymentSecurity(order, paymentPayload = {}, reqUser = null) {
    const issues = [];
    const method = String(paymentPayload.payment_method || paymentPayload.method || 'alipay').toLowerCase();
    if (!ALLOWED_PAYMENT_METHODS.includes(method)) {
        issues.push('不支持的支付方式');
    }

    const expectedAmount = Number(order.total_amount || 0);
    const actualAmount = Number(paymentPayload.amount || order.total_amount || 0);
    if (expectedAmount && actualAmount && Math.abs(actualAmount - expectedAmount) > 0.01) {
        issues.push('支付金额与订单金额不一致');
    }

    if (reqUser && order.user_id !== reqUser.id && order.buyer_id !== reqUser.id && normalizeRole(reqUser.role) !== ROLE_TYPES.ADMIN) {
        issues.push('无权操作该订单支付');
    }

    return { valid: issues.length === 0, issues };
}

function verifyOrderPaymentConsistency(order) {
    const payment = order.payment || {};
    const issues = [];
    const orderStatus = order.status;
    const paymentStatus = payment.status;

    if (orderStatus === 'paid' && paymentStatus !== 'success') {
        issues.push('订单已付款，但支付状态不是 success');
    }
    if (orderStatus === 'pending_payment' && ['success', 'timeout'].includes(paymentStatus)) {
        issues.push('待支付订单存在成功/超时的支付状态');
    }
    if (paymentStatus === 'success' && orderStatus !== 'paid') {
        issues.push('支付成功，但订单状态不是 paid');
    }
    if (paymentStatus === 'timeout' && orderStatus === 'paid') {
        issues.push('支付超时，但订单已付款');
    }
    if (payment.amount && order.total_amount && Math.abs(Number(payment.amount) - Number(order.total_amount)) > 0.01) {
        issues.push('支付金额与订单金额不一致');
    }

    return {
        valid: issues.length === 0,
        issues,
        order_status: orderStatus,
        payment_status: paymentStatus,
        payment_amount: payment.amount || null,
        order_amount: order.total_amount || null
    };
}

function createAfterSalesRequest({ order, userId, type, reason, amount, description = '', logistics = null }) {
    const normalizedType = ['refund', 'return', 'exchange', 'refund_only'].includes(type) ? type : 'refund';
    const requestAmount = Number(amount || order.total_amount || 0);
    return {
        id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        order_id: order.id,
        order_no: order.order_no,
        user_id: userId,
        type: normalizedType,
        reason: reason || '未提供原因',
        amount: requestAmount,
        description,
        logistics,
        status: 'pending_review',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
}

function buildAfterSalesDecision(request, decision, reviewerId, remark = '') {
    const normalized = String(decision || '').toLowerCase();
    if (normalized === 'reject' || normalized === 'rejected') {
        request.status = 'rejected';
    } else if (normalized === 'approve' || normalized === 'approved') {
        request.status = 'approved';
    } else if (normalized === 'processing') {
        request.status = 'processing';
    } else if (normalized === 'complete' || normalized === 'completed') {
        request.status = 'completed';
    } else {
        request.status = request.status || 'processing';
    }
    request.reviewed_by = reviewerId;
    request.review_remark = remark || '';
    request.updated_at = new Date().toISOString();
    return request;
}

function updateAfterSalesLogistics(request, logisticsPayload = {}) {
    request.logistics = {
        ...(request.logistics || {}),
        ...logisticsPayload
    };
    request.updated_at = new Date().toISOString();
    return request;
}

function pushAfterSalesNotice(request, message, level = 'info') {
    request.notices = [...(request.notices || []), {
        id: `notice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        message,
        level,
        created_at: new Date().toISOString()
    }];
    request.updated_at = new Date().toISOString();
    return request;
}

function createComplaintTicket({ order, userId, type = 'complaint', reason = '', description = '', evidence = [] }) {
    return {
        id: `complaint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        order_id: order ? order.id : null,
        order_no: order ? order.order_no : '',
        user_id: userId,
        type: ['complaint', 'dispute'].includes(type) ? type : 'complaint',
        reason,
        description,
        evidence: Array.isArray(evidence) ? evidence : [],
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        remark: ''
    };
}

function createReview({ order, user, rating, content, experience, productId, files = [], parentReviewId = null }) {
    return {
        id: `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        order_id: order.id,
        order_no: order.order_no,
        user_id: user.id,
        user_name: user.display_name || user.username || '匿名用户',
        product_id: productId,
        rating: Number(rating) || 5,
        content: content || '',
        experience: experience || '',
        files: Array.isArray(files) ? files : [],
        parent_review_id: parentReviewId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'approved',
        reply: null,
        reply_at: null
    };
}

function buildReviewStats(reviews = []) {
    const total = reviews.length;
    const positiveCount = reviews.filter(item => Number(item.rating) >= 4).length;
    const averageRating = total ? (reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total).toFixed(1) : '0.0';
    return {
        total,
        positive_count: positiveCount,
        positive_rate: total ? Math.round((positiveCount / total) * 100) : 0,
        average_rating: Number(averageRating)
    };
}

function createProductReview({ order, user, productId, rating, content, anonymous }) {
    const now = new Date().toISOString();
    return {
        id: `review_${uuidv4()}`,
        order_id: order.id,
        order_no: order.order_no || '',
        user_id: user.id,
        user_name: anonymous ? '匿名用户' : (user.display_name || user.username || '商城用户'),
        product_id: productId,
        rating,
        content,
        experience: '',
        files: [],
        parent_review_id: null,
        created_at: now,
        updated_at: now,
        status: 'approved',
        reply: null,
        reply_at: null,
        is_hidden: false,
        is_blocked: false
    };
}

function getProductReviewEligibility(db, userId, productId) {
    const user = db.users.find(item => String(item.id) === String(userId));
    if (!user) return { eligible: false, reason: 'login_required' };
    if (getRegistrationRole(user, db) !== ROLE_TYPES.BUYER) {
        return { eligible: false, reason: 'buyer_account_required' };
    }

    const matchingOrders = db.orders.filter(order =>
        (String(order.user_id) === String(user.id) || String(order.buyer_id) === String(user.id)) &&
        Array.isArray(order.items) &&
        order.items.some(item => String(item.product_id) === String(productId)));
    const submittedOrders = matchingOrders.filter(order =>
        !['cancelled', 'refund_pending', 'refunded'].includes(order.status) && !order.is_closed);
    if (!submittedOrders.length) {
        return {
            eligible: false,
            reason: matchingOrders.length ? 'order_not_submitted' : 'purchase_required'
        };
    }

    const order = submittedOrders.find(candidate =>
        !db.reviews.some(review =>
            String(review.order_id) === String(candidate.id) &&
            String(review.product_id) === String(productId) &&
            !review.parent_review_id));
    if (!order) return { eligible: false, reason: 'already_reviewed' };
    return { eligible: true, reason: '', order };
}

function isPublicProductReview(review, productId) {
    return Number(review.product_id) === Number(productId) &&
        (!review.status || review.status === 'approved') &&
        !review.is_hidden &&
        !review.is_blocked;
}

function toPublicProductReview(review) {
    return {
        id: review.id,
        user_name: review.user_name,
        rating: review.rating,
        content: review.content || review.experience || review.additional_content || '',
        created_at: review.created_at
    };
}

function getReviewVisibilityState(review) {
    return {
        is_hidden: Boolean(review.is_hidden),
        is_blocked: Boolean(review.is_blocked),
        status: review.status || 'approved'
    };
}

function createOrderFromItems(db, user, address, items, options = {}) {
    const { coupon_code = '', remarks = '' } = options;
    const settlement = calculateSettlement(items, coupon_code);
    if (!settlement.selectedItems.length) {
        throw new Error('请选择至少一件商品进行结算');
    }

    for (const item of settlement.selectedItems) {
        const product = db.products.find(p => p.id === item.product_id && isPublishedMerchantProduct(db, p));
        if (!product) {
            throw new Error(`商品 ${item.title} 已下架、商家尚未通过审核或不存在`);
        }
        if (product.stock < (Number(item.quantity) || 0)) {
            throw new Error(`商品 ${item.title} 库存不足`);
        }
    }

    const orderId = db.nextId.order ? db.nextId.order++ : 1;
    const orderNo = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderId).padStart(4, '0')}`;
    const now = new Date().toISOString();

    const orderItems = settlement.selectedItems.map(item => {
        const product = db.products.find(p => p.id === item.product_id);
        if (product) {
            product.stock = Math.max(0, Number(product.stock) - Number(item.quantity || 0));
            product.sales_count = (Number(product.sales_count) || 0) + Number(item.quantity || 0);
        }
        return {
            product_id: item.product_id,
            title: item.title,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 0,
            cover_image: item.cover_image || ''
        };
    });

    const order = {
        id: orderId,
        order_no: orderNo,
        user_id: user.id,
        buyer_id: user.id,
        buyer_name: user.display_name,
        address_id: address ? address.id : null,
        shipping_address: address ? {
            recipient_name: address.recipient_name,
            phone: address.phone,
            province: address.province,
            city: address.city,
            district: address.district,
            detail: address.detail
        } : null,
        remarks: remarks || '',
        coupon_code: settlement.coupon ? settlement.coupon.code : '',
        coupon_desc: settlement.coupon ? settlement.coupon.desc : '',
        subtotal: settlement.subtotal,
        shipping_fee: settlement.shippingFee,
        discount_amount: settlement.discountAmount,
        total_amount: settlement.totalAmount,
        status: 'pending_payment',
        items: orderItems,
        created_at: now,
        updated_at: now
    };

    db.orders.push(order);
    return order;
}

function isOrderOwnedByMerchant(db, order, merchantUserId) {
    return Array.isArray(order.items) && order.items.some(item => {
        const product = db.products.find(p => p.id === item.product_id);
        return product && product.merchant_user_id === merchantUserId;
    });
}

function buildMerchantOrderStats(orders = []) {
    const statusBreakdown = {
        pending_payment: 0,
        paid: 0,
        pending_shipment: 0,
        shipped: 0,
        completed: 0,
        cancelled: 0,
        refund_pending: 0,
        refunded: 0
    };

    orders.forEach(order => {
        if (statusBreakdown[order.status] !== undefined) {
            statusBreakdown[order.status] += 1;
        }
    });

    return {
        total_orders: orders.length,
        total_amount: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
        status_breakdown: statusBreakdown,
        pending_payment_orders: statusBreakdown.pending_payment,
        paid_orders: statusBreakdown.paid,
        pending_shipment_orders: statusBreakdown.pending_shipment,
        shipped_orders: statusBreakdown.shipped,
        completed_orders: statusBreakdown.completed,
        cancelled_orders: statusBreakdown.cancelled,
        refund_pending_orders: statusBreakdown.refund_pending,
        refunded_orders: statusBreakdown.refunded
    };
}

// ============ API 路由 ============

// 平台通用：角色列表
app.get('/api/roles', (req, res) => {
    res.json({
        roles: [
            { value: ROLE_TYPES.BUYER, label: '普通买家' },
            { value: ROLE_TYPES.ARTISAN, label: '非遗手艺人商家' },
            { value: ROLE_TYPES.ADMIN, label: '平台管理员' }
        ]
    });
});

// 注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, role, display_name, phone } = req.body;

        if (!username || !password || !role || !display_name) {
            return res.status(400).json({ error: '请填写所有必填字段' });
        }

        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
            return res.status(400).json({ error: '用户名须为 3–20 位字母、数字或下划线' });
        }

        const normalizedRole = normalizeRole(role);
        if (!isValidRole(normalizedRole)) {
            return res.status(400).json({ error: '角色无效' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: '密码至少 6 位' });
        }

        // 重新加载数据库以获取最新数据
        db = loadDB();

        const existing = db.users.find(u => u.username === username);
        if (existing) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);
        const id = db.nextId.user++;
        const now = new Date().toISOString();

        const newUser = {
            id,
            username,
            password: hashedPassword,
            role: normalizedRole,
            registration_role: normalizedRole,
            display_name,
            phone: phone || '',
            avatar: '',
            addresses: [],
            created_at: now
        };
        db.users.push(newUser);
        try {
            await saveDBDurable(db);
        } catch (error) {
            db.users = db.users.filter(user => String(user.id) !== String(id));
            throw error;
        }
        touchPresence(id);   // 注册即视为在线

        const token = jwt.sign(
            { id, username, role: normalizedRole, display_name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id, username, role: normalizedRole, registration_role: normalizedRole, display_name, phone }
        });
    } catch (e) {
        res.status(500).json({ error: '注册失败: ' + e.message });
    }
});

// 登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ error: '请填写所有必填字段' });
        }

        // ---- 防爆破：同一「用户名|IP」连续失败达上限则暂时锁定 ----
        const failKey = loginKey(username, req);
        const lockRemain = loginLockRemaining(failKey);
        if (lockRemain > 0) {
            return res.status(429).json({
                error: `登录失败次数过多，请在 ${Math.ceil(lockRemain / 60)} 分钟后重试`
            });
        }

        const normalizedRole = normalizeRole(role);
        if (![ROLE_TYPES.BUYER, ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN].includes(normalizedRole)) {
            return res.status(400).json({ error: '登录身份无效，请重新选择用户或开发者' });
        }

        db = loadDB();
        const user = db.users.find(u => {
            return u.username === username && getRegistrationRole(u, db) === normalizedRole;
        });

        if (!user) {
            recordLoginFailure(failKey);
            return res.status(400).json({ error: '用户名或密码错误，或角色不匹配' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            recordLoginFailure(failKey);
            return res.status(400).json({ error: '用户名或密码错误' });
        }

        // 登录成功，清除失败计数，并立即标记为在线
        clearLoginFailures(failKey);
        touchPresence(user.id);

        // ---- 惰性重哈希：老用户哈希强度低于当前标准时，借本次已校验的明文密码升级 ----
        try {
            if (bcrypt.getRounds(user.password) < BCRYPT_COST) {
                user.password = await bcrypt.hash(password, BCRYPT_COST);
                saveDB(db);
                console.log(`🔐 已升级用户 ${user.username} 的密码哈希强度至 bcrypt cost=${BCRYPT_COST}`);
            }
        } catch (e) {
            // 重哈希失败不影响本次登录，下次登录会再尝试
            console.warn('密码哈希升级失败（不影响登录）：', e.message);
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                registration_role: getRegistrationRole(user, db),
                display_name: user.display_name,
                phone: user.phone || ''
            }
        });
    } catch (e) {
        res.status(500).json({ error: '登录失败: ' + e.message });
    }
});

// 获取当前用户信息
app.get('/api/me', authMiddleware, (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const { password, ...userInfo } = user;
    res.json({ ...userInfo, registration_role: getRegistrationRole(user, db) });
});

// 获取用户列表（管理员可查看全部，其他角色仅看自己）
app.get('/api/users', authMiddleware, requireRole([ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const users = db.users.map(({ password, ...user }) => user);
    res.json(users);
});

// 心跳：用户端页面定时调用，用于刷新「在线」状态
app.post('/api/heartbeat', authMiddleware, (req, res) => {
    touchPresence(req.user.id);            // 显式刷新（authMiddleware 已刷新，这里保证语义清晰）
    res.json({ ok: true, ts: Date.now() });
});

// 开发者「管理用户」：查看非开发者（普通用户）的账号与在线状态
// 注意：必须定义在 /api/users/:id 之前，否则 "manage" 会被当作 :id 匹配
app.get('/api/users/manage', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const list = db.users
        .filter(u => isBuyerRole(u.role))          // 仅普通用户，排除开发者/匠人/管理员
        .map(u => {
            const { password, addresses, ...safe } = u;   // 剔除密码与无关字段
            return {
                id: safe.id,
                username: safe.username,
                display_name: safe.display_name,
                phone: safe.phone || '',
                role: normalizeRole(safe.role),
                created_at: safe.created_at || null,
                ...userStatus(u)                            // is_online / last_seen
            };
        })
        .sort((a, b) => {
            // 在线优先，其次按注册时间倒序
            if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

    res.json({
        total: list.length,
        online: list.filter(u => u.is_online).length,
        users: list
    });
});


// 通过用户名查找用户（用于添加好友）
// 注意：必须定义在 /api/users/:id 之前，否则 "find" 会被当作 :id 匹配，
//       前端拿到的会是 :id 的「用户不存在」，而不是本接口的「未找到该用户」。
app.get('/api/users/find', authMiddleware, (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: '请输入用户名' });

    db = loadDB();
    const user = db.users.find(u => u.username === username && u.id !== req.user.id);
    if (!user) return res.status(404).json({ error: '未找到该用户' });

    // 检查是否已经是好友
    const isFriend = db.friends.some(f =>
        ((f.from_user_id === req.user.id && f.to_user_id === user.id) ||
         (f.from_user_id === user.id && f.to_user_id === req.user.id)) &&
        f.status === 'accepted'
    );

    // 检查是否有待处理请求
    const pendingSent = db.friends.find(f =>
        f.from_user_id === req.user.id && f.to_user_id === user.id && f.status === 'pending'
    );
    const pendingReceived = db.friends.find(f =>
        f.from_user_id === user.id && f.to_user_id === req.user.id && f.status === 'pending'
    );

    res.json({
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        avatar: user.avatar,
        is_friend: isFriend,
        request_status: pendingSent ? 'sent' : (pendingReceived ? 'received' : 'none'),
        request_id: pendingSent?.id || pendingReceived?.id || null
    });
});

// 查询单个用户信息
app.get('/api/users/:id', authMiddleware, (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === Number(req.params.id));
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (req.user.id !== user.id && normalizeRole(req.user.role) !== ROLE_TYPES.ADMIN) {
        return res.status(403).json({ error: '无权查看该用户信息' });
    }
    const { password, ...userInfo } = user;
    res.json(userInfo);
});

// 更新当前用户信息
app.put('/api/users/me', authMiddleware, (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const { display_name, phone, avatar } = req.body;
    if (display_name !== undefined) user.display_name = display_name;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    saveDB(db);
    const { password, ...userInfo } = user;
    res.json(userInfo);
});

// 管理员更新用户角色
app.put('/api/users/:id/role', authMiddleware, requireRole([ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === Number(req.params.id));
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const nextRole = normalizeRole(req.body.role);
    if (!isValidRole(nextRole)) return res.status(400).json({ error: '角色无效' });

    user.role = nextRole;
    saveDB(db);
    const { password, ...userInfo } = user;
    res.json(userInfo);
});

// 获取对方角色列表（用户看开发者，开发者看用户）
app.get('/api/contacts', authMiddleware, (req, res) => {
    db = loadDB();
    const oppositeRole = isBuyerRole(req.user.role) ? ROLE_TYPES.ARTISAN : ROLE_TYPES.BUYER;
    const contacts = db.users
        .filter(u => normalizeRole(u.role) === oppositeRole)
        .map(({ password, ...rest }) => rest)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(contacts);
});

// ============ 会话归属判定 ============
// conversations 的 user_id / developer_id 只是「这一对用户」的两个槽位，
// 谁发起对话谁就占哪个槽，并不代表角色。所以判断归属一律按「是不是这一对的任一方」。
//
// 背景（已复现的 bug）：旧实现用带方向的精确匹配查找会话
// （c.user_id === userId && c.developer_id === devId），而 userId / devId 又是按
// 「发起方的角色」推出来的。于是两个角色相同的账号互相发起时会各建一个方向相反的
// 镜像会话（A→B 与 B→A），消息从此劈成两半：A 只看得见 A→B 那个，B 只看得见 B→A 那个，
// 双方都收不到对方发的消息。同样的问题在开发者面板（role=developer/artisan）之间也会出现。
// 下面统一按「无序对」处理。
function isConversationParty(conv, userId) {
    return String(conv.user_id) === String(userId) || String(conv.developer_id) === String(userId);
}

// 取出会话里「对方」的 id
function otherPartyId(conv, userId) {
    return String(conv.user_id) === String(userId) ? conv.developer_id : conv.user_id;
}

// 找出两个人之间的全部会话（历史镜像会话可能不止一个）
function conversationsBetween(db, idA, idB, productId) {
    return db.conversations.filter(c => {
        const samePair = (
            (String(c.user_id) === String(idA) && String(c.developer_id) === String(idB)) ||
            (String(c.user_id) === String(idB) && String(c.developer_id) === String(idA))
        );
        if (!samePair || productId === undefined) return samePair;
        return String(c.product_id || '') === String(productId || '');
    });
}

// 与某个会话属于「同一对用户」的全部会话 id（含它自己）。
// 历史数据里同一对用户可能残留多个镜像会话，读取时要一并带上，否则旧消息看不见。
function siblingConversationIds(db, conv) {
    return conversationsBetween(db, conv.user_id, conv.developer_id, conv.product_id ?? null).map(c => c.id);
}

// 获取或创建对话（需要是好友关系）
app.post('/api/conversations', authMiddleware, (req, res) => {
    const { target_id } = req.body;
    db = loadDB();
    const target = db.users.find(u => u.id === target_id);
    if (!target) return res.status(404).json({ error: '对方不存在' });

    // 检查是否是好友
    const isFriend = db.friends.some(f =>
        ((f.from_user_id === req.user.id && f.to_user_id === target.id) ||
         (f.from_user_id === target.id && f.to_user_id === req.user.id)) &&
        f.status === 'accepted'
    );

    if (!isFriend) {
        return res.status(403).json({ error: '请先添加对方为好友才能发起对话' });
    }

    const userId = isBuyerRole(req.user.role) ? req.user.id : target_id;
    const devId = isArtisanRole(req.user.role) ? req.user.id : target_id;

    // 按「无序对」复用已有会话：不论谁先发起、谁占哪个槽，同一对人只有一个会话。
    // 若按方向精确匹配（旧写法），两个同角色账号会各建一个镜像会话，消息互相看不见。
    let conv = conversationsBetween(db, req.user.id, target.id, null)[0];

    if (!conv) {
        const id = db.nextId.conversation++;
        conv = {
            id,
            user_id: userId,
            developer_id: devId,
            product_id: null,
            product_name: '',
            created_at: new Date().toISOString()
        };
        db.conversations.push(conv);
        saveDB(db);
    }

    res.json(conv);
});

app.post('/api/products/:id/contact', authMiddleware, async (req, res) => {
    db = loadDB();
    const productId = Number(req.params.id);
    const product = db.products.find(item =>
        Number(item.id) === productId && isPublishedMerchantProduct(db, item));
    if (!product) return res.status(404).json({ error: '商品不存在或已下架' });

    const buyer = db.users.find(item => String(item.id) === String(req.user.id));
    if (!buyer || getRegistrationRole(buyer, db) !== ROLE_TYPES.BUYER) {
        return res.status(403).json({ error: '请使用用户账号联系商家' });
    }

    const merchant = db.users.find(item => String(item.id) === String(product.merchant_user_id));
    if (!merchant) return res.status(404).json({ error: '商家账号不存在' });
    if (String(merchant.id) === String(buyer.id)) {
        return res.status(400).json({ error: '不能联系自己的商家账号' });
    }

    let conversation = db.conversations.find(item =>
        String(item.product_id || '') === String(product.id) &&
        ((String(item.user_id) === String(buyer.id) && String(item.developer_id) === String(merchant.id)) ||
         (String(item.user_id) === String(merchant.id) && String(item.developer_id) === String(buyer.id))));
    if (!conversation) {
        const nextConversationId = db.nextId.conversation;
        conversation = {
            id: nextConversationId,
            user_id: buyer.id,
            developer_id: merchant.id,
            product_id: product.id,
            product_name: product.title,
            created_at: new Date().toISOString()
        };
        db.nextId.conversation += 1;
        db.conversations.push(conversation);
        try {
            await saveDBDurable(db);
        } catch (error) {
            db.conversations = db.conversations.filter(item => item.id !== conversation.id);
            db.nextId.conversation = nextConversationId;
            console.error('❌ 创建商品咨询会话失败：', error.message);
            return res.status(500).json({ error: '暂时无法创建商家会话，请稍后重试' });
        }
    }

    return res.json({
        ...conversation,
        target_id: merchant.id,
        target_name: merchant.display_name || merchant.username,
        target_username: merchant.username || '',
        target_product_id: product.id,
        target_product_name: product.title,
        unread: 0
    });
});

// 获取我的对话列表
app.get('/api/conversations', authMiddleware, (req, res) => {
    db = loadDB();
    const me = req.user.id;
    const productOnly = req.query.product_only === 'true';

    // 按「对方」归并，而不是按「我占哪个槽」筛选。
    // 旧实现买家只看 user_id === 我、开发者只看 developer_id === 我，同角色双方
    // 各自只能看到自己发起的那一个镜像会话，对方的消息永远不出现。
    // 同一对用户若残留多个会话（历史 bug），只呈现一个代表（id 最小的），
    // 未读数跨这些会话合并统计。
    const byOtherId = new Map();

    db.conversations.filter(c =>
        isConversationParty(c, me) && (!productOnly || c.product_id)).forEach(c => {
        const otherId = otherPartyId(c, me);
        const other = db.users.find(u => String(u.id) === String(otherId));
        if (!other) return;   // 对方账号已被删除，跳过

        const contextKey = `${otherId}:${c.product_id || ''}`;
        const kept = byOtherId.get(contextKey);
        if (kept && kept.id <= c.id) return;

        const ids = siblingConversationIds(db, c);
        const unread = db.messages.filter(m =>
            ids.some(id => String(id) === String(m.conversation_id)) &&
            String(m.sender_id) !== String(me) &&
            !m.is_read
        ).length;

        byOtherId.set(contextKey, {
            ...c,
            target_id: otherId,
            target_name: other.display_name || '',
            target_username: other.username || '',
            target_avatar: other.avatar || '',
            target_product_id: c.product_id || null,
            target_product_name: c.product_name || '',
            unread
        });
    });

    const convs = Array.from(byOtherId.values())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(convs);
});

// 获取对话消息
app.get('/api/conversations/:id/messages', authMiddleware, (req, res) => {
    db = loadDB();
    const convId = parseInt(req.params.id);
    const conv = db.conversations.find(c => c.id === convId);
    if (!conv) return res.status(404).json({ error: '对话不存在' });

    // 验证权限
    if (!isConversationParty(conv, req.user.id)) {
        return res.status(403).json({ error: '无权访问' });
    }

    // 同一对用户之间历史遗留的镜像会话要一起读，否则早期那一半消息在界面上消失
    const convIds = siblingConversationIds(db, conv);

    // 标记已读
    let changed = false;
    db.messages.forEach(m => {
        if (convIds.includes(m.conversation_id) && m.sender_id !== req.user.id && !m.is_read) {
            m.is_read = true;
            changed = true;
        }
    });
    if (changed) saveDB(db);

    const messages = db.messages
        .filter(m => convIds.includes(m.conversation_id))
        .map(m => {
            const sender = db.users.find(u => u.id === m.sender_id);
            return {
                ...m,
                sender_name: sender?.display_name || '',
                sender_role: sender?.role || ''
            };
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    res.json(messages);
});

// 发送消息
app.post('/api/conversations/:id/messages', authMiddleware, upload.single('file'), async (req, res) => {
    db = loadDB();
    const convId = parseInt(req.params.id);
    const conv = db.conversations.find(c => c.id === convId);
    if (!conv) return res.status(404).json({ error: '对话不存在' });

    if (!isConversationParty(conv, req.user.id)) {
        return res.status(403).json({ error: '无权访问' });
    }

    const content = req.body.content || '';
    let file_path = '';
    let file_type = '';
    let file_name = '';

    if (req.file) {
        file_path = '/uploads/' + (req.file.mimetype.startsWith('video/') ? 'videos/' : 'images/') + req.file.filename;
        file_type = req.file.mimetype;
        file_name = req.file.originalname;
    }

    if (!content && !req.file) {
        return res.status(400).json({ error: '消息内容不能为空' });
    }

    const id = db.nextId.message;
    db.nextId.message += 1;
    const now = new Date().toISOString();
    const msg = {
        id,
        conversation_id: convId,
        sender_id: req.user.id,
        content,
        file_path,
        file_type,
        file_name,
        is_read: false,
        created_at: now
    };
    db.messages.push(msg);
    try {
        await saveDBDurable(db);
    } catch (error) {
        db.messages = db.messages.filter(message => message.id !== id);
        db.nextId.message = id;
        console.error('❌ 保存聊天消息失败：', error.message);
        return res.status(500).json({ error: '消息发送失败，请稍后重试' });
    }

    const sender = db.users.find(u => u.id === req.user.id);
    res.json({
        ...msg,
        sender_name: sender?.display_name || '',
        sender_role: sender?.role || ''
    });
});

// 删除对话（以及相关消息）
app.delete('/api/conversations/:id', authMiddleware, (req, res) => {
    db = loadDB();
    const convId = parseInt(req.params.id);
    const conv = db.conversations.find(c => c.id === convId);
    if (!conv) return res.status(404).json({ error: '对话不存在' });

    // 验证权限
    if (!isConversationParty(conv, req.user.id)) {
        return res.status(403).json({ error: '无权操作' });
    }

    // 一对用户之间的历史镜像会话要一并删除，否则删掉一个、另一个还会重新出现在列表里
    const convIds = siblingConversationIds(db, conv);

    // 删除相关消息
    db.messages = db.messages.filter(m => !convIds.includes(m.conversation_id));
    // 删除对话
    db.conversations = db.conversations.filter(c => !convIds.includes(c.id));
    saveDB(db);

    res.json({ success: true, message: '对话已删除' });
});

// 清理孤儿数据（后台自动 + 手动触发）
app.post('/api/cleanup', authMiddleware, (req, res) => {
    db = loadDB();
    const beforeConvs = db.conversations.length;
    const beforeMsgs = db.messages.length;

    // 找出所有有效用户 ID
    const validUserIds = new Set(db.users.map(u => u.id));

    // 删除涉及已删除用户的对话
    const orphanedConvIds = new Set();
    db.conversations = db.conversations.filter(c => {
        const userExists = validUserIds.has(c.user_id);
        const devExists = validUserIds.has(c.developer_id);
        if (!userExists || !devExists) {
            orphanedConvIds.add(c.id);
            return false;
        }
        return true;
    });

    // 删除这些对话的消息
    db.messages = db.messages.filter(m => !orphanedConvIds.has(m.conversation_id));

    // 删除对应文件
    db.messages.forEach(m => {
        // 确保消息中的发送者存在
        if (!validUserIds.has(m.sender_id)) {
            m.sender_id = req.user.id; // 设为当前用户
        }
    });

    saveDB(db);

    res.json({
        success: true,
        cleaned_conversations: beforeConvs - db.conversations.length,
        cleaned_messages: beforeMsgs - db.messages.length
    });
});

// ============ 好友系统 ============
// 注：通过用户名查找用户的 GET /api/users/find 定义在 /api/users/:id 之前
//（见「查询单个用户信息」上方），否则 find 会被当作 :id 匹配。

// 发送好友请求
app.post('/api/friends/request', authMiddleware, (req, res) => {
    const { target_username, target_id } = req.body;
    db = loadDB();

    let target;
    if (target_id) {
        target = db.users.find(u => u.id === target_id);
    } else if (target_username) {
        target = db.users.find(u => u.username === target_username);
    }

    if (!target) return res.status(404).json({ error: '未找到该用户' });
    if (target.id === req.user.id) return res.status(400).json({ error: '不能添加自己为好友' });

    // 检查是否已经是好友
    const alreadyFriend = db.friends.some(f =>
        ((f.from_user_id === req.user.id && f.to_user_id === target.id) ||
         (f.from_user_id === target.id && f.to_user_id === req.user.id)) &&
        f.status === 'accepted'
    );
    if (alreadyFriend) return res.status(400).json({ error: '已经是好友了' });

    // 检查是否已有待处理请求
    const existingRequest = db.friends.find(f =>
        f.from_user_id === req.user.id && f.to_user_id === target.id && f.status === 'pending'
    );
    if (existingRequest) return res.status(400).json({ error: '已发送过好友请求，请等待对方处理' });

    // 如果对方已经向我发送请求，自动接受
    const reverseRequest = db.friends.find(f =>
        f.from_user_id === target.id && f.to_user_id === req.user.id && f.status === 'pending'
    );
    if (reverseRequest) {
        reverseRequest.status = 'accepted';
        saveDB(db);
        return res.json({ success: true, message: '你们互相发送了好友请求，已自动成为好友！', friend_id: reverseRequest.id });
    }

    const id = db.nextId.friend++;
    const now = new Date().toISOString();
    const request = {
        id,
        from_user_id: req.user.id,
        to_user_id: target.id,
        status: 'pending',
        created_at: now
    };
    db.friends.push(request);
    saveDB(db);

    res.json({ success: true, message: '好友请求已发送！', request_id: id });
});

// 获取我收到的好友请求
app.get('/api/friends/requests', authMiddleware, (req, res) => {
    db = loadDB();
    const requests = db.friends
        .filter(f => f.to_user_id === req.user.id && f.status === 'pending')
        .map(f => {
            const fromUser = db.users.find(u => u.id === f.from_user_id);
            return {
                ...f,
                from_user: fromUser ? {
                    id: fromUser.id,
                    username: fromUser.username,
                    display_name: fromUser.display_name,
                    role: fromUser.role,
                    avatar: fromUser.avatar
                } : null
            };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(requests);
});

// 获取我发送的好友请求
app.get('/api/friends/requests/sent', authMiddleware, (req, res) => {
    db = loadDB();
    const requests = db.friends
        .filter(f => f.from_user_id === req.user.id && f.status === 'pending')
        .map(f => {
            const toUser = db.users.find(u => u.id === f.to_user_id);
            return {
                ...f,
                to_user: toUser ? {
                    id: toUser.id,
                    username: toUser.username,
                    display_name: toUser.display_name,
                    role: toUser.role,
                    avatar: toUser.avatar
                } : null
            };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(requests);
});

// 接受好友请求
app.post('/api/friends/requests/:id/accept', authMiddleware, (req, res) => {
    db = loadDB();
    const requestId = parseInt(req.params.id);
    const request = db.friends.find(f => f.id === requestId && f.to_user_id === req.user.id);
    if (!request) return res.status(404).json({ error: '请求不存在或无权操作' });
    if (request.status !== 'pending') return res.status(400).json({ error: '该请求已处理' });

    request.status = 'accepted';
    saveDB(db);
    res.json({ success: true, message: '已添加为好友！' });
});

// 拒绝好友请求
app.post('/api/friends/requests/:id/reject', authMiddleware, (req, res) => {
    db = loadDB();
    const requestId = parseInt(req.params.id);
    const request = db.friends.find(f => f.id === requestId && f.to_user_id === req.user.id);
    if (!request) return res.status(404).json({ error: '请求不存在或无权操作' });

    request.status = 'rejected';
    saveDB(db);
    res.json({ success: true, message: '已拒绝该请求' });
});

// 获取我的好友列表
app.get('/api/friends', authMiddleware, (req, res) => {
    db = loadDB();
    const friends = db.friends
        .filter(f =>
            (f.from_user_id === req.user.id || f.to_user_id === req.user.id) &&
            f.status === 'accepted'
        )
        .map(f => {
            const friendId = f.from_user_id === req.user.id ? f.to_user_id : f.from_user_id;
            const friend = db.users.find(u => u.id === friendId);
            if (!friend) return null;
            return {
                friendship_id: f.id,
                friend: {
                    id: friend.id,
                    username: friend.username,
                    display_name: friend.display_name,
                    role: friend.role,
                    avatar: friend.avatar
                },
                created_at: f.created_at
            };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(friends);
});

// 删除好友
app.delete('/api/friends/:id', authMiddleware, (req, res) => {
    db = loadDB();
    const friendshipId = parseInt(req.params.id);
    const friendship = db.friends.find(f =>
        f.id === friendshipId &&
        (f.from_user_id === req.user.id || f.to_user_id === req.user.id) &&
        f.status === 'accepted'
    );
    if (!friendship) return res.status(404).json({ error: '好友关系不存在' });

    db.friends = db.friends.filter(f => f.id !== friendshipId);
    saveDB(db);
    res.json({ success: true, message: '已删除好友' });
});

// 搜索用户
app.get('/api/search', authMiddleware, (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    db = loadDB();
    const oppositeRole = isBuyerRole(req.user.role) ? ROLE_TYPES.ARTISAN : ROLE_TYPES.BUYER;
    const results = db.users
        .filter(u => normalizeRole(u.role) === oppositeRole &&
            (u.display_name.includes(q) || u.username.includes(q)))
        .map(({ password, ...rest }) => rest)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20);

    res.json(results);
});

// ============ 商家入驻与店铺接口 ============
app.post('/api/merchants/apply', authMiddleware, async (req, res) => {
    try {
        db = loadDB();
        const user = db.users.find(u => String(u.id) === String(req.user.id));
        if (!user) return res.status(404).json({ error: '用户不存在' });
        if (!isBuyerRole(user.role) && !isArtisanRole(user.role)) {
            return res.status(403).json({ error: '当前账号不能申请商家入驻' });
        }

        const {
            shop_name,
            intro,
            heritage_category,
            contact_phone,
            qualification_note = ''
        } = req.body;
        const application = {
            shop_name: typeof shop_name === 'string' ? shop_name.trim() : '',
            intro: typeof intro === 'string' ? intro.trim() : '',
            heritage_category: typeof heritage_category === 'string' ? heritage_category.trim() : '',
            contact_phone: typeof contact_phone === 'string' ? contact_phone.trim() : '',
            qualification_note: typeof qualification_note === 'string' ? qualification_note.trim() : ''
        };
        if (!application.shop_name || !application.intro || !application.heritage_category) {
            return res.status(400).json({ error: '店铺名称、简介和非遗类别不能为空' });
        }
        if (!/^\d{11}$/.test(application.contact_phone)) {
            return res.status(400).json({ error: '联系电话必须为11位数字' });
        }

        let merchant = db.merchants.find(m => String(m.user_id) === String(req.user.id));
        const now = new Date().toISOString();

        if (merchant && merchant.status === 'pending') {
            return res.status(409).json({ error: '商家申请已提交，正在等待开发者审核' });
        }
        if (merchant && merchant.status === 'approved') {
            return res.status(409).json({ error: '该账号已成为商家' });
        }

        if (!merchant) {
            merchant = {
                id: db.nextId.merchant ? db.nextId.merchant++ : 1,
                user_id: req.user.id,
                ...application,
                status: 'pending',
                approved_by: null,
                created_at: now,
                updated_at: now,
                permissions: ['shop:view', 'product:manage', 'order:manage']
            };
            db.merchants.push(merchant);
        } else {
            Object.assign(merchant, application);
            merchant.status = 'pending';
            merchant.approved_by = null;
            merchant.updated_at = now;
        }

        await saveDBDurable(db);
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        const { password, ...userInfo } = user;
        res.json({ merchant, token, user: userInfo });
    } catch (error) {
        console.error('❌ 保存商家申请失败：', error.message);
        res.status(500).json({ error: '商家申请保存失败，请稍后重试' });
    }
});

app.get('/api/merchants/applications', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), requireDeveloperApprover, (req, res) => {
    db = loadDB();
    const applications = db.merchants
        .filter(merchant => merchant.status === 'pending')
        .map(merchant => {
            const applicant = db.users.find(user => user.id === merchant.user_id);
            return {
                ...merchant,
                applicant_name: applicant?.display_name || applicant?.username || '未知用户',
                applicant_username: applicant?.username || ''
            };
        })
        .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    res.json(applications);
});

app.get('/api/merchants/approved', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), requireDeveloperApprover, (req, res) => {
    db = loadDB();
    const applications = db.merchants
        .filter(merchant => merchant.status === 'approved')
        .map(merchant => {
            const applicant = db.users.find(user => String(user.id) === String(merchant.user_id));
            const approver = db.users.find(user => String(user.id) === String(merchant.approved_by));
            return {
                ...merchant,
                applicant_name: applicant?.display_name || applicant?.username || '未知用户',
                applicant_username: applicant?.username || '',
                approver_name: approver?.display_name || approver?.username || ''
            };
        })
        .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    res.json(applications);
});

app.post('/api/merchants/:id/approve', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), requireDeveloperApprover, async (req, res) => {
    try {
        db = loadDB();
        const merchant = db.merchants.find(m => Number(m.id) === Number(req.params.id));
        if (!merchant) return res.status(404).json({ error: '商家申请不存在' });
        if (String(merchant.user_id) === String(req.user.id)) {
            return res.status(403).json({ error: '不能审核自己的商家申请' });
        }
        if (merchant.status !== 'pending') {
            return res.status(409).json({ error: '该申请已由其他开发者处理' });
        }

        const applicant = db.users.find(user => String(user.id) === String(merchant.user_id));
        if (!applicant) return res.status(404).json({ error: '申请人账号不存在' });
        merchant.status = 'approved';
        merchant.approved_by = req.user.id;
        merchant.updated_at = new Date().toISOString();
        applicant.role = ROLE_TYPES.ARTISAN;
        await saveDBDurable(db);
        res.json({ success: true, merchant });
    } catch (error) {
        console.error('❌ 保存商家审批结果失败：', error.message);
        res.status(500).json({ error: '审批结果保存失败，请稍后重试' });
    }
});

app.get('/api/merchants/me', authMiddleware, (req, res) => {
    db = loadDB();
    const merchant = db.merchants.find(m => m.user_id === req.user.id);
    if (!merchant) return res.status(404).json({ error: '尚未申请入驻' });
    const approver = db.users.find(user => String(user.id) === String(merchant.approved_by));
    res.json({
        ...merchant,
        approver_name: approver?.display_name || approver?.username || '',
        certification: merchant.certification || {
            status: merchant.status || 'pending',
            note: merchant.qualification_note || '',
            verified_at: merchant.verified_at || null
        }
    });
});

app.put('/api/merchants/me', authMiddleware, (req, res) => {
    db = loadDB();
    const merchant = db.merchants.find(m => m.user_id === req.user.id);
    if (!merchant) return res.status(404).json({ error: '尚未申请入驻' });

    const { shop_name, intro, heritage_category, contact_phone, heritage_features, certification } = req.body;
    if (shop_name !== undefined) merchant.shop_name = shop_name;
    if (intro !== undefined) merchant.intro = intro;
    if (heritage_category !== undefined) merchant.heritage_category = heritage_category;
    if (contact_phone !== undefined) merchant.contact_phone = contact_phone;
    if (heritage_features !== undefined) merchant.heritage_features = heritage_features;
    if (certification !== undefined) merchant.certification = certification;

    merchant.updated_at = new Date().toISOString();
    saveDB(db);
    res.json({
        ...merchant,
        certification: merchant.certification || {
            status: merchant.status || 'pending',
            note: merchant.qualification_note || '',
            verified_at: merchant.verified_at || null
        }
    });
});

app.get('/api/merchants', authMiddleware, (req, res) => {
    db = loadDB();
    const merchants = db.merchants.map(m => ({
        ...m,
        owner_name: db.users.find(u => u.id === m.user_id)?.display_name || ''
    }));
    res.json(merchants);
});

app.put('/api/merchants/qualification', authMiddleware, (req, res) => {
    db = loadDB();
    const merchant = db.merchants.find(m => m.user_id === req.user.id);
    if (!merchant) return res.status(404).json({ error: '尚未申请入驻' });

    merchant.qualification_note = req.body.qualification_note || merchant.qualification_note || '';
    merchant.status = 'pending';
    merchant.updated_at = new Date().toISOString();

    saveDB(db);
    res.json(merchant);
});

app.get('/api/merchants/certification', authMiddleware, (req, res) => {
    db = loadDB();
    const merchant = db.merchants.find(m => m.user_id === req.user.id);
    if (!merchant) return res.status(404).json({ error: '尚未申请入驻' });
    res.json({
        certification: merchant.certification || {
            status: merchant.status || 'pending',
            note: merchant.qualification_note || '',
            verified_at: merchant.verified_at || null,
            documents: []
        }
    });
});

app.put('/api/merchants/certification', authMiddleware, (req, res) => {
    db = loadDB();
    const merchant = db.merchants.find(m => m.user_id === req.user.id);
    if (!merchant) return res.status(404).json({ error: '尚未申请入驻' });

    const { status = 'pending', note = '', documents = [], verified_at } = req.body;
    merchant.certification = {
        status,
        note: note || merchant.qualification_note || '',
        documents: Array.isArray(documents) ? documents : [],
        verified_at: verified_at || merchant.verified_at || null
    };
    merchant.status = status;
    merchant.qualification_note = note || merchant.qualification_note || '';
    merchant.verified_at = verified_at || merchant.verified_at || null;
    merchant.updated_at = new Date().toISOString();
    saveDB(db);
    res.json({ certification: merchant.certification });
});

app.get('/api/merchants/permissions', authMiddleware, (req, res) => {
    db = loadDB();
    const merchant = db.merchants.find(m => m.user_id === req.user.id);
    if (!merchant) return res.status(404).json({ error: '尚未申请入驻' });

    res.json({
        permissions: merchant.permissions || ['shop:view', 'product:manage', 'order:manage'],
        status: merchant.status
    });
});

app.put('/api/merchants/permissions', authMiddleware, (req, res) => {
    db = loadDB();
    const merchant = db.merchants.find(m => m.user_id === req.user.id);
    if (!merchant) return res.status(404).json({ error: '尚未申请入驻' });

    merchant.permissions = req.body.permissions || merchant.permissions || [];
    merchant.updated_at = new Date().toISOString();
    saveDB(db);
    res.json({ permissions: merchant.permissions });
});

// ============ 商品基础管理接口 ============
app.post('/api/products', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), requireApprovedMerchant, async (req, res) => {
    let product;
    db = loadDB();
    const merchant = req.merchant;

    const {
        title,
        subtitle,
        brief,
        description,
        detail_description,
        price,
        stock,
        category,
        tags,
        specifications,
        cover_image,
        main_images,
        detail_images,
        video_url,
        model_url,
        story,
        artisan_intro,
        heritage_background,
        is_recommended,
        recommend_reason,
        featured_section,
        status
    } = req.body;
    if (!title || !description || price === undefined || stock === undefined) {
        return res.status(400).json({ error: '商品标题、描述、价格和库存不能为空' });
    }
    const priceText = typeof price === 'number' || typeof price === 'string' ? String(price).trim() : '';
    const stockText = typeof stock === 'number' || typeof stock === 'string' ? String(stock).trim() : '';
    if (!/^\d+(?:\.\d{1,2})?$/.test(priceText) || Number(priceText) > 99999999.99) {
        return res.status(400).json({ error: '售价必须为不超过 8 位整数、最多 2 位小数的非负数字' });
    }
    if (!/^\d+$/.test(stockText) || Number(stockText) > 2147483647) {
        return res.status(400).json({ error: '库存必须为不超过 2147483647 的非负整数' });
    }
    const productPrice = Number(priceText);
    const productStock = Number(stockText);
    const productStatus = status || 'published';
    if (!['draft', 'published'].includes(productStatus)) {
        return res.status(400).json({ error: '商品状态无效' });
    }

    product = {
        id: db.nextId.product ? db.nextId.product++ : 1,
        merchant_id: merchant.id,
        merchant_user_id: req.user.id,
        merchant_name: req.user.display_name,
        title,
        subtitle: subtitle || '',
        brief: brief || description,
        description,
        detail_description: detail_description || description,
        price: productPrice,
        stock: productStock,
        category: category || '非遗手作',
        tags: Array.isArray(tags) ? tags : [],
        specifications: Array.isArray(specifications) ? specifications : [],
        cover_image: cover_image || '',
        main_images: main_images || [],
        detail_images: detail_images || [],
        video_url: video_url || '',
        model_url: model_url || '',
        story: story || '',
        artisan_intro: artisan_intro || '',
        heritage_background: heritage_background || '',
        is_recommended: Boolean(is_recommended),
        recommend_reason: recommend_reason || '',
        featured_section: featured_section || '',
        sales_count: 0,
        status: productStatus,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    db.products.push(product);
    try {
        await saveDBDurable(db);
        res.json(product);
    } catch (error) {
        db.products = db.products.filter(item => String(item.id) !== String(product.id));
        console.error('❌ 保存商品失败：', error.message);
        res.status(500).json({ error: '商品保存失败，未能上架，请稍后重试' });
    }
});

app.get('/api/merchant/products', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), requireApprovedMerchant, (req, res) => {
    db = loadDB();
    const products = db.products
        .filter(product => product.merchant_user_id === req.user.id && !product.is_deleted && product.status !== 'deleted')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    res.json(products);
});

app.get('/api/products', optionalAuthMiddleware, (req, res) => {
    db = loadDB();
    const { q = '', category = '', tag = '', sort = 'newest', page = 1, limit = 20 } = req.query;

    let products = db.products.filter(product => isPublishedMerchantProduct(db, product));

    if (q) {
        const keyword = String(q).toLowerCase();
        products = products.filter(p => {
            const haystack = [p.title, p.description, p.brief, p.category, p.story, p.artisan_intro]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(keyword);
        });
    }

    if (category) {
        products = products.filter(p => String(p.category).toLowerCase() === String(category).toLowerCase());
    }

    if (tag) {
        products = products.filter(p => Array.isArray(p.tags) && p.tags.some(t => String(t).toLowerCase() === String(tag).toLowerCase()));
    }

    products = products.sort((a, b) => {
        switch (sort) {
            case 'price_asc':
                return (a.price || 0) - (b.price || 0);
            case 'price_desc':
                return (b.price || 0) - (a.price || 0);
            case 'sales':
                return (b.sales_count || 0) - (a.sales_count || 0);
            case 'hot':
                return (b.sales_count || 0) - (a.sales_count || 0) || new Date(b.created_at) - new Date(a.created_at);
            case 'newest':
            default:
                return new Date(b.created_at) - new Date(a.created_at);
        }
    });

    const pageNum = Math.max(1, Number(page));
    const pageSize = Math.min(100, Math.max(1, Number(limit)));
    const total = products.length;
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;

    res.json({
        items: products.slice(start, end),
        pagination: {
            page: pageNum,
            limit: pageSize,
            total,
            totalPages: Math.ceil(total / pageSize) || 1
        }
    });
});

app.get('/api/products/recommend', authMiddleware, (req, res) => {
    db = loadDB();
    const limit = Math.min(10, Math.max(1, Number(req.query.limit || 4)));
    const products = db.products
        .filter(p => isPublishedMerchantProduct(db, p) && p.is_recommended)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    res.json(products);
});

app.get('/api/products/featured', authMiddleware, (req, res) => {
    db = loadDB();
    const limit = Math.min(10, Math.max(1, Number(req.query.limit || 4)));
    const products = db.products
        .filter(p => isPublishedMerchantProduct(db, p) && (p.featured_section || p.is_recommended))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    res.json(products);
});

app.get('/api/products/categories', authMiddleware, (req, res) => {
    db = loadDB();
    const categories = [...new Set(db.products
        .filter(product => isPublishedMerchantProduct(db, product))
        .map(product => product.category)
        .filter(Boolean))];
    res.json(categories);
});

app.get('/api/products/:id', optionalAuthMiddleware, (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id) && isPublishedMerchantProduct(db, p));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    res.json(product);
});

app.put('/api/products/:id', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), requireApprovedMerchant, (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权修改该商品' });

    const {
        title,
        subtitle,
        brief,
        description,
        detail_description,
        price,
        stock,
        category,
        tags,
        specifications,
        cover_image,
        main_images,
        detail_images,
        video_url,
        model_url,
        story,
        artisan_intro,
        heritage_background,
        is_recommended,
        recommend_reason,
        featured_section,
        status
    } = req.body;
    if (title !== undefined) product.title = title;
    if (subtitle !== undefined) product.subtitle = subtitle;
    if (brief !== undefined) product.brief = brief;
    if (description !== undefined) product.description = description;
    if (detail_description !== undefined) product.detail_description = detail_description;
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (category !== undefined) product.category = category;
    if (tags !== undefined) product.tags = Array.isArray(tags) ? tags : [];
    if (specifications !== undefined) product.specifications = Array.isArray(specifications) ? specifications : [];
    if (cover_image !== undefined) product.cover_image = cover_image;
    if (main_images !== undefined) product.main_images = main_images;
    if (detail_images !== undefined) product.detail_images = detail_images;
    if (video_url !== undefined) product.video_url = video_url;
    if (model_url !== undefined) product.model_url = model_url;
    if (story !== undefined) product.story = story;
    if (artisan_intro !== undefined) product.artisan_intro = artisan_intro;
    if (heritage_background !== undefined) product.heritage_background = heritage_background;
    if (is_recommended !== undefined) product.is_recommended = Boolean(is_recommended);
    if (recommend_reason !== undefined) product.recommend_reason = recommend_reason;
    if (featured_section !== undefined) product.featured_section = featured_section;
    if (status !== undefined) {
        if (!['draft', 'published'].includes(status)) {
            return res.status(400).json({ error: '商品状态无效' });
        }
        product.status = status;
    }
    product.updated_at = new Date().toISOString();

    saveDB(db);
    res.json(product);
});

app.put('/api/products/:id/content', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), requireApprovedMerchant, (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权修改该商品内容' });

    const {
        title,
        subtitle,
        brief,
        description,
        detail_description,
        cover_image,
        main_images,
        detail_images,
        video_url,
        model_url,
        story,
        artisan_intro,
        heritage_background
    } = req.body;

    if (title !== undefined) product.title = title;
    if (subtitle !== undefined) product.subtitle = subtitle;
    if (brief !== undefined) product.brief = brief;
    if (description !== undefined) product.description = description;
    if (detail_description !== undefined) product.detail_description = detail_description;
    if (cover_image !== undefined) product.cover_image = cover_image;
    if (main_images !== undefined) product.main_images = main_images;
    if (detail_images !== undefined) product.detail_images = detail_images;
    if (video_url !== undefined) product.video_url = video_url;
    if (model_url !== undefined) product.model_url = model_url;
    if (story !== undefined) product.story = story;
    if (artisan_intro !== undefined) product.artisan_intro = artisan_intro;
    if (heritage_background !== undefined) product.heritage_background = heritage_background;
    product.updated_at = new Date().toISOString();

    saveDB(db);
    res.json(product);
});

app.put('/api/products/:id/attributes', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), requireApprovedMerchant, (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权修改该商品属性' });

    const { category, tags, specifications, price, stock } = req.body;
    if (category !== undefined) product.category = category;
    if (tags !== undefined) product.tags = Array.isArray(tags) ? tags : [];
    if (specifications !== undefined) product.specifications = Array.isArray(specifications) ? specifications : [];
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    product.updated_at = new Date().toISOString();

    saveDB(db);
    res.json(product);
});

app.patch('/api/products/:id/status', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), requireApprovedMerchant, (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权操作该商品' });

    const { status } = req.body;
    if (!status) return res.status(400).json({ error: '请提供状态' });
    if (!['draft', 'published'].includes(status)) return res.status(400).json({ error: '商品状态无效' });
    product.status = status;
    product.updated_at = new Date().toISOString();

    saveDB(db);
    res.json(product);
});

app.patch('/api/products/:id/stock', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), requireApprovedMerchant, (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权调整该商品库存' });

    const { stock } = req.body;
    if (stock === undefined) return res.status(400).json({ error: '请提供库存值' });
    product.stock = Number(stock);
    product.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(product);
});

app.patch('/api/products/:id/price', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), requireApprovedMerchant, (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权调整该商品价格' });

    const { price } = req.body;
    if (price === undefined) return res.status(400).json({ error: '请提供价格' });
    product.price = Number(price);
    product.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(product);
});

app.post('/api/products/:id/publish', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), requireApprovedMerchant, (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权上下架该商品' });

    product.status = 'published';
    product.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(product);
});

app.post('/api/products/:id/unpublish', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), requireApprovedMerchant, (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权上下架该商品' });

    product.status = 'draft';
    product.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(product);
});

app.delete('/api/products/:id', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), requireApprovedMerchant, (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权删除该商品' });

    product.is_deleted = true;
    product.status = 'deleted';
    product.updated_at = new Date().toISOString();

    saveDB(db);
    res.json({ success: true, product });
});

// ============ 购物车接口 ============
app.get('/api/cart', optionalAuthMiddleware, (req, res) => {
    db = loadDB();
    const { authUserId, guestId } = getCartScope(req);
    if (authUserId) {
        syncGuestCartToUser(req, db);
    }

    const items = authUserId
        ? db.carts.filter(item => item.user_id === authUserId)
        : db.carts.filter(item => item.guest_id === guestId);

    res.json(buildCartResponse(req, db, items));
});

app.post('/api/cart/items', optionalAuthMiddleware, (req, res) => {
    db = loadDB();
    const { authUserId, guestId } = getCartScope(req);
    const { product_id, quantity = 1, selected = true } = req.body;

    if (!product_id) return res.status(400).json({ error: '请选择商品' });

    const product = db.products.find(p => p.id === Number(product_id) && isPublishedMerchantProduct(db, p));
    if (!product) return res.status(404).json({ error: '商品不存在或已下架' });

    const qty = Math.max(1, Number(quantity) || 1);
    if (product.stock < qty) {
        return res.status(400).json({ error: '库存不足，请调整数量' });
    }

    if (authUserId) {
        syncGuestCartToUser(req, db);
    }

    const scope = authUserId ? { user_id: authUserId } : { guest_id: guestId };
    let cartItem = db.carts.find(item => item.product_id === product.id && (authUserId ? item.user_id === authUserId : item.guest_id === guestId));
    const now = new Date().toISOString();

    if (cartItem) {
        cartItem.quantity = (Number(cartItem.quantity) || 0) + qty;
        cartItem.selected = selected !== undefined ? Boolean(selected) : cartItem.selected;
        cartItem.price = product.price;
        cartItem.title = product.title;
        cartItem.cover_image = product.cover_image || '';
        cartItem.updated_at = now;
    } else {
        cartItem = {
            id: db.nextId.cart ? db.nextId.cart++ : 1,
            ...scope,
            product_id: product.id,
            merchant_id: product.merchant_id,
            merchant_name: product.merchant_name || '',
            title: product.title,
            cover_image: product.cover_image || '',
            price: product.price,
            quantity: qty,
            selected: Boolean(selected),
            created_at: now,
            updated_at: now
        };
        db.carts.push(cartItem);
    }

    saveDB(db);
    res.json(cartItem);
});

app.put('/api/cart/items/:productId', optionalAuthMiddleware, (req, res) => {
    db = loadDB();
    const { authUserId, guestId } = getCartScope(req);
    const productId = Number(req.params.productId);
    const { quantity, selected } = req.body;

    if (authUserId) {
        syncGuestCartToUser(req, db);
    }

    const cartItem = db.carts.find(item => item.product_id === productId && (authUserId ? item.user_id === authUserId : item.guest_id === guestId));
    if (!cartItem) return res.status(404).json({ error: '购物车中不存在该商品' });

    const product = db.products.find(p => p.id === productId && isPublishedMerchantProduct(db, p));
    if (!product) return res.status(404).json({ error: '商品不存在或已下架' });

    if (quantity !== undefined) {
        const nextQty = Number(quantity);
        if (nextQty <= 0) {
            db.carts = db.carts.filter(item => !(item.product_id === productId && (authUserId ? item.user_id === authUserId : item.guest_id === guestId)));
            saveDB(db);
            return res.json({ success: true, removed: true });
        }
        if (product.stock < nextQty) return res.status(400).json({ error: '库存不足，请调整数量' });
        cartItem.quantity = nextQty;
    }

    if (selected !== undefined) cartItem.selected = Boolean(selected);
    cartItem.price = product.price;
    cartItem.updated_at = new Date().toISOString();

    saveDB(db);
    res.json(cartItem);
});

app.patch('/api/cart/items/:productId/selected', optionalAuthMiddleware, (req, res) => {
    db = loadDB();
    const { authUserId, guestId } = getCartScope(req);
    const productId = Number(req.params.productId);
    const cartItem = db.carts.find(item => item.product_id === productId && (authUserId ? item.user_id === authUserId : item.guest_id === guestId));
    if (!cartItem) return res.status(404).json({ error: '购物车中不存在该商品' });

    cartItem.selected = Boolean(req.body.selected);
    cartItem.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(cartItem);
});

app.patch('/api/cart/select-all', optionalAuthMiddleware, (req, res) => {
    db = loadDB();
    const { authUserId, guestId } = getCartScope(req);
    const selected = Boolean(req.body.selected);
    db.carts.forEach(item => {
        if (authUserId ? item.user_id === authUserId : item.guest_id === guestId) item.selected = selected;
    });
    saveDB(db);
    res.json({ success: true, selected });
});

app.delete('/api/cart/items/:productId', optionalAuthMiddleware, (req, res) => {
    db = loadDB();
    const { authUserId, guestId } = getCartScope(req);
    const productId = Number(req.params.productId);
    const index = db.carts.findIndex(item => item.product_id === productId && (authUserId ? item.user_id === authUserId : item.guest_id === guestId));
    if (index === -1) return res.status(404).json({ error: '购物车中不存在该商品' });

    const [removed] = db.carts.splice(index, 1);
    saveDB(db);
    res.json({ success: true, removed });
});

app.delete('/api/cart', optionalAuthMiddleware, (req, res) => {
    db = loadDB();
    const { authUserId, guestId } = getCartScope(req);
    const before = db.carts.filter(item => authUserId ? item.user_id === authUserId : item.guest_id === guestId).length;
    db.carts = db.carts.filter(item => !(authUserId ? item.user_id === authUserId : item.guest_id === guestId));
    saveDB(db);
    res.json({ success: true, removedCount: before });
});

app.get('/api/cart/settlement', authMiddleware, (req, res) => {
    db = loadDB();
    const items = db.carts.filter(item => item.user_id === req.user.id);
    const { coupon_code } = req.query;
    const settlement = calculateSettlement(items, coupon_code);
    res.json(settlement);
});

app.post('/api/cart/checkout', authMiddleware, (req, res) => {
    db = loadDB();
    const { coupon_code, address_id, remarks } = req.body;
    const items = db.carts.filter(item => item.user_id === req.user.id && item.selected !== false);

    if (!items.length) return res.status(400).json({ error: '请选择至少一件商品进行结算' });

    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const address = address_id
        ? db.addresses.find(a => a.id === Number(address_id) && a.user_id === req.user.id)
        : db.addresses.find(a => a.user_id === req.user.id && a.is_default);

    try {
        const order = createOrderFromItems(db, user, address, items, { coupon_code, remarks });
        db.carts = db.carts.filter(item => !(item.user_id === req.user.id && item.selected !== false && order.items.some(orderItem => orderItem.product_id === item.product_id)));
        saveDB(db);
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message || '创建订单失败' });
    }
});

app.post('/api/orders/direct', authMiddleware, (req, res) => {
    db = loadDB();
    const { product_id, quantity = 1, address_id, coupon_code, remarks } = req.body;

    if (!product_id) return res.status(400).json({ error: '请选择商品' });

    const product = db.products.find(p => p.id === Number(product_id) && isPublishedMerchantProduct(db, p));
    if (!product) return res.status(404).json({ error: '商品不存在或已下架' });

    const qty = Math.max(1, Number(quantity) || 1);
    if (product.stock < qty) return res.status(400).json({ error: '库存不足' });

    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const address = address_id
        ? db.addresses.find(a => a.id === Number(address_id) && a.user_id === req.user.id)
        : db.addresses.find(a => a.user_id === req.user.id && a.is_default);

    const directItems = [{
        product_id: product.id,
        title: product.title,
        price: product.price,
        quantity: qty,
        cover_image: product.cover_image || '',
        selected: true
    }];

    try {
        const order = createOrderFromItems(db, user, address, directItems, { coupon_code, remarks });
        saveDB(db);
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message || '创建订单失败' });
    }
});

app.post('/api/orders/marketplace-checkout', authMiddleware, async (req, res) => {
    db = loadDB();
    const { items: requestedItems, shipping_address, remarks = '' } = req.body;
    if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
        return res.status(400).json({ error: '请选择至少一件商品进行结算' });
    }
    if (requestedItems.length > 50) {
        return res.status(400).json({ error: '单次最多提交50种商品' });
    }

    const recipientName = String(shipping_address?.recipient_name || '').trim();
    const phone = String(shipping_address?.phone || '').trim();
    const region = String(shipping_address?.region || '').trim();
    const detail = String(shipping_address?.detail || '').trim();
    if (!recipientName || !phone || !region || !detail) {
        return res.status(400).json({ error: '请填写完整的收货人、联系电话和收货地址' });
    }

    const user = db.users.find(item => String(item.id) === String(req.user.id));
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const orderItems = [];
    const seenProductIds = new Set();
    for (const item of requestedItems) {
        const productId = Number(item?.product_id);
        const quantity = Number(item?.quantity);
        if (!Number.isSafeInteger(productId) || productId <= 0 ||
            !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
            return res.status(400).json({ error: '商品编号或购买数量无效' });
        }
        if (seenProductIds.has(productId)) {
            return res.status(400).json({ error: '结算商品重复，请刷新购物车后重试' });
        }
        seenProductIds.add(productId);

        const product = db.products.find(candidate =>
            Number(candidate.id) === productId && isPublishedMerchantProduct(db, candidate));
        if (!product) return res.status(404).json({ error: '商品不存在或已下架，请移除后重新结算' });
        orderItems.push({
            product_id: product.id,
            title: product.title,
            price: Number(product.price),
            quantity,
            cover_image: product.cover_image || '',
            selected: true
        });
    }

    const address = {
        id: null,
        recipient_name: recipientName,
        phone,
        province: region,
        city: '',
        district: '',
        detail
    };
    const snapshot = JSON.parse(JSON.stringify(db));
    try {
        const order = createOrderFromItems(db, user, address, orderItems, { remarks });
        await saveDBDurable(db);
        res.status(201).json(order);
    } catch (error) {
        Object.assign(db, snapshot);
        console.error('❌ 商城订单保存失败：', error.message);
        res.status(500).json({ error: '订单提交失败，请稍后重试' });
    }
});

app.get('/api/orders/preview', authMiddleware, (req, res) => {
    db = loadDB();
    const { product_id, quantity = 1, address_id, coupon_code } = req.query;

    if (!product_id) return res.status(400).json({ error: '请选择商品' });

    const product = db.products.find(p => p.id === Number(product_id) && isPublishedMerchantProduct(db, p));
    if (!product) return res.status(404).json({ error: '商品不存在或已下架' });

    const qty = Math.max(1, Number(quantity) || 1);
    const address = address_id
        ? db.addresses.find(a => a.id === Number(address_id) && a.user_id === req.user.id)
        : db.addresses.find(a => a.user_id === req.user.id && a.is_default);

    const items = [{
        product_id: product.id,
        title: product.title,
        price: product.price,
        quantity: qty,
        cover_image: product.cover_image || '',
        selected: true
    }];

    const settlement = calculateSettlement(items, coupon_code);
    res.json({
        items,
        address,
        settlement,
        preview: true
    });
});

// ============ 买家用户中心接口 ============
app.get('/api/orders', authMiddleware, (req, res) => {
    db = loadDB();
    const { status } = req.query;
    const orders = db.orders.filter(order => order.user_id === req.user.id || order.buyer_id === req.user.id);
    const filtered = status ? orders.filter(order => order.status === status) : orders;
    res.json(filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.get('/api/orders/:id', authMiddleware, (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id) && (o.user_id === req.user.id || o.buyer_id === req.user.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json(order);
});

app.patch('/api/orders/:id/status', authMiddleware, (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });

    const allowedStatuses = ['pending_payment', 'paid', 'pending_shipment', 'shipped', 'completed', 'cancelled', 'refund_pending', 'refunded'];
    const { status, reason } = req.body;
    if (!allowedStatuses.includes(status)) return res.status(400).json({ error: '状态无效' });

    const role = normalizeRole(req.user.role);
    const isBuyer = role === ROLE_TYPES.BUYER;
    const isSeller = role === ROLE_TYPES.ARTISAN || role === ROLE_TYPES.ADMIN;

    const allowedTransitions = {
        pending_payment: ['paid', 'cancelled'],
        paid: ['pending_shipment', 'cancelled', 'refund_pending'],
        pending_shipment: ['shipped', 'cancelled', 'refund_pending'],
        shipped: ['completed', 'refund_pending'],
        completed: [],
        cancelled: [],
        refund_pending: ['refunded', 'cancelled'],
        refunded: []
    };

    const nextStatuses = allowedTransitions[order.status] || [];
    if (!nextStatuses.includes(status) && !(isSeller && ['pending_shipment', 'shipped', 'completed', 'cancelled', 'refund_pending', 'refunded'].includes(status))) {
        return res.status(400).json({ error: '当前状态不能变更为该状态' });
    }

    if (isBuyer && !['paid', 'cancelled', 'refund_pending'].includes(status) && order.status !== 'pending_payment') {
        return res.status(403).json({ error: '买家只能支付、取消或申请退款' });
    }

    order.status = status;
    order.status_reason = reason || '';
    order.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(order);
});

app.post('/api/orders/:id/cancel', authMiddleware, (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.user_id !== req.user.id && order.buyer_id !== req.user.id) return res.status(403).json({ error: '你无权操作该订单' });
    if (['completed', 'cancelled', 'refunded'].includes(order.status)) return res.status(400).json({ error: '当前订单状态不可取消' });

    order.status = 'cancelled';
    order.status_reason = req.body.reason || '买家取消';
    order.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(order);
});

app.post('/api/orders/:id/close', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });

    if (order.status !== 'cancelled') return res.status(400).json({ error: '只有已取消订单才能关闭' });

    order.is_closed = true;
    order.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(order);
});

app.post('/api/orders/:id/shipment', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.status !== 'pending_shipment' && order.status !== 'paid') return res.status(400).json({ error: '当前订单不适合发货' });

    const { logistics_company, logistics_no } = req.body;
    order.logistics = {
        company: logistics_company || '默认快递',
        no: logistics_no || '',
        updated_at: new Date().toISOString()
    };
    order.status = 'shipped';
    order.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(order);
});

app.get('/api/orders/:id/logistics', authMiddleware, (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.user_id !== req.user.id && order.buyer_id !== req.user.id && normalizeRole(req.user.role) !== ROLE_TYPES.ADMIN) {
        return res.status(403).json({ error: '你无权查看该订单物流' });
    }

    res.json({
        order_id: order.id,
        order_no: order.order_no,
        logistics: order.logistics || null,
        status: order.status
    });
});

app.get('/api/merchant/orders', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const { status, keyword, page = 1, limit = 20 } = req.query;
    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;
    let orders = isAdmin
        ? db.orders.slice()
        : db.orders.filter(order => isOrderOwnedByMerchant(db, order, req.user.id));

    if (status) {
        orders = orders.filter(order => order.status === status);
    }

    if (keyword) {
        const searchText = String(keyword).trim().toLowerCase();
        orders = orders.filter(order => {
            const haystack = [
                order.order_no,
                order.buyer_name,
                order.shipping_address?.recipient_name,
                order.shipping_address?.phone,
                ...(order.items || []).map(item => item.title)
            ].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(searchText);
        });
    }

    orders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(limit) || 20));
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;

    res.json({
        items: orders.slice(start, end),
        total: orders.length,
        page: pageNum,
        limit: pageSize,
        total_pages: Math.max(1, Math.ceil(orders.length / pageSize))
    });
});

app.get('/api/merchant/orders/stats', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;
    const orders = isAdmin
        ? db.orders.slice()
        : db.orders.filter(order => isOrderOwnedByMerchant(db, order, req.user.id));

    res.json(buildMerchantOrderStats(orders));
});

app.patch('/api/merchant/orders/:id/status', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });

    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;
    if (!isAdmin && !isOrderOwnedByMerchant(db, order, req.user.id)) {
        return res.status(403).json({ error: '你无权操作该订单' });
    }

    const { status, reason } = req.body;
    const allowedStatuses = ['pending_payment', 'paid', 'pending_shipment', 'shipped', 'completed', 'cancelled', 'refund_pending', 'refunded'];
    if (!allowedStatuses.includes(status)) return res.status(400).json({ error: '状态无效' });

    const merchantTransitions = {
        paid: ['pending_shipment', 'cancelled', 'refund_pending'],
        pending_shipment: ['shipped', 'cancelled', 'refund_pending'],
        shipped: ['completed', 'refund_pending'],
        pending_payment: ['cancelled'],
        completed: [],
        cancelled: [],
        refund_pending: ['refunded', 'cancelled'],
        refunded: []
    };

    if (!merchantTransitions[order.status] || !merchantTransitions[order.status].includes(status)) {
        return res.status(400).json({ error: '当前订单状态不能更新为该状态' });
    }

    order.status = status;
    order.status_reason = reason || '';
    order.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(order);
});

app.post('/api/merchant/orders/:id/shipment', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });

    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;
    if (!isAdmin && !isOrderOwnedByMerchant(db, order, req.user.id)) {
        return res.status(403).json({ error: '你无权操作该订单' });
    }

    if (order.status !== 'paid' && order.status !== 'pending_shipment') {
        return res.status(400).json({ error: '当前订单不适合发货' });
    }

    const { logistics_company = '默认快递', logistics_no = '', note = '' } = req.body;
    order.logistics = {
        company: logistics_company,
        no: logistics_no,
        note,
        updated_at: new Date().toISOString()
    };
    order.status = 'shipped';
    order.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(order);
});

app.get('/api/payments/methods', authMiddleware, (req, res) => {
    res.json([
        { value: 'alipay', label: '支付宝', enabled: true },
        { value: 'wechat', label: '微信支付', enabled: true },
        { value: 'bank', label: '银行卡', enabled: true }
    ]);
});

app.post('/api/orders/:id/pay', authMiddleware, (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id) && (o.user_id === req.user.id || o.buyer_id === req.user.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.status !== 'pending_payment') return res.status(400).json({ error: '当前订单不需要支付' });

    const { payment_method = 'alipay', success = true, amount } = req.body;
    const security = validatePaymentSecurity(order, { payment_method, amount: amount || order.total_amount }, req.user);
    if (!security.valid) return res.status(403).json({ error: security.issues.join('；') });

    const paymentRequest = createPaymentRequest(order, payment_method);
    order.payment = {
        ...paymentRequest,
        amount: Number(amount || order.total_amount || 0),
        result: success ? 'pending' : 'failed',
        attempts: (order.payment?.attempts || 0) + 1,
        last_attempt_at: new Date().toISOString(),
        timeout_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
    appendPaymentCredential(order, { ...order.payment, status: 'pending', note: '支付请求发起' });
    order.payment_logs = [...(order.payment_logs || []), buildPaymentLog(order, `发起支付，方式=${payment_method}`, 'info')];
    order.updated_at = new Date().toISOString();
    saveDB(db);
    res.json({
        ...paymentRequest,
        verification: verifyOrderPaymentConsistency(order)
    });
});

app.post('/api/orders/:id/pay/callback', (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });

    const callbackToken = req.headers['x-payment-token'] || req.headers['x-payment-signature'];
    if (callbackToken !== PAYMENT_CALLBACK_TOKEN) {
        return res.status(403).json({ error: '支付回调签名无效' });
    }

    const { status = 'success', payment_method = 'alipay', payment_id, amount } = req.body;
    const paymentStatus = status === 'success' ? 'success' : 'failed';
    const security = validatePaymentSecurity(order, { payment_method, amount: amount || order.total_amount }, null);
    if (!security.valid) return res.status(400).json({ error: security.issues.join('；') });

    order.payment = {
        ...(order.payment || {}),
        payment_id: payment_id || order.payment?.payment_id || `pay_${Date.now()}`,
        payment_method,
        amount: Number(amount || order.total_amount || 0),
        status: paymentStatus,
        result: paymentStatus,
        paid_at: paymentStatus === 'success' ? new Date().toISOString() : null
    };
    order.status = paymentStatus === 'success' ? 'paid' : 'pending_payment';
    appendPaymentCredential(order, { ...order.payment, status: paymentStatus, note: paymentStatus === 'success' ? '支付回调成功' : '支付回调失败' });
    const consistency = verifyOrderPaymentConsistency(order);
    order.payment_logs = [...(order.payment_logs || []), buildPaymentLog(order, paymentStatus === 'success' ? '支付成功回调' : '支付失败回调', paymentStatus === 'success' ? 'info' : 'warning')];
    if (!consistency.valid) {
        order.payment_logs = [...order.payment_logs, buildPaymentLog(order, `状态校验异常: ${consistency.issues.join('；')}`, 'warning')];
    }
    order.updated_at = new Date().toISOString();
    saveDB(db);

    res.json({
        success: paymentStatus === 'success',
        order_id: order.id,
        status: order.status,
        payment: order.payment,
        verification: consistency
    });
});

app.get('/api/orders/:id/payment', authMiddleware, (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id) && (o.user_id === req.user.id || o.buyer_id === req.user.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({
        payment: order.payment || null,
        payment_credentials: order.payment_credentials || [],
        verification: verifyOrderPaymentConsistency(order)
    });
});

app.post('/api/orders/:id/pay/retry', authMiddleware, (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id) && (o.user_id === req.user.id || o.buyer_id === req.user.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.status !== 'pending_payment') return res.status(400).json({ error: '当前订单不需要重试支付' });

    const { payment_method = order.payment?.payment_method || 'alipay' } = req.body;
    const paymentRequest = createPaymentRequest(order, payment_method);
    order.payment = {
        ...paymentRequest,
        result: 'pending',
        attempts: (order.payment?.attempts || 0) + 1,
        last_attempt_at: new Date().toISOString(),
        timeout_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
    order.payment_logs = [...(order.payment_logs || []), buildPaymentLog(order, `支付重试，方式=${payment_method}`, 'info')];
    order.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(paymentRequest);
});

app.post('/api/orders/:id/pay/timeout', authMiddleware, (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });

    if (order.payment?.status === 'success') return res.status(400).json({ error: '支付已成功，无需超时处理' });

    order.payment = {
        ...(order.payment || {}),
        status: 'timeout',
        result: 'timeout',
        timeout_at: new Date().toISOString()
    };
    order.payment_logs = [...(order.payment_logs || []), buildPaymentLog(order, '订单支付超时', 'warning')];
    order.updated_at = new Date().toISOString();
    saveDB(db);
    res.json({ success: true, order_id: order.id, status: 'timeout' });
});

app.get('/api/orders/:id/payment/logs', authMiddleware, (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id) && (o.user_id === req.user.id || o.buyer_id === req.user.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json(order.payment_logs || []);
});

app.get('/api/orders/:id/payment/verify', authMiddleware, (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id) && (o.user_id === req.user.id || o.buyer_id === req.user.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({
        verification: verifyOrderPaymentConsistency(order),
        payment: order.payment || null,
        payment_credentials: order.payment_credentials || []
    });
});

app.post('/api/after-sales', authMiddleware, (req, res) => {
    db = loadDB();
    const { order_id, type, reason, amount, description, logistics } = req.body;
    if (!order_id) return res.status(400).json({ error: '请选择订单' });
    if (!reason) return res.status(400).json({ error: '请填写售后原因' });

    const order = db.orders.find(o => o.id === Number(order_id));
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.user_id !== req.user.id && order.buyer_id !== req.user.id) {
        return res.status(403).json({ error: '你无权申请该订单售后' });
    }
    if (!['paid', 'pending_shipment', 'shipped', 'completed'].includes(order.status)) {
        return res.status(400).json({ error: '当前订单状态不支持售后申请' });
    }

    const existing = (db.after_sales || []).find(item => item.order_id === Number(order_id) && ['pending_review', 'processing', 'approved'].includes(item.status));
    if (existing) return res.status(400).json({ error: '该订单已有正在处理的售后申请' });

    const request = createAfterSalesRequest({
        order,
        userId: req.user.id,
        type,
        reason,
        amount,
        description,
        logistics
    });

    db.after_sales = db.after_sales || [];
    db.after_sales.push(request);
    order.after_sales = [...(order.after_sales || []), request.id];
    order.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(request);
});

app.put('/api/after-sales/:id', authMiddleware, (req, res) => {
    db = loadDB();
    db.after_sales = db.after_sales || [];
    const request = db.after_sales.find(item => item.id === req.params.id);
    if (!request) return res.status(404).json({ error: '售后申请不存在' });
    if (request.user_id !== req.user.id) return res.status(403).json({ error: '你无权修改该售后申请' });
    if (request.status !== 'pending_review') return res.status(400).json({ error: '当前售后申请已进入审核流程，不能修改' });

    const { reason, amount, description, logistics } = req.body;
    if (reason) request.reason = reason;
    if (amount !== undefined) request.amount = Number(amount);
    if (description !== undefined) request.description = description;
    if (logistics !== undefined) request.logistics = logistics;
    request.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(request);
});

app.get('/api/after-sales', authMiddleware, (req, res) => {
    db = loadDB();
    db.after_sales = db.after_sales || [];
    const requests = (db.after_sales || []).filter(item => item.user_id === req.user.id || normalizeRole(req.user.role) === ROLE_TYPES.ADMIN || normalizeRole(req.user.role) === ROLE_TYPES.ARTISAN);
    res.json(requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.get('/api/after-sales/:id', authMiddleware, (req, res) => {
    db = loadDB();
    db.after_sales = db.after_sales || [];
    const request = db.after_sales.find(item => item.id === req.params.id);
    if (!request) return res.status(404).json({ error: '售后申请不存在' });
    if (request.user_id !== req.user.id && normalizeRole(req.user.role) !== ROLE_TYPES.ADMIN && normalizeRole(req.user.role) !== ROLE_TYPES.ARTISAN) {
        return res.status(403).json({ error: '你无权查看该售后申请' });
    }
    res.json(request);
});

app.patch('/api/after-sales/:id/review', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.after_sales = db.after_sales || [];
    const request = db.after_sales.find(item => item.id === req.params.id);
    if (!request) return res.status(404).json({ error: '售后申请不存在' });

    const { status, remark, decision } = req.body;
    const normalizedDecision = decision || status;
    const allowedStatuses = ['approved', 'rejected', 'processing', 'completed'];
    if (!allowedStatuses.includes(normalizedDecision)) return res.status(400).json({ error: '审核状态无效' });

    buildAfterSalesDecision(request, normalizedDecision, req.user.id, remark || '');
    if (request.status === 'approved') {
        const order = db.orders.find(o => o.id === request.order_id);
        if (order) {
            order.status = 'refund_pending';
            order.updated_at = new Date().toISOString();
        }
    }
    saveDB(db);
    res.json(request);
});

app.post('/api/after-sales/:id/decision', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.after_sales = db.after_sales || [];
    const request = db.after_sales.find(item => item.id === req.params.id);
    if (!request) return res.status(404).json({ error: '售后申请不存在' });

    const { decision, remark } = req.body;
    if (!['approve', 'reject'].includes(String(decision || '').toLowerCase())) {
        return res.status(400).json({ error: '请选择 approve 或 reject' });
    }

    buildAfterSalesDecision(request, decision, req.user.id, remark || '');
    if (request.status === 'approved') {
        const order = db.orders.find(o => o.id === request.order_id);
        if (order) {
            order.status = 'refund_pending';
            order.updated_at = new Date().toISOString();
        }
    }
    saveDB(db);
    res.json(request);
});

app.patch('/api/after-sales/:id/logistics', authMiddleware, (req, res) => {
    db = loadDB();
    db.after_sales = db.after_sales || [];
    const request = db.after_sales.find(item => item.id === req.params.id);
    if (!request) return res.status(404).json({ error: '售后申请不存在' });
    if (request.user_id !== req.user.id && normalizeRole(req.user.role) !== ROLE_TYPES.ADMIN && normalizeRole(req.user.role) !== ROLE_TYPES.ARTISAN) {
        return res.status(403).json({ error: '你无权录入该售后物流' });
    }

    const { company, tracking_no, remark } = req.body;
    if (!company && !tracking_no) return res.status(400).json({ error: '请至少填写物流公司或运单号' });

    updateAfterSalesLogistics(request, { company, tracking_no, remark, updated_at: new Date().toISOString() });
    request.status = request.status === 'pending_review' ? 'processing' : request.status;
    pushAfterSalesNotice(request, '退货物流信息已更新，请关注最新状态', 'info');
    saveDB(db);
    res.json(request);
});

app.post('/api/after-sales/:id/complete', authMiddleware, (req, res) => {
    db = loadDB();
    db.after_sales = db.after_sales || [];
    const request = db.after_sales.find(item => item.id === req.params.id);
    if (!request) return res.status(404).json({ error: '售后申请不存在' });
    if (request.user_id !== req.user.id && normalizeRole(req.user.role) !== ROLE_TYPES.ADMIN && normalizeRole(req.user.role) !== ROLE_TYPES.ARTISAN) {
        return res.status(403).json({ error: '你无权关闭该售后' });
    }

    const { refund_amount, refund_status = 'completed', remark = '' } = req.body;
    request.status = 'closed';
    request.refund_amount = Number(refund_amount ?? request.amount ?? 0);
    request.refund_status = refund_status;
    request.result_remark = remark || '售后已完成';
    request.completed_at = new Date().toISOString();
    pushAfterSalesNotice(request, '售后流程已完成，退款结果已更新', refund_status === 'completed' ? 'success' : 'warning');
    saveDB(db);
    res.json(request);
});

app.get('/api/after-sales/:id/trace', authMiddleware, (req, res) => {
    db = loadDB();
    db.after_sales = db.after_sales || [];
    const request = db.after_sales.find(item => item.id === req.params.id);
    if (!request) return res.status(404).json({ error: '售后申请不存在' });
    if (request.user_id !== req.user.id && normalizeRole(req.user.role) !== ROLE_TYPES.ADMIN && normalizeRole(req.user.role) !== ROLE_TYPES.ARTISAN) {
        return res.status(403).json({ error: '你无权查看该售后进度' });
    }
    res.json({
        request,
        timeline: [
            { status: 'created', label: '售后申请已提交', at: request.created_at },
            { status: request.status, label: request.status === 'closed' ? '售后已完成' : '售后处理中', at: request.updated_at }
        ],
        notices: request.notices || []
    });
});

app.get('/api/merchant/after-sales', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.after_sales = db.after_sales || [];
    const { status, keyword } = req.query;
    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;

    let requests = isAdmin
        ? db.after_sales.slice()
        : db.after_sales.filter(request => {
            const order = db.orders.find(o => o.id === request.order_id);
            return order && isOrderOwnedByMerchant(db, order, req.user.id);
        });

    if (status) {
        requests = requests.filter(item => item.status === status);
    }

    if (keyword) {
        const searchText = String(keyword).trim().toLowerCase();
        requests = requests.filter(item => [item.order_no, item.reason, item.description, item.type].filter(Boolean).join(' ').toLowerCase().includes(searchText));
    }

    requests = requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(requests);
});

app.post('/api/merchant/after-sales/:id/reply', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.after_sales = db.after_sales || [];
    const request = db.after_sales.find(item => item.id === req.params.id);
    if (!request) return res.status(404).json({ error: '售后申请不存在' });

    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;
    if (!isAdmin) {
        const order = db.orders.find(o => o.id === request.order_id);
        if (!order || !isOrderOwnedByMerchant(db, order, req.user.id)) {
            return res.status(403).json({ error: '你无权回复该售后申请' });
        }
    }

    const { content } = req.body;
    if (!content) return res.status(400).json({ error: '请填写回复内容' });

    request.reply = {
        content,
        replied_by: req.user.id,
        replied_at: new Date().toISOString()
    };
    request.status = request.status === 'pending_review' ? 'processing' : request.status;
    pushAfterSalesNotice(request, '商家已回复买家，请关注最新处理进度', 'info');
    saveDB(db);
    res.json(request);
});

app.get('/api/merchant/inquiries', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;
    const conversations = db.conversations
        .filter(conv => {
            if (!isAdmin && conv.developer_id !== req.user.id) return false;
            // 过滤掉对方用户已被删除的对话
            const user = db.users.find(u => u.id === conv.user_id);
            return user != null;
        })
        .map(conv => {
            const user = db.users.find(u => u.id === conv.user_id);
            const unread = db.messages.filter(m => m.conversation_id === conv.id && m.sender_id !== req.user.id && !m.is_read).length;
            return {
                ...conv,
                target_name: user?.display_name || '',
                target_username: user?.username || '',
                target_avatar: user?.avatar || '',
                unread
            };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(conversations);
});

app.post('/api/merchant/inquiries/:id/reply', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const convId = Number(req.params.id);
    const conv = db.conversations.find(c => c.id === convId);
    if (!conv) return res.status(404).json({ error: '咨询会话不存在' });

    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;
    if (!isAdmin && conv.developer_id !== req.user.id) {
        return res.status(403).json({ error: '你无权回复该咨询' });
    }

    const content = req.body.content || '';
    if (!content) return res.status(400).json({ error: '请填写回复内容' });

    const id = db.nextId.message++;
    const msg = {
        id,
        conversation_id: convId,
        sender_id: req.user.id,
        content,
        file_path: '',
        file_type: '',
        file_name: '',
        is_read: false,
        created_at: new Date().toISOString()
    };
    db.messages.push(msg);
    saveDB(db);

    const sender = db.users.find(u => u.id === req.user.id);
    res.json({
        ...msg,
        sender_name: sender?.display_name || '',
        sender_role: sender?.role || ''
    });
});

app.post('/api/complaints', authMiddleware, (req, res) => {
    db = loadDB();
    db.complaints = db.complaints || [];
    const { order_id, type, reason, description, evidence = [] } = req.body;
    if (!reason || !description) return res.status(400).json({ error: '请填写投诉原因和详情' });

    const order = order_id ? db.orders.find(o => o.id === Number(order_id)) : null;
    if (order_id && !order) return res.status(404).json({ error: '订单不存在' });
    if (order && order.user_id !== req.user.id && order.buyer_id !== req.user.id) {
        const isMerchant = isOrderOwnedByMerchant(db, order, req.user.id);
        if (!isMerchant && normalizeRole(req.user.role) !== ROLE_TYPES.ADMIN) {
            return res.status(403).json({ error: '你无权对该订单发起投诉' });
        }
    }

    const ticket = createComplaintTicket({
        order,
        userId: req.user.id,
        type,
        reason,
        description,
        evidence
    });
    db.complaints.push(ticket);
    saveDB(db);
    res.json(ticket);
});

app.get('/api/complaints', authMiddleware, (req, res) => {
    db = loadDB();
    db.complaints = db.complaints || [];
    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;
    const tickets = (db.complaints || []).filter(ticket => {
        if (isAdmin || ticket.user_id === req.user.id) return true;
        const order = db.orders.find(o => o.id === ticket.order_id);
        return Boolean(order && isOrderOwnedByMerchant(db, order, req.user.id));
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(tickets);
});

app.get('/api/merchant/complaints', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.complaints = db.complaints || [];
    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;
    const tickets = (db.complaints || []).filter(ticket => {
        if (isAdmin) return true;
        const order = db.orders.find(o => o.id === ticket.order_id);
        return Boolean(order && isOrderOwnedByMerchant(db, order, req.user.id));
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(tickets);
});

app.patch('/api/merchant/complaints/:id/status', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.complaints = db.complaints || [];
    const ticket = db.complaints.find(item => item.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: '投诉/纠纷单不存在' });

    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;
    if (!isAdmin) {
        const order = db.orders.find(o => o.id === ticket.order_id);
        if (!order || !isOrderOwnedByMerchant(db, order, req.user.id)) {
            return res.status(403).json({ error: '你无权处理该投诉' });
        }
    }

    const { status, remark } = req.body;
    const allowedStatuses = ['pending', 'processing', 'resolved', 'closed', 'rejected'];
    if (!allowedStatuses.includes(status)) return res.status(400).json({ error: '状态无效' });

    ticket.status = status;
    ticket.remark = remark || '';
    ticket.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(ticket);
});

app.get('/api/profile', authMiddleware, (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const { password, ...userInfo } = user;
    const addresses = db.addresses.filter(a => a.user_id === req.user.id);
    const favorites = db.favorites.filter(f => f.user_id === req.user.id);
    const reviews = db.reviews.filter(r => r.user_id === req.user.id);
    const orders = db.orders.filter(o => o.user_id === req.user.id || o.buyer_id === req.user.id);

    res.json({
        ...userInfo,
        addresses,
        favorites,
        reviews,
        orders
    });
});

app.put('/api/profile', authMiddleware, (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const { display_name, phone, avatar } = req.body;
    if (display_name) user.display_name = display_name;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    saveDB(db);
    const { password, ...userInfo } = user;
    res.json(userInfo);
});

app.get('/api/addresses', authMiddleware, (req, res) => {
    db = loadDB();
    const addresses = db.addresses.filter(a => a.user_id === req.user.id);
    res.json(addresses);
});

app.post('/api/addresses', authMiddleware, (req, res) => {
    db = loadDB();
    const { recipient_name, phone, province, city, district, detail, is_default } = req.body;

    if (!recipient_name || !phone || !province || !city || !district || !detail) {
        return res.status(400).json({ error: '收货地址信息不完整' });
    }

    const id = db.nextId.address++;
    const address = {
        id,
        user_id: req.user.id,
        recipient_name,
        phone,
        province,
        city,
        district,
        detail,
        is_default: Boolean(is_default) || false
    };

    if (address.is_default) {
        db.addresses.forEach(a => {
            if (a.user_id === req.user.id) a.is_default = false;
        });
    } else if (!db.addresses.some(a => a.user_id === req.user.id && a.is_default)) {
        address.is_default = true;
    }

    db.addresses.push(address);
    saveDB(db);
    res.json(address);
});

app.put('/api/addresses/:id', authMiddleware, (req, res) => {
    db = loadDB();
    const address = db.addresses.find(a => a.id === Number(req.params.id) && a.user_id === req.user.id);
    if (!address) return res.status(404).json({ error: '收货地址不存在' });

    const { recipient_name, phone, province, city, district, detail, is_default } = req.body;
    if (recipient_name) address.recipient_name = recipient_name;
    if (phone) address.phone = phone;
    if (province) address.province = province;
    if (city) address.city = city;
    if (district) address.district = district;
    if (detail) address.detail = detail;
    if (is_default !== undefined) address.is_default = Boolean(is_default);

    if (address.is_default) {
        db.addresses.forEach(a => {
            if (a.user_id === req.user.id && a.id !== address.id) a.is_default = false;
        });
    }

    saveDB(db);
    res.json(address);
});

app.delete('/api/addresses/:id', authMiddleware, (req, res) => {
    db = loadDB();
    const index = db.addresses.findIndex(a => a.id === Number(req.params.id) && a.user_id === req.user.id);
    if (index === -1) return res.status(404).json({ error: '收货地址不存在' });

    const [removed] = db.addresses.splice(index, 1);
    const remaining = db.addresses.filter(a => a.user_id === req.user.id);
    if (removed.is_default && remaining.length > 0) {
        remaining[0].is_default = true;
    }

    saveDB(db);
    res.json({ success: true, removed });
});

app.patch('/api/addresses/:id/default', authMiddleware, (req, res) => {
    db = loadDB();
    const address = db.addresses.find(a => a.id === Number(req.params.id) && a.user_id === req.user.id);
    if (!address) return res.status(404).json({ error: '收货地址不存在' });

    db.addresses.forEach(a => {
        if (a.user_id === req.user.id) a.is_default = a.id === address.id;
    });

    saveDB(db);
    res.json(address);
});

app.post('/api/password', authMiddleware, async (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        return res.status(400).json({ error: '请输入当前密码和新密码' });
    }

    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(400).json({ error: '当前密码错误' });

    if (new_password.length < 6) return res.status(400).json({ error: '新密码至少6位' });

    user.password = await bcrypt.hash(new_password, BCRYPT_COST);
    saveDB(db);
    res.json({ success: true });
});

app.get('/api/profile/orders', authMiddleware, (req, res) => {
    db = loadDB();
    const orders = db.orders.filter(o => o.user_id === req.user.id || o.buyer_id === req.user.id);
    res.json(orders);
});

app.get('/api/profile/favorites', authMiddleware, (req, res) => {
    db = loadDB();
    const favorites = db.favorites.filter(f => f.user_id === req.user.id);
    res.json(favorites);
});

app.post('/api/orders/:id/reviews', authMiddleware, (req, res) => {
    db = loadDB();
    const order = db.orders.find(o => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.user_id !== req.user.id && order.buyer_id !== req.user.id) {
        return res.status(403).json({ error: '你无权评价该订单' });
    }
    if (order.status !== 'completed') {
        return res.status(400).json({ error: '只有已完成订单才能评价' });
    }

    const { rating, content, experience, product_id, files = [], parent_review_id = null } = req.body;
    if (!rating) return res.status(400).json({ error: '请选择评分' });
    if (!content && !experience) return res.status(400).json({ error: '请填写评价内容或购买体验' });

    const existing = (db.reviews || []).find(item => item.order_id === order.id && (item.parent_review_id || null) === (parent_review_id || null));
    if (existing && !parent_review_id) {
        return res.status(400).json({ error: '该订单已评价，不能重复评价' });
    }

    const review = createReview({
        order,
        user: req.user,
        rating,
        content,
        experience,
        productId: product_id || order.items?.[0]?.product_id,
        files,
        parentReviewId: parent_review_id
    });

    db.reviews = db.reviews || [];
    db.reviews.push(review);
    saveDB(db);
    res.json(review);
});

app.post('/api/reviews/:id/additional', authMiddleware, (req, res) => {
    db = loadDB();
    db.reviews = db.reviews || [];
    const review = db.reviews.find(item => item.id === req.params.id);
    if (!review) return res.status(404).json({ error: '评价不存在' });
    if (review.user_id !== req.user.id) return res.status(403).json({ error: '你无权追加评价' });

    const { content, experience, files = [] } = req.body;
    if (!content && !experience) return res.status(400).json({ error: '请填写追加评价内容' });

    review.additional_content = content || '';
    review.additional_experience = experience || '';
    review.additional_files = Array.isArray(files) ? files : [];
    review.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(review);
});

app.get('/api/products/:id/reviews', optionalAuthMiddleware, (req, res) => {
    db = loadDB();
    db.reviews = db.reviews || [];
    const { sort = 'time', rating, has_images, page = 1, pageSize = 10 } = req.query;
    let reviews = db.reviews.filter(item => isPublicProductReview(item, req.params.id));

    if (rating) {
        reviews = reviews.filter(item => Number(item.rating) === Number(rating));
    }
    if (has_images === 'true') {
        reviews = reviews.filter(item => Array.isArray(item.files) && item.files.length > 0);
    }

    reviews = reviews.sort((a, b) => {
        if (sort === 'rating') return Number(b.rating) - Number(a.rating);
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const start = (Number(page) - 1) * Number(pageSize);
    const end = start + Number(pageSize);
    const paged = reviews.slice(start, end);

    const visibleReviews = db.reviews.filter(item => isPublicProductReview(item, req.params.id));
    const userId = req.user
        ? db.users.find(item => String(item.id) === String(req.user.id))?.id
        : null;
    const eligibility = getProductReviewEligibility(db, userId, req.params.id);
    res.json({
        reviews: paged.map(toPublicProductReview),
        stats: buildReviewStats(visibleReviews),
        eligibility: { eligible: eligibility.eligible, reason: eligibility.reason },
        pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            total: reviews.length
        }
    });
});

app.post('/api/products/:id/reviews', authMiddleware, async (req, res) => {
    db = loadDB();
    db.reviews = db.reviews || [];
    const productId = Number(req.params.id);
    const { rating, content, anonymous = false } = req.body;
    const normalizedContent = typeof content === 'string' ? content.trim() : '';

    if (!Number.isSafeInteger(productId) || productId <= 0) {
        return res.status(400).json({ error: '商品编号无效' });
    }
    const numericRating = Number(rating);
    if (!['number', 'string'].includes(typeof rating) || !Number.isInteger(numericRating) ||
        numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ error: '请选择1至5星评分' });
    }
    if (!normalizedContent || normalizedContent.length > 1000) {
        return res.status(400).json({ error: '评价内容不能为空且不能超过1000字' });
    }

    const publishedMerchantProduct = db.products.some(product =>
        Number(product.id) === productId && isPublishedMerchantProduct(db, product));
    if (!publishedMerchantProduct) {
        return res.status(404).json({ error: '商品不存在或已下架，无法评价' });
    }

    const eligibility = getProductReviewEligibility(db, req.user.id, productId);
    if (!eligibility.eligible) {
        const messages = {
            buyer_account_required: '只有以用户身份注册的账号可以评价商品',
            purchase_required: '购买该商品并完成订单后才可以评价',
            order_not_completed: '该商品订单尚未完成，确认收货后即可评价',
            already_reviewed: '该订单中的商品已评价'
        };
        const status = eligibility.reason === 'already_reviewed' ? 400 : 403;
        return res.status(status).json({
            error: messages[eligibility.reason] || '当前账号暂时无法评价该商品',
            reason: eligibility.reason
        });
    }

    const review = createProductReview({
        order: eligibility.order,
        user: req.user,
        productId,
        rating: numericRating,
        content: normalizedContent,
        anonymous: anonymous === true
    });
    db.reviews.push(review);
    try {
        await saveDBDurable(db);
        return res.status(201).json({
            review: toPublicProductReview(review),
            stats: buildReviewStats(db.reviews.filter(item => isPublicProductReview(item, productId)))
        });
    } catch (error) {
        db.reviews = db.reviews.filter(item => item.id !== review.id);
        console.error('❌ 保存商城评价失败：', error.message);
        return res.status(500).json({ error: '评价保存失败，请稍后重试' });
    }
});

app.post('/api/reviews/:id/reply', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.reviews = db.reviews || [];
    const review = db.reviews.find(item => item.id === req.params.id);
    if (!review) return res.status(404).json({ error: '评价不存在' });

    const { content } = req.body;
    if (!content) return res.status(400).json({ error: '请输入回复内容' });

    review.reply = content;
    review.reply_at = new Date().toISOString();
    review.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(review);
});

app.patch('/api/reviews/:id/approve', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.reviews = db.reviews || [];
    const review = db.reviews.find(item => item.id === req.params.id);
    if (!review) return res.status(404).json({ error: '评价不存在' });

    const { status = 'approved', reason = '' } = req.body;
    review.status = status;
    review.review_reason = reason;
    review.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(review);
});

app.patch('/api/reviews/:id/block', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.reviews = db.reviews || [];
    const review = db.reviews.find(item => item.id === req.params.id);
    if (!review) return res.status(404).json({ error: '评价不存在' });

    const { blocked = true, reason = '' } = req.body;
    review.is_blocked = Boolean(blocked);
    review.review_reason = reason || '违规内容';
    review.status = blocked ? 'blocked' : 'approved';
    review.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(review);
});

app.patch('/api/reviews/:id/hide', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.reviews = db.reviews || [];
    const review = db.reviews.find(item => item.id === req.params.id);
    if (!review) return res.status(404).json({ error: '评价不存在' });

    const { hidden = true } = req.body;
    review.is_hidden = Boolean(hidden);
    review.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(review);
});

app.delete('/api/reviews/:id', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.reviews = db.reviews || [];
    const index = db.reviews.findIndex(item => item.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: '评价不存在' });

    db.reviews.splice(index, 1);
    saveDB(db);
    res.json({ success: true, review_id: req.params.id });
});

app.get('/api/reviews/stats', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    db.reviews = db.reviews || [];
    const { product_id } = req.query;
    const reviews = product_id ? db.reviews.filter(item => item.product_id === Number(product_id)) : db.reviews;
    res.json({
        reviews: reviews.length,
        stats: buildReviewStats(reviews),
        visibility: {
            hidden: reviews.filter(item => item.is_hidden).length,
            blocked: reviews.filter(item => item.is_blocked).length
        }
    });
});

app.get('/api/profile/reviews', authMiddleware, (req, res) => {
    db = loadDB();
    const reviews = db.reviews.filter(r => r.user_id === req.user.id);
    res.json(reviews);
});
// ============ 数据统计接口 ============

/**
 * 销量统计
 * GET /api/stats/sales
 */
app.get('/api/stats/sales', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const { start_date, end_date, merchant_id } = req.query;
    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;

    let orders = db.orders.filter(order => {
        if (!['paid', 'completed', 'shipped'].includes(order.status)) return false;
        if (start_date && new Date(order.created_at) < new Date(start_date)) return false;
        if (end_date) {
            const end = new Date(end_date);
            end.setHours(23, 59, 59, 999);
            if (new Date(order.created_at) > end) return false;
        }
        if (!isAdmin) return isOrderOwnedByMerchant(db, order, req.user.id);
        if (merchant_id && isAdmin) {
            const merchant = db.merchants.find(m => m.id === Number(merchant_id));
            return merchant ? isOrderOwnedByMerchant(db, order, merchant.user_id) : false;
        }
        return true;
    });

    const totalSales = orders.reduce((sum, order) => {
        return sum + (order.items || []).reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0);
    }, 0);

    const categoryStats = {};
    orders.forEach(order => {
        (order.items || []).forEach(item => {
            const product = db.products.find(p => p.id === item.product_id);
            const category = product?.category || '未分类';
            if (!categoryStats[category]) categoryStats[category] = { quantity: 0, amount: 0 };
            categoryStats[category].quantity += Number(item.quantity) || 0;
            categoryStats[category].amount += (Number(item.price) || 0) * (Number(item.quantity) || 0);
        });
    });

    const dailyStats = {};
    orders.forEach(order => {
        const date = order.created_at.slice(0, 10);
        if (!dailyStats[date]) dailyStats[date] = { orders: 0, quantity: 0, amount: 0 };
        dailyStats[date].orders += 1;
        dailyStats[date].quantity += (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        dailyStats[date].amount += Number(order.total_amount) || 0;
    });

    res.json({ total_sales: totalSales, total_orders: orders.length, category_stats: categoryStats, daily_stats: dailyStats });
});

/**
 * 收入统计
 * GET /api/stats/revenue
 */
app.get('/api/stats/revenue', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const { start_date, end_date, merchant_id } = req.query;
    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;

    let orders = db.orders.filter(order => {
        if (!['paid', 'completed', 'shipped'].includes(order.status)) return false;
        if (start_date && new Date(order.created_at) < new Date(start_date)) return false;
        if (end_date) {
            const end = new Date(end_date);
            end.setHours(23, 59, 59, 999);
            if (new Date(order.created_at) > end) return false;
        }
        if (!isAdmin) return isOrderOwnedByMerchant(db, order, req.user.id);
        if (merchant_id && isAdmin) {
            const merchant = db.merchants.find(m => m.id === Number(merchant_id));
            return merchant ? isOrderOwnedByMerchant(db, order, merchant.user_id) : false;
        }
        return true;
    });

    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
    const monthlyStats = {};
    orders.forEach(order => {
        const month = order.created_at.slice(0, 7);
        if (!monthlyStats[month]) monthlyStats[month] = { revenue: 0, orders: 0 };
        monthlyStats[month].revenue += Number(order.total_amount) || 0;
        monthlyStats[month].orders += 1;
    });

    res.json({
        total_revenue: totalRevenue.toFixed(2),
        total_orders: orders.length,
        avg_order_value: orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : '0.00',
        monthly_stats: monthlyStats
    });
});

/**
 * 订单趋势分析
 * GET /api/stats/orders/trend
 */
app.get('/api/stats/orders/trend', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const { period = 'month', start_date, end_date, merchant_id } = req.query;
    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;

    let orders = db.orders.filter(order => {
        if (start_date && new Date(order.created_at) < new Date(start_date)) return false;
        if (end_date) {
            const end = new Date(end_date);
            end.setHours(23, 59, 59, 999);
            if (new Date(order.created_at) > end) return false;
        }
        if (!isAdmin) return isOrderOwnedByMerchant(db, order, req.user.id);
        if (merchant_id && isAdmin) {
            const merchant = db.merchants.find(m => m.id === Number(merchant_id));
            return merchant ? isOrderOwnedByMerchant(db, order, merchant.user_id) : false;
        }
        return true;
    });

    const groupByPeriod = (order) => {
        const date = new Date(order.created_at);
        switch (period) {
            case 'day': return order.created_at.slice(0, 10);
            case 'week': {
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                return new Date(date.setDate(diff)).toISOString().slice(0, 10);
            }
            case 'year': return order.created_at.slice(0, 4);
            default: return order.created_at.slice(0, 7);
        }
    };

    const trendData = {};
    orders.forEach(order => {
        const key = groupByPeriod(order);
        if (!trendData[key]) {
            trendData[key] = { date: key, total_orders: 0, paid_orders: 0, completed_orders: 0, cancelled_orders: 0 };
        }
        trendData[key].total_orders += 1;
        if (order.status === 'paid') trendData[key].paid_orders += 1;
        if (order.status === 'completed') trendData[key].completed_orders += 1;
        if (order.status === 'cancelled') trendData[key].cancelled_orders += 1;
    });

    const summary = {
        total_orders: orders.length,
        paid_rate: orders.length > 0 ? ((orders.filter(o => o.status === 'paid').length / orders.length) * 100).toFixed(1) : '0',
        completion_rate: orders.length > 0 ? ((orders.filter(o => o.status === 'completed').length / orders.length) * 100).toFixed(1) : '0',
        cancellation_rate: orders.length > 0 ? ((orders.filter(o => o.status === 'cancelled').length / orders.length) * 100).toFixed(1) : '0'
    };

    res.json({ period, trend: Object.values(trendData).sort((a, b) => a.date.localeCompare(b.date)), summary });
});

/**
 * 热门商品统计
 * GET /api/stats/hot-products
 */
app.get('/api/stats/hot-products', authMiddleware, requireRole([ROLE_TYPES.ARTISAN, ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const { limit = 10, start_date, end_date, merchant_id } = req.query;
    const isAdmin = normalizeRole(req.user.role) === ROLE_TYPES.ADMIN;

    let orders = db.orders.filter(order => {
        if (!['paid', 'completed', 'shipped'].includes(order.status)) return false;
        if (start_date && new Date(order.created_at) < new Date(start_date)) return false;
        if (end_date) {
            const end = new Date(end_date);
            end.setHours(23, 59, 59, 999);
            if (new Date(order.created_at) > end) return false;
        }
        if (!isAdmin) return isOrderOwnedByMerchant(db, order, req.user.id);
        if (merchant_id && isAdmin) {
            const merchant = db.merchants.find(m => m.id === Number(merchant_id));
            return merchant ? isOrderOwnedByMerchant(db, order, merchant.user_id) : false;
        }
        return true;
    });

    const productStats = {};
    orders.forEach(order => {
        (order.items || []).forEach(item => {
            const productId = item.product_id;
            if (!productStats[productId]) {
                productStats[productId] = { product_id: productId, title: item.title, quantity: 0, revenue: 0 };
            }
            productStats[productId].quantity += Number(item.quantity) || 0;
            productStats[productId].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
        });
    });

    const hotProducts = Object.values(productStats)
        .map(stat => {
            const product = db.products.find(p => p.id === stat.product_id);
            return { ...stat, category: product?.category || '', merchant_name: product?.merchant_name || '' };
        })
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, Number(limit));

    res.json({ hot_products: hotProducts, total_count: Object.keys(productStats).length });
});
// ============ 静态文件服务（上传目录） ============
app.use('/uploads', express.static(uploadsDir));

// ============ 商城（非遗器物商城）静态托管 ============
// 商城前端（feiyi-ecommerce）构建产物部署到 /shop/ 路径下，
// 与主平台同源（localhost:3000），从而共享 localStorage 实现单点登录。
const shopDist = path.join(__dirname, 'feiyi-ecommerce', 'dist');
if (fs.existsSync(shopDist)) {
    // 静态资源：/shop/assets/xxx → dist/assets/xxx
    app.use('/shop', express.static(shopDist));
    // SPA history 路由回退：/shop/* 非静态文件请求一律返回 index.html
    app.get('/shop/*', (req, res) => {
        res.sendFile(path.join(shopDist, 'index.html'));
    });
} else {
    // 构建产物（dist）不入库，需先在 feiyi-ecommerce 目录执行 npm run build
    console.log('⚠️  商城未构建：找不到 feiyi-ecommerce/dist');
    console.log('    请运行 build-shop.bat（或手动执行 cd feiyi-ecommerce && npm install && npm run build）后重启服务器');
    console.log('    在此之前访问 /shop/ 会返回 404');
}

// ============ 启动服务器 ============
module.exports = {
    app,
    __test_helpers: {
        validatePaymentSecurity,
        verifyOrderPaymentConsistency,
        createPaymentRequest,
        buildPaymentLog,
        createAfterSalesRequest,
        buildAfterSalesDecision,
        updateAfterSalesLogistics,
        createReview,
        createProductReview,
        getProductReviewEligibility,
        buildReviewStats,
        isPublicProductReview,
        toPublicProductReview,
        conversationsBetween,
        siblingConversationIds,
        isConversationParty,
        otherPartyId
    }
};

if (require.main === module) {
    // ---------- 启动前安全自查 ----------
    if (JWT_SECRET === DEV_JWT_SECRET) {
        console.warn('⚠️  未配置 JWT_SECRET，正在使用不安全的开发默认密钥。');
        console.warn('    部署到服务器前请在 .env 中设置 JWT_SECRET（随机长字符串），否则令牌可被伪造。');
    }
    if (!fs.existsSync(path.join(__dirname, '.env'))) {
        console.warn('⚠️  未找到 .env 文件，将使用默认配置。可复制 .env.example 为 .env 后按需修改。');
    }
    if (!CORS_ORIGINS.length) {
        console.log('ℹ️  未配置 CORS_ORIGIN：仅允许同源访问（同域部署无需配置，最安全）。');
    }

    startServer();
}

/**
 * 启动服务：先连接 MySQL 载入数据，成功后再监听端口。
 * 数据库不可用时直接报错退出，避免出现「以为在连数据库、其实没数据」的假象。
 */
async function startServer() {
    try {
        db = await store.init();
        const mode = store.getMode();
        if (mode === 'mysql') {
            const { ping } = require('./db/pool');
            const status = await ping();
            if (!status.ok) throw new Error(status.error);
            console.log(`✅ 已连接 MySQL（${process.env.DB_NAME || 'heritage'}，${status.version}），` +
                `载入用户 ${db.users.length} · 会话 ${db.conversations.length} · 消息 ${db.messages.length} 条`);
        } else {
            console.log(`✅ JSON 文件存储模式（database.json）已就绪，` +
                `载入用户 ${db.users.length} · 会话 ${db.conversations.length} · 消息 ${db.messages.length} 条`);
        }
    } catch (e) {
        console.error('❌ 数据层初始化失败：', e.message);
        console.error('   请检查 DB_MODE 与对应的数据存储配置；服务不会在 MySQL 与 JSON 存储间自动切换。');
        if (e.message && (e.message.includes('MySQL') || e.message.includes('ECONNREFUSED') || e.message.includes('ETIMEDOUT'))) {
            console.error('   MySQL 相关排查步骤：');
            console.error('     1) MySQL 服务是否已启动（Windows 服务名通常为 MySQL90）');
            console.error('     2) .env 中的 DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME 是否正确');
            console.error('     3) 是否已执行 node db/init.js 建表、node db/migrate.js 导入数据');
        }
        process.exit(1);
    }

    const server = app.listen(PORT, HOST, () => {
        console.log('========================================');
        console.log('  华夏风物 · 非遗传承 后端服务');
        console.log('========================================');
        console.log(`  ✅ 服务已启动，监听 ${HOST}:${PORT}`);
        console.log(`  🏠 主页:        http://localhost:${PORT}/MainPage.html`);
        console.log(`  🔐 登录注册:    http://localhost:${PORT}/login.html`);
        console.log(`  👤 用户中心:    http://localhost:${PORT}/user-dashboard.html`);
        console.log(`  👨‍💻 开发者中心:  http://localhost:${PORT}/developer-dashboard.html`);
        console.log(`  🛍️ 商城:        http://localhost:${PORT}/shop/`);
        if (HOST === '0.0.0.0') {
            console.log('  🌐 局域网/公网可通过本机 IP 访问（如 http://<服务器IP>:' + PORT + '/）');
        }
        console.log('========================================');
    });

    // 端口占用等启动错误：给出可操作的提示，而不是抛一堆堆栈
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ 端口 ${PORT} 已被占用。请关闭占用该端口的程序，或用 PORT=其他端口 启动。`);
            console.error('   （Windows 可执行 netstat -ano | findstr :' + PORT + ' 查看占用进程）');
        } else {
            console.error('❌ 服务启动失败:', err.message);
        }
        process.exit(1);
    });

    // ---------- 优雅关闭：停止接收新请求后再退出，避免写操作被截断 ----------
    let shuttingDown = false;
    const shutdown = (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`\n收到 ${signal}，正在优雅关闭服务...`);
        server.close(async () => {
            try {
                // 等待内存中的变更全部写入 MySQL，避免丢数据
                await store.flush();
                console.log('✅ 数据已同步到 MySQL');
                const pool = require('./db/pool');
                if (pool && typeof pool.closePool === 'function') await pool.closePool();
            } catch (e) {
                console.error('⚠️  关闭时同步数据出错：', e.message);
            }
            console.log('✅ 服务已安全关闭');
            process.exit(0);
        });
        // 兜底：10 秒内未能正常关闭则强制退出
        setTimeout(() => {
            console.warn('⚠️  关闭超时，强制退出');
            process.exit(1);
        }, 10000).unref();
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}