const Joi = null;

const RULE_TYPES = {
    REQUIRED: 'required',
    STRING: 'string',
    STRING_MIN: 'string:min',
    STRING_MAX: 'string:max',
    STRING_ENUM: 'string:enum',
    NUMBER: 'number',
    NUMBER_MIN: 'number:min',
    NUMBER_MAX: 'number:max',
    POSITIVE: 'positive',
    INTEGER: 'integer',
    EMAIL: 'email',
    PHONE: 'phone',
    BOOLEAN: 'boolean',
    ARRAY: 'array',
    ARRAY_MIN: 'array:min',
    OBJECT: 'object',
    DATE: 'date',
    ISO_DATE: 'iso_date',
    URL: 'url',
    UUID: 'uuid',
    ID: 'id',
    PAGE: 'page',
    PAGE_SIZE: 'page_size'
};

const COMMON_RULES = {
    username: { type: 'string', min: 2, max: 32, label: '用户名' },
    password: { type: 'string', min: 6, max: 64, label: '密码' },
    display_name: { type: 'string', min: 2, max: 32, label: '昵称' },
    phone: { type: 'string', pattern: /^1[3-9]\d{9}$/, label: '手机号' },
    email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, label: '邮箱' },
    id: { type: 'number', min: 1, integer: true, label: 'ID' },
    page: { type: 'number', min: 1, integer: true, label: '页码' },
    page_size: { type: 'number', min: 1, max: 100, integer: true, label: '每页数量' },
    limit: { type: 'number', min: 1, max: 100, integer: true, label: '每页数量' },
    price: { type: 'number', min: 0, label: '价格' },
    stock: { type: 'number', min: 0, integer: true, label: '库存' },
    quantity: { type: 'number', min: 1, integer: true, label: '数量' },
    status: { type: 'string', label: '状态' },
    title: { type: 'string', min: 1, max: 200, label: '标题' },
    content: { type: 'string', min: 1, max: 5000, label: '内容' },
    cover_image: { type: 'string', max: 500, label: '封面图' },
    product_id: { type: 'number', min: 1, integer: true, label: '商品ID' },
    order_id: { type: 'number', min: 1, integer: true, label: '订单ID' },
    user_id: { type: 'number', min: 1, integer: true, label: '用户ID' },
    merchant_user_id: { type: 'number', min: 1, integer: true, label: '商家ID' }
};

function validateField(value, rules, fieldName) {
    if (!rules) return null;

    if (rules.required && (value === undefined || value === null || value === '')) {
        return `${rules.label || fieldName}不能为空`;
    }

    if (value === undefined || value === null || value === '') {
        return null;
    }

    switch (rules.type) {
        case 'string': {
            if (typeof value !== 'string') {
                return `${rules.label || fieldName}必须为字符串`;
            }
            if (rules.min != null && value.length < rules.min) {
                return `${rules.label || fieldName}至少${rules.min}个字符`;
            }
            if (rules.max != null && value.length > rules.max) {
                return `${rules.label || fieldName}不超过${rules.max}个字符`;
            }
            if (rules.pattern && !rules.pattern.test(value)) {
                return `${rules.label || fieldName}格式不正确`;
            }
            if (rules.enum && !rules.enum.includes(value)) {
                return `${rules.label || fieldName}必须为: ${rules.enum.join(', ')}`;
            }
            break;
        }
        case 'number': {
            const n = Number(value);
            if (!Number.isFinite(n)) {
                return `${rules.label || fieldName}必须为数字`;
            }
            if (rules.integer && !Number.isInteger(n)) {
                return `${rules.label || fieldName}必须为整数`;
            }
            if (rules.min != null && n < rules.min) {
                return `${rules.label || fieldName}不能小于${rules.min}`;
            }
            if (rules.max != null && n > rules.max) {
                return `${rules.label || fieldName}不能大于${rules.max}`;
            }
            break;
        }
        case 'boolean': {
            if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
                return `${rules.label || fieldName}必须为布尔值`;
            }
            break;
        }
        case 'array': {
            if (!Array.isArray(value)) {
                return `${rules.label || fieldName}必须为数组`;
            }
            if (rules.min != null && value.length < rules.min) {
                return `${rules.label || fieldName}至少包含${rules.min}项`;
            }
            break;
        }
        case 'object': {
            if (typeof value !== 'object' || Array.isArray(value)) {
                return `${rules.label || fieldName}必须为对象`;
            }
            break;
        }
        case 'email': {
            if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return `${rules.label || fieldName}格式不正确`;
            }
            break;
        }
        case 'phone': {
            if (typeof value !== 'string' || !/^1[3-9]\d{9}$/.test(value)) {
                return `${rules.label || fieldName}格式不正确`;
            }
            break;
        }
        case 'url': {
            if (typeof value !== 'string' || !/^https?:\/\/.+/.test(value)) {
                return `${rules.label || fieldName}必须为合法URL`;
            }
            break;
        }
        case 'positive': {
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) {
                return `${rules.label || fieldName}必须为正数`;
            }
            break;
        }
        case 'id': {
            const n = Number(value);
            if (!Number.isInteger(n) || n < 1) {
                return `${rules.label || fieldName}必须为正整数`;
            }
            break;
        }
        case 'page': {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 1) {
                return `${rules.label || fieldName}必须大于等于1`;
            }
            break;
        }
        case 'page_size': {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 1 || n > 100) {
                return `${rules.label || fieldName}必须在1-100之间`;
            }
            break;
        }
        case 'date': {
            const d = new Date(value);
            if (isNaN(d.getTime())) {
                return `${rules.label || fieldName}必须为合法日期`;
            }
            break;
        }
        case 'iso_date': {
            const d = new Date(value);
            if (isNaN(d.getTime()) || !value.includes('T')) {
                return `${rules.label || fieldName}必须为ISO日期格式`;
            }
            break;
        }
        default:
            break;
    }

    return null;
}

