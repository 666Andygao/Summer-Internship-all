const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'ich-heritage-platform-secret-key-2026';
const PAYMENT_CALLBACK_TOKEN = 'ich-heritage-platform-callback-2026';
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

// ============ 中间件 ============
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

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
const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    fileFilter: (req, file, cb) => {
        const allowed = /^(video\/|image\/)/;
        cb(null, allowed.test(file.mimetype));
    }
});

// ============ JSON 文件数据库 ============
const DB_PATH = path.join(__dirname, 'database.json');

function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        return {
            users: [],
            conversations: [],
            messages: [],
            addresses: [],
            favorites: [],
            reviews: [],
            orders: [],
            carts: [],
            nextId: { user: 1, conversation: 1, message: 1, address: 1, favorite: 1, review: 1, order: 1, cart: 1 }
        };
    }
    try {
        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        data.addresses = data.addresses || [];
        data.favorites = data.favorites || [];
        data.reviews = data.reviews || [];
        data.orders = data.orders || [];
        data.carts = data.carts || [];
        data.merchants = data.merchants || [];
        data.products = data.products || [];
        data.after_sales = data.after_sales || [];
        data.nextId = data.nextId || { user: 1, conversation: 1, message: 1, address: 1, favorite: 1, review: 1, order: 1, merchant: 1, product: 1, cart: 1, complaint: 1 };
        data.nextId.address = data.nextId.address || 1;
        data.nextId.favorite = data.nextId.favorite || 1;
        data.nextId.review = data.nextId.review || 1;
        data.nextId.order = data.nextId.order || 1;
        data.nextId.merchant = data.nextId.merchant || 1;
        data.nextId.product = data.nextId.product || 1;
        data.nextId.cart = data.nextId.cart || 1;
        data.nextId.complaint = data.nextId.complaint || 1;
        data.complaints = data.complaints || [];
        return data;
    } catch (e) {
        console.error('数据库文件损坏，创建新数据库');
        return {
            users: [],
            conversations: [],
            messages: [],
            addresses: [],
            favorites: [],
            reviews: [],
            orders: [],
            carts: [],
            nextId: { user: 1, conversation: 1, message: 1, address: 1, favorite: 1, review: 1, order: 1, cart: 1 }
        };
    }
}

function saveDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// 初始化数据库
let db = loadDB();
// 确保 nextId 存在（兼容旧数据）
if (!db.nextId) db.nextId = { user: 1, conversation: 1, message: 1, address: 1, favorite: 1, review: 1, order: 1, cart: 1, complaint: 1 };
if (!Array.isArray(db.messages)) db.messages = [];
if (!Array.isArray(db.addresses)) db.addresses = [];
if (!Array.isArray(db.favorites)) db.favorites = [];
if (!Array.isArray(db.reviews)) db.reviews = [];
if (!Array.isArray(db.orders)) db.orders = [];
if (!Array.isArray(db.carts)) db.carts = [];
if (!Array.isArray(db.merchants)) db.merchants = [];
if (!Array.isArray(db.products)) db.products = [];
if (!Array.isArray(db.after_sales)) db.after_sales = [];
if (!Array.isArray(db.complaints)) db.complaints = [];
if (!db.nextId.cart) db.nextId.cart = 1;
if (!db.nextId.complaint) db.nextId.complaint = 1;

// ============ 认证中间件 ============
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: '请先登录' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
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

        if (!product || product.is_deleted || product.status === 'deleted') {
            productStatus = 'invalid';
            warning = '该商品已下架或不存在';
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
        const product = db.products.find(p => p.id === item.product_id && !p.is_deleted && p.status !== 'deleted');
        if (!product) {
            throw new Error(`商品 ${item.title} 已下架或不存在`);
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

        const normalizedRole = normalizeRole(role);
        if (!isValidRole(normalizedRole)) {
            return res.status(400).json({ error: '角色无效' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: '密码至少6位' });
        }

        // 重新加载数据库以获取最新数据
        db = loadDB();

        const existing = db.users.find(u => u.username === username);
        if (existing) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = db.nextId.user++;
        const now = new Date().toISOString();

        const newUser = {
            id,
            username,
            password: hashedPassword,
            role: normalizedRole,
            display_name,
            phone: phone || '',
            avatar: '',
            addresses: [],
            created_at: now
        };
        db.users.push(newUser);
        saveDB(db);

        const token = jwt.sign(
            { id, username, role: normalizedRole, display_name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id, username, role: normalizedRole, display_name, phone }
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

        const normalizedRole = normalizeRole(role);
        db = loadDB();
        const user = db.users.find(u => u.username === username && normalizeRole(u.role) === normalizedRole);

        if (!user) {
            return res.status(400).json({ error: '用户名或密码错误，或角色不匹配' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(400).json({ error: '用户名或密码错误' });
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
    res.json(userInfo);
});

// 获取用户列表（管理员可查看全部，其他角色仅看自己）
app.get('/api/users', authMiddleware, requireRole([ROLE_TYPES.ADMIN]), (req, res) => {
    db = loadDB();
    const users = db.users.map(({ password, ...user }) => user);
    res.json(users);
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

// 获取或创建对话
app.post('/api/conversations', authMiddleware, (req, res) => {
    const { target_id } = req.body;
    db = loadDB();
    const target = db.users.find(u => u.id === target_id);
    if (!target) return res.status(404).json({ error: '对方不存在' });

    const userId = isBuyerRole(req.user.role) ? req.user.id : target_id;
    const devId = isArtisanRole(req.user.role) ? req.user.id : target_id;

    let conv = db.conversations.find(c => c.user_id === userId && c.developer_id === devId);

    if (!conv) {
        const id = db.nextId.conversation++;
        conv = {
            id,
            user_id: userId,
            developer_id: devId,
            created_at: new Date().toISOString()
        };
        db.conversations.push(conv);
        saveDB(db);
    }

    res.json(conv);
});

// 获取我的对话列表
app.get('/api/conversations', authMiddleware, (req, res) => {
    db = loadDB();
    let convs;

    if (isBuyerRole(req.user.role)) {
        convs = db.conversations
            .filter(c => c.user_id === req.user.id)
            .map(c => {
                const dev = db.users.find(u => u.id === c.developer_id);
                const unread = db.messages.filter(m =>
                    m.conversation_id === c.id && m.sender_id !== req.user.id && !m.is_read
                ).length;
                return {
                    ...c,
                    target_name: dev?.display_name || '',
                    target_username: dev?.username || '',
                    target_avatar: dev?.avatar || '',
                    unread
                };
            });
    } else {
        convs = db.conversations
            .filter(c => c.developer_id === req.user.id)
            .map(c => {
                const user = db.users.find(u => u.id === c.user_id);
                const unread = db.messages.filter(m =>
                    m.conversation_id === c.id && m.sender_id !== req.user.id && !m.is_read
                ).length;
                return {
                    ...c,
                    target_name: user?.display_name || '',
                    target_username: user?.username || '',
                    target_avatar: user?.avatar || '',
                    unread
                };
            });
    }

    convs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(convs);
});

// 获取对话消息
app.get('/api/conversations/:id/messages', authMiddleware, (req, res) => {
    db = loadDB();
    const convId = parseInt(req.params.id);
    const conv = db.conversations.find(c => c.id === convId);
    if (!conv) return res.status(404).json({ error: '对话不存在' });

    // 验证权限
    if (conv.user_id !== req.user.id && conv.developer_id !== req.user.id) {
        return res.status(403).json({ error: '无权访问' });
    }

    // 标记已读
    let changed = false;
    db.messages.forEach(m => {
        if (m.conversation_id === convId && m.sender_id !== req.user.id && !m.is_read) {
            m.is_read = true;
            changed = true;
        }
    });
    if (changed) saveDB(db);

    const messages = db.messages
        .filter(m => m.conversation_id === convId)
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
app.post('/api/conversations/:id/messages', authMiddleware, upload.single('file'), (req, res) => {
    db = loadDB();
    const convId = parseInt(req.params.id);
    const conv = db.conversations.find(c => c.id === convId);
    if (!conv) return res.status(404).json({ error: '对话不存在' });

    if (conv.user_id !== req.user.id && conv.developer_id !== req.user.id) {
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

    const id = db.nextId.message++;
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
    saveDB(db);

    const sender = db.users.find(u => u.id === req.user.id);
    res.json({
        ...msg,
        sender_name: sender?.display_name || '',
        sender_role: sender?.role || ''
    });
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
app.post('/api/merchants/apply', authMiddleware, (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (!isArtisanRole(user.role)) {
        return res.status(403).json({ error: '只有非遗手艺人商家可申请入驻' });
    }

    const { shop_name, intro, heritage_category, contact_phone, qualification_note } = req.body;
    if (!shop_name || !intro || !heritage_category || !contact_phone) {
        return res.status(400).json({ error: '店铺名称、简介、非遗类别和联系方式不能为空' });
    }

    let merchant = db.merchants.find(m => m.user_id === req.user.id);
    const now = new Date().toISOString();

    if (!merchant) {
        merchant = {
            id: db.nextId.merchant ? db.nextId.merchant++ : 1,
            user_id: req.user.id,
            shop_name,
            intro,
            heritage_category,
            contact_phone,
            qualification_note: qualification_note || '',
            status: 'pending',
            created_at: now,
            updated_at: now,
            permissions: ['shop:view', 'product:manage', 'order:manage']
        };
        db.merchants.push(merchant);
    } else {
        merchant.shop_name = shop_name;
        merchant.intro = intro;
        merchant.heritage_category = heritage_category;
        merchant.contact_phone = contact_phone;
        merchant.qualification_note = qualification_note || merchant.qualification_note || '';
        merchant.updated_at = now;
    }

    saveDB(db);
    res.json(merchant);
});

app.get('/api/merchants/me', authMiddleware, (req, res) => {
    db = loadDB();
    const merchant = db.merchants.find(m => m.user_id === req.user.id);
    if (!merchant) return res.status(404).json({ error: '尚未申请入驻' });
    res.json({
        ...merchant,
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
app.post('/api/products', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), (req, res) => {
    db = loadDB();
    const merchant = db.merchants.find(m => m.user_id === req.user.id);
    if (!merchant) return res.status(404).json({ error: '请先完成商家入驻' });

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

    const product = {
        id: db.nextId.product ? db.nextId.product++ : 1,
        merchant_id: merchant.id,
        merchant_user_id: req.user.id,
        merchant_name: req.user.display_name,
        title,
        subtitle: subtitle || '',
        brief: brief || description,
        description,
        detail_description: detail_description || description,
        price: Number(price),
        stock: Number(stock),
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
        status: status || 'published',
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    db.products.push(product);
    saveDB(db);
    res.json(product);
});

app.get('/api/products', authMiddleware, (req, res) => {
    db = loadDB();
    const { q = '', category = '', tag = '', sort = 'newest', page = 1, limit = 20 } = req.query;

    let products = db.products.filter(p => !p.is_deleted && p.status !== 'deleted');

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
        .filter(p => !p.is_deleted && p.status !== 'deleted' && p.is_recommended)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    res.json(products);
});

app.get('/api/products/featured', authMiddleware, (req, res) => {
    db = loadDB();
    const limit = Math.min(10, Math.max(1, Number(req.query.limit || 4)));
    const products = db.products
        .filter(p => !p.is_deleted && p.status !== 'deleted' && (p.featured_section || p.is_recommended))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    res.json(products);
});

app.get('/api/products/categories', authMiddleware, (req, res) => {
    db = loadDB();
    const categories = [...new Set(db.products.filter(p => !p.is_deleted && p.status !== 'deleted').map(p => p.category).filter(Boolean))];
    res.json(categories);
});

app.get('/api/products/:id', authMiddleware, (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id) && !p.is_deleted);
    if (!product) return res.status(404).json({ error: '商品不存在' });
    res.json(product);
});

app.put('/api/products/:id', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), (req, res) => {
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
    if (status !== undefined) product.status = status;
    product.updated_at = new Date().toISOString();

    saveDB(db);
    res.json(product);
});

app.put('/api/products/:id/content', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), (req, res) => {
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

app.put('/api/products/:id/attributes', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), (req, res) => {
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

app.patch('/api/products/:id/status', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权操作该商品' });

    const { status } = req.body;
    if (!status) return res.status(400).json({ error: '请提供状态' });
    product.status = status;
    product.updated_at = new Date().toISOString();

    saveDB(db);
    res.json(product);
});

app.patch('/api/products/:id/stock', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), (req, res) => {
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

app.patch('/api/products/:id/price', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), (req, res) => {
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

app.post('/api/products/:id/publish', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权上下架该商品' });

    product.status = 'published';
    product.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(product);
});

app.post('/api/products/:id/unpublish', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), (req, res) => {
    db = loadDB();
    const product = db.products.find(p => p.id === Number(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    if (product.merchant_user_id !== req.user.id) return res.status(403).json({ error: '你无权上下架该商品' });

    product.status = 'draft';
    product.updated_at = new Date().toISOString();
    saveDB(db);
    res.json(product);
});

app.delete('/api/products/:id', authMiddleware, requireRole([ROLE_TYPES.ARTISAN]), (req, res) => {
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

    const product = db.products.find(p => p.id === Number(product_id) && !p.is_deleted && p.status !== 'deleted');
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

    const product = db.products.find(p => p.id === productId && !p.is_deleted && p.status !== 'deleted');
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

    const product = db.products.find(p => p.id === Number(product_id) && !p.is_deleted && p.status !== 'deleted');
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

app.get('/api/orders/preview', authMiddleware, (req, res) => {
    db = loadDB();
    const { product_id, quantity = 1, address_id, coupon_code } = req.query;

    if (!product_id) return res.status(400).json({ error: '请选择商品' });

    const product = db.products.find(p => p.id === Number(product_id) && !p.is_deleted && p.status !== 'deleted');
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
        .filter(conv => isAdmin || conv.developer_id === req.user.id)
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

    user.password = await bcrypt.hash(new_password, 10);
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

app.get('/api/products/:id/reviews', authMiddleware, (req, res) => {
    db = loadDB();
    db.reviews = db.reviews || [];
    const { sort = 'time', rating, has_images, page = 1, pageSize = 10 } = req.query;
    let reviews = db.reviews.filter(item => item.product_id === Number(req.params.id) && item.status !== 'hidden');

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

    res.json({
        reviews: paged,
        stats: buildReviewStats(reviews),
        pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            total: reviews.length
        }
    });
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

// ============ 静态文件服务（上传目录） ============
app.use('/uploads', express.static(uploadsDir));

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
        createReview
    }
};

if (require.main === module) {
    app.listen(PORT, () => {
        console.log('========================================');
        console.log('  华夏风物 · 非遗传承 后端服务');
        console.log('========================================');
        console.log(`  ✅ 服务器运行在: http://localhost:${PORT}`);
        console.log(`  🏠 主页:        http://localhost:${PORT}/MainPage.html`);
        console.log(`  🔐 登录注册:    http://localhost:${PORT}/login.html`);
        console.log(`  👤 用户中心:    http://localhost:${PORT}/user-dashboard.html`);
        console.log(`  👨‍💻 开发者中心:  http://localhost:${PORT}/developer-dashboard.html`);
        console.log('========================================');
    });
}