function validateSchema(body, schema) {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
        const value = body ? body[field] : undefined;
        const err = validateField(value, rules, field);
        if (err) errors.push(err);
    }

    return errors;
}

function validateBody(schema, options = {}) {
    return (req, res, next) => {
        const body = req.body || {};
        const errors = validateSchema(body, schema);

        if (errors.length > 0) {
            return res.status(400).json({
                error: '参数校验失败',
                details: errors
            });
        }

        if (options.stripUnknown) {
            const allowedKeys = Object.keys(schema);
            for (const key of Object.keys(body)) {
                if (!allowedKeys.includes(key)) {
                    delete body[key];
                }
            }
        }

        next();
    };
}

function validateQuery(schema) {
    return (req, res, next) => {
        const query = req.query || {};
        const errors = validateSchema(query, schema);

        if (errors.length > 0) {
            return res.status(400).json({
                error: '查询参数校验失败',
                details: errors
            });
        }

        next();
    };
}

function validateParams(schema) {
    return (req, res, next) => {
        const params = req.params || {};
        const errors = validateSchema(params, schema);

        if (errors.length > 0) {
            return res.status(400).json({
                error: '路径参数校验失败',
                details: errors
            });
        }

        next();
    };
}

function sanitizeInput(value) {
    if (typeof value !== 'string') return value;
    return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '')
        .trim();
}

function sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;
    const result = {};
    for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') {
            result[key] = sanitizeInput(value);
        } else if (typeof value === 'object' && value !== null) {
            result[key] = Array.isArray(value)
                ? value.map(item => typeof item === 'string' ? sanitizeInput(item) : sanitizeBody(item))
                : sanitizeBody(value);
        } else {
            result[key] = value;
        }
    }
    return result;
}

const VALIDATOR_PRESET_SCHEMAS = {
    register: {
        username: { ...COMMON_RULES.username, required: true },
        password: { ...COMMON_RULES.password, required: true },
        role: { type: 'string', required: true, enum: ['buyer', 'user', 'artisan', 'developer', 'admin'], label: '角色' },
        display_name: { ...COMMON_RULES.display_name, required: true },
        phone: { ...COMMON_RULES.phone }
    },
    login: {
        username: { ...COMMON_RULES.username, required: true },
        password: { type: 'string', required: true, min: 1, max: 128, label: '密码' }
    },
    createProduct: {
        title: { ...COMMON_RULES.title, required: true },
        brief: { type: 'string', max: 500, label: '简介' },
        description: { type: 'string', max: 10000, label: '详情' },
        price: { ...COMMON_RULES.price, required: true },
        stock: { ...COMMON_RULES.stock, required: true },
        category: { type: 'string', required: true, max: 64, label: '分类' },
        cover_image: { ...COMMON_RULES.cover_image },
        heritage_category: { type: 'string', max: 64, label: '非遗分类' }
    },
    updateProduct: {
        title: { ...COMMON_RULES.title },
        brief: { type: 'string', max: 500 },
        description: { type: 'string', max: 10000 },
        price: { ...COMMON_RULES.price },
        stock: { ...COMMON_RULES.stock },
        category: { type: 'string', max: 64 }
    },
    createOrder: {
        address_id: { ...COMMON_RULES.id, required: true },
        items: { type: 'array', required: true, min: 1, label: '商品列表' },
        coupon_code: { type: 'string', max: 64 }
    },
    directOrder: {
        product_id: { ...COMMON_RULES.product_id, required: true },
        quantity: { ...COMMON_RULES.quantity, required: true },
        address_id: { ...COMMON_RULES.id },
        coupon_code: { type: 'string', max: 64 }
    },
    searchQuery: {
        q: { type: 'string', max: 100, label: '搜索关键词' },
        category: { type: 'string', max: 64 },
        tag: { type: 'string', max: 64 },
        page: COMMON_RULES.page,
        limit: COMMON_RULES.limit,
        sort: { type: 'string', enum: ['newest', 'price_asc', 'price_desc', 'sales', 'hot'], label: '排序方式' }
    },
    merchantApply: {
        shop_name: { type: 'string', required: true, min: 2, max: 64, label: '店铺名称' },
        intro: { type: 'string', required: true, min: 10, max: 500, label: '店铺简介' },
        heritage_category: { type: 'string', required: true, max: 64, label: '非遗类别' },
        contact_phone: { ...COMMON_RULES.phone, required: true }
    },
    addCartItem: {
        product_id: { ...COMMON_RULES.product_id, required: true },
        quantity: { ...COMMON_RULES.quantity, required: true }
    },
    createAddress: {
        receiver_name: { type: 'string', required: true, min: 2, max: 32, label: '收货人姓名' },
        receiver_phone: { ...COMMON_RULES.phone, required: true },
        province: { type: 'string', required: true, max: 32, label: '省份' },
        city: { type: 'string', required: true, max: 32, label: '城市' },
        district: { type: 'string', required: true, max: 32, label: '区县' },
        detail: { type: 'string', required: true, min: 5, max: 200, label: '详细地址' }
    },
    createReview: {
        product_id: { ...COMMON_RULES.product_id, required: true },
        order_id: { ...COMMON_RULES.order_id, required: true },
        rating: { type: 'number', required: true, min: 1, max: 5, label: '评分' },
        content: { type: 'string', required: true, min: 5, max: 1000, label: '评价内容' }
    },
    applyAfterSales: {
        type: { type: 'string', required: true, enum: ['refund', 'return', 'exchange'], label: '售后类型' },
        reason: { type: 'string', required: true, min: 5, max: 500, label: '售后原因' },
        refund_amount: { ...COMMON_RULES.price }
    },
    createAfterSales: {
        order_id: { ...COMMON_RULES.order_id, required: true },
        type: { type: 'string', required: true, enum: ['refund', 'return', 'exchange'] },
        reason: { type: 'string', required: true, min: 5, max: 500 }
    },
    updateProfile: {
        display_name: { ...COMMON_RULES.display_name },
        avatar: { type: 'string', max: 500 },
        bio: { type: 'string', max: 500 },
        phone: { ...COMMON_RULES.phone }
    },
    updateMerchant: {
        shop_name: { type: 'string', min: 2, max: 64 },
        intro: { type: 'string', min: 10, max: 500 },
        heritage_category: { type: 'string', max: 64 },
        contact_phone: { ...COMMON_RULES.phone }
    },
    changePassword: {
        old_password: { type: 'string', required: true, min: 1, max: 128, label: '原密码' },
        new_password: { type: 'string', required: true, min: 6, max: 64, label: '新密码' }
    },
    payOrder: {
        payment_method: { type: 'string', required: true, enum: ['wechat', 'alipay', 'bank_transfer', 'balance'], label: '支付方式' },
        payment_password: { type: 'string', max: 128 }
    },
    cancelOrder: {
        reason: { type: 'string', max: 500, label: '取消原因' }
    },
    shipOrder: {
        logistics_company: { type: 'string', required: true, max: 64, label: '物流公司' },
        tracking_number: { type: 'string', required: true, max: 64, label: '运单号' }
    },
    importThirdParty: {
        url: { type: 'string', required: true, max: 1000, label: '商品URL' },
        source: { type: 'string', required: true, enum: ['jd', 'taobao', 'tmall'], label: '来源平台' },
        category: { type: 'string', max: 64 }
    }
};

module.exports = {
    RULE_TYPES,
    COMMON_RULES,
    validateField,
    validateSchema,
    validateBody,
    validateQuery,
    validateParams,
    sanitizeInput,
    sanitizeBody,
    VALIDATOR_PRESET_SCHEMAS
};