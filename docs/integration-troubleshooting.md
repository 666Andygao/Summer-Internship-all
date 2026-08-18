# 前后端联调高频问题完整清单

> 覆盖跨域、参数格式、分页、Token、并发、上传、爬虫、图片 8 大类问题，每条附带修复代码与配置方案。

---

## 问题 1：跨域异常（CORS）

**现象**：浏览器控制台报 `Access to XMLHttpRequest at ... has been blocked by CORS policy`

**根因**：前端开发服务器（如 Vite `localhost:5173`）与后端（`localhost:3000`）不同源

**修复方案**：

```javascript
// server.js 中已有 cors 引入，替换为以下增强配置
const cors = require('cors');

// 方案 A：开发环境宽松配置
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400
}));

// 方案 B：生产环境白名单
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://feiyi.example.com',
    'https://shop.feiyi.example.com'
];
app.use(cors({
    origin(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS 禁止的来源: ' + origin));
        }
    },
    credentials: true
}));

// 确保 OPTIONS 预检请求正常响应
app.options('*', cors());
```

**前端 Vite 配置**（`vite.config.js`）：

```javascript
export default {
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            '/shop': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    }
};
```

---

## 问题 2：请求参数格式不匹配

**现象**：前端发送 JSON 但后端收到 `undefined`，或字段名大小写不一致

**根因**：
- 未正确配置 `express.json()` 中间件
- 前端使用 `FormData` 但后端按 JSON 解析
- 字段命名风格不统一（camelCase vs snake_case）

**修复方案**：

```javascript
// server.js 确保 body 解析中间件正确挂载
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 统一字段命名风格转换（snake_case ↔ camelCase）
function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
}
function toCamelCase(str) {
    return str.replace(/_([a-z])/g, (_, m) => m.toUpperCase());
}
function convertKeys(obj, converter) {
    if (Array.isArray(obj)) return obj.map(item => convertKeys(item, converter));
    if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            result[converter(k)] = convertKeys(v, converter);
        }
        return result;
    }
    return obj;
}

// 在路由入口处统一转换
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        // 前端用 camelCase，后端内部统一用 snake_case
        req.body = convertKeys(req.body, toSnakeCase);
    }
    next();
});
```

**前端请求封装**：

```javascript
// src/api/request.js
import axios from 'axios';

const request = axios.create({
    baseURL: '/api',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' }
});

request.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

request.interceptors.response.use(
    response => response.data,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error);
    }
);

export default request;
```

---

## 问题 3：分页参数传递错误

**现象**：前端传 `pageSize` 但后端读取 `limit`，或 `page` 从 0 开始而不是 1

**修复方案**：

**后端统一分页参数映射**（在 `server.js` 的路由中已广泛使用 `page` / `limit`）：

```javascript
// 通用分页参数解析工具（已在 stat-page.util.js 实现）
const StatPageUtil = require('./src/utils/stat-page.util');

// 在列表查询接口中统一使用
app.get('/api/products', authMiddleware, (req, res) => {
    const page = StatPageUtil.normalizePage(req.query.page);     // 支持 page=0 自动修正为 1
    const limit = StatPageUtil.normalizeSize(req.query.page_size || req.query.limit);
    const offset = StatPageUtil.toOffset(page, limit);
    // ... 查询逻辑
    res.json(StatPageUtil.build(items, total, page, limit));
});
```

**前端适配**：

```javascript
// 前端分页参数统一
const params = {
    page: currentPage,       // 从 1 开始
    page_size: pageSize      // 使用 page_size 而非 pageSize
};
const { data } = await request.get('/products', { params });
// 统一响应结构: { items, total, page, page_size, total_pages }
```

---

## 问题 4：Token 过期失效

**现象**：用户操作中途突然跳到登录页，接口返回 401

**根因**：JWT 过期时间过短（默认 2 小时），用户长时间操作后失效

**修复方案**：

```javascript
// 方案 A：延长 Token 有效期 + 刷新机制
const JWT_SECRET = process.env.JWT_SECRET || 'dev-placeholder-jwt';
const ACCESS_TOKEN_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

// 登录时签发双 Token
app.post('/api/login', async (req, res) => {
    // ... 验证通过后
    const accessToken = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
    const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
    res.json({ access_token: accessToken, refresh_token: refreshToken, user });
});

// 刷新 Token 接口
app.post('/api/refresh-token', (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(401).json({ error: '缺少刷新令牌' });
    try {
        const decoded = jwt.verify(refresh_token, JWT_SECRET);
        if (decoded.type !== 'refresh') return res.status(401).json({ error: '无效的刷新令牌' });
        const newAccessToken = jwt.sign(
            { id: decoded.id, role: decoded.role },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
        );
        res.json({ access_token: newAccessToken });
    } catch {
        res.status(401).json({ error: '刷新令牌已过期，请重新登录' });
    }
});

// 前端自动刷新拦截器
request.interceptors.response.use(
    response => response.data,
    async error => {
        if (error.response?.status === 401 && !error.config._retrying) {
            error.config._retrying = true;
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                const { access_token } = await request.post('/refresh-token', { refresh_token: refreshToken });
                localStorage.setItem('token', access_token);
                error.config.headers.Authorization = `Bearer ${access_token}`;
                return request(error.config);
            } catch {
                localStorage.clear();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error.response?.data || error);
    }
);
```

---

## 问题 5：库存并发冲突

**现象**：多个用户同时下单同一商品，导致超卖（库存变负数）

**修复方案**：

```javascript
// 方案 A：乐观锁版本号
// 数据库表增加 version 字段
ALTER TABLE products ADD COLUMN version INT DEFAULT 0;

// 扣减库存时检查版本号
function deductStock(db, productId, quantity) {
    const product = db.products.find(p => p.id === productId);
    if (!product) throw new Error('商品不存在');
    const currentStock = product.stock || 0;
    if (currentStock < quantity) throw new StockConflictError('库存不足');
    
    // 检查版本
    const result = db.products.updateOne(
        { id: productId, version: product.version },
        {
            $inc: { stock: -quantity, version: 1 },
            $set: { updated_at: new Date().toISOString() }
        }
    );
    
    if (result.matchedCount === 0) {
        throw new StockConflictError('库存已被其他请求修改，请重试');
    }
    return true;
}

// 方案 B：JSON 文件存储场景的并发保护
const lockFile = require('proper-lockfile');

async function withDBLock(operation) {
    const lockPath = DB_PATH + '.lock';
    const release = await lockFile.lock(lockPath, {
        stale: 10000,
        update: 500,
        retries: 3
    });
    try {
        const result = operation();
        return result;
    } finally {
        await release();
    }
}

// 方案 C：应用层库存预扣减
const pendingOrders = new Map(); // userId -> { productId: quantity }

function reserveStock(userId, productId, quantity) {
    const reserved = pendingOrders.get(userId) || {};
    reserved[productId] = (reserved[productId] || 0) + quantity;
    pendingOrders.set(userId, reserved);
}

function commitReservation(userId) {
    pendingOrders.delete(userId);
}

function rollbackReservation(userId, productId, quantity) {
    const reserved = pendingOrders.get(userId);
    if (reserved && reserved[productId]) {
        reserved[productId] -= quantity;
        if (reserved[productId] <= 0) delete reserved[productId];
        if (Object.keys(reserved).length === 0) pendingOrders.delete(userId);
    }
}
```

---

## 问题 6：文件上传大小/格式报错

**现象**：上传图片报 `File too large` 或 `Unexpected file field`

**修复方案**：

```javascript
// server.js 中 multer 配置增强
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm'
];

const ALLOWED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.mp4', '.webm'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 5
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return cb(new Error(`不支持的文件格式: ${ext}，允许: ${ALLOWED_EXTENSIONS.join(', ')}`));
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error(`不支持的 MIME 类型: ${file.mimetype}`));
        }
        cb(null, true);
    }
});

// 错误处理中间件（捕获 multer 错误）
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '文件大小超过10MB限制' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: '文件字段名错误' });
    }
    if (err.message && err.message.startsWith('不支持的')) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

// express.json 大小限制同步
app.use(express.json({ limit: '10mb' }));
```

**前端上传组件**：

```javascript
// 前端上传前校验
function validateFile(file) {
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    
    if (file.size > maxSize) {
        alert(`文件过大，最大允许 10MB，当前 ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return false;
    }
    if (!allowedTypes.includes(file.type)) {
        alert(`不支持的文件类型: ${file.type}`);
        return false;
    }
    return true;
}
```

---

## 问题 7：第三方链接抓取反爬拦截

**现象**：京东/淘宝商品导入接口返回 `403 Forbidden`、`滑块验证` 或 `请登录查看`

**根因**：直接请求商品详情页被反爬机制拦截

**修复方案**：

```javascript
// src/services/third-party-import.service.js 反爬策略
const https = require('https');
const http = require('http');

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

const PROXY_POOL = [
    // 代理池配置（实际部署时使用付费代理服务）
    { host: 'proxy1.example.com', port: 8080 },
    { host: 'proxy2.example.com', port: 8080 }
];

async function fetchProductPage(url, source) {
    const headers = {
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        ...getPlatformHeaders(source)
    };

    // 方案 A：模拟浏览器请求
    const response = await fetchWithRetry(url, {
        headers,
        timeout: 15000,
        retries: 2,
        retryDelay: 2000
    });

    if (response.status === 403) {
        throw new Error('目标站点反爬拦截，请稍后重试或使用代理IP');
    }
    if (response.status === 302) {
        throw new Error('目标站点需要登录才能查看该商品');
    }

    return response.body;
}

// 京东特有请求头
function getPlatformHeaders(source) {
    switch (source) {
        case 'jd':
            return {
                'Referer': 'https://item.jd.com/',
                'Cookie': 'shshshfpa=...' // 预置有效 Cookie
            };
        case 'taobao':
            return {
                'Referer': 'https://item.taobao.com/',
                'Cookie': 'cookie2=...'
            };
        case 'tmall':
            return {
                'Referer': 'https://detail.tmall.com/',
                'Cookie': 'cookie2=...'
            };
        default:
            return {};
    }
}

// 方案 B：使用第三方商品解析 API（推荐生产方案）
async function fetchViaParsingAPI(url, source) {
    const apiUrl = `https://api.parse-product.com/v1/parse?url=${encodeURIComponent(url)}&source=${source}`;
    const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${process.env.PARSE_API_KEY}` }
    });
    if (!response.ok) throw new Error('商品解析服务不可用');
    return response.json();
}

// 方案 C：限制抓取频率 + 本地缓存
const crawlCache = new Map();
const CRAWL_COOLDOWN = 5000; // 5秒冷却
let lastCrawlTime = 0;

async function throttledCrawl(url, source) {
    const now = Date.now();
    if (now - lastCrawlTime < CRAWL_COOLDOWN) {
        await new Promise(r => setTimeout(r, CRAWL_COOLDOWN - (now - lastCrawlTime)));
    }
    lastCrawlTime = Date.now();

    const cacheKey = url + '_' + source;
    if (crawlCache.has(cacheKey)) {
        const cached = crawlCache.get(cacheKey);
        if (Date.now() - cached.time < 30 * 60 * 1000) {
            return cached.data;
        }
    }

    const data = await fetchViaParsingAPI(url, source);
    crawlCache.set(cacheKey, { data, time: Date.now() });
    return data;
}
```

---

## 问题 8：图片跨域加载

**现象**：前端 `<img src="https://img.jd.com/xxx.jpg">` 在部分浏览器加载失败，或 canvas 绘制时 `tainted canvas` 错误

**根因**：第三方图片未设置 CORS 头，或浏览器安全策略阻止跨域图片操作

**修复方案**：

```javascript
// 方案 A：后端图片代理转发
app.get('/api/proxy-image', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: '缺少图片URL' });

    // 安全校验：只允许白名单域名
    const ALLOWED_HOSTS = ['img.jd.com', 'img.alicdn.com', 'img.taobao.com', 'gw.alicdn.com'];
    try {
        const parsed = new URL(url);
        if (!ALLOWED_HOSTS.some(host => parsed.hostname.includes(host))) {
            return res.status(403).json({ error: '不允许代理该域名的图片' });
        }
    } catch {
        return res.status(400).json({ error: 'URL格式错误' });
    }

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)' },
            timeout: 10000
        });
        if (!response.ok) return res.status(502).json({ error: '图片获取失败' });

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        response.body.pipe(res);
    } catch (e) {
        res.status(502).json({ error: '图片代理失败: ' + e.message });
    }
});

// 方案 B：商品导入时下载图片到本地存储
const PRODUCT_IMAGE_DIR = path.join(__dirname, 'uploads', 'products');

async function downloadProductImage(url, productId) {
    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const filename = `product-${productId}-${Date.now()}${ext}`;
    const filepath = path.join(PRODUCT_IMAGE_DIR, filename);

    const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENTS[0] }
    });

    if (!response.ok) throw new Error('图片下载失败');

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    return `/uploads/products/${filename}`;
}

// 商品导入流程中自动下载图片
async function importProductFromThirdParty(url, source) {
    const productData = await throttledCrawl(url, source);
    const localImagePath = await downloadProductImage(productData.cover_image, productData.id);
    productData.cover_image = localImagePath;
    // 保存到数据库...
    return productData;
}

// 方案 C：前端使用 crossorigin 属性
// <img :src="product.cover_image" crossorigin="anonymous" />
// 注意：此方案需要图片服务器配合设置 Access-Control-Allow-Origin
```

---

## 通用联调检查清单

| 序号 | 检查项 | 说明 |
|------|--------|------|
| 1 | 接口路径一致性 | 前端 baseURL + 路径 === 后端注册路径 |
| 2 | HTTP 方法一致性 | GET/POST/PUT/DELETE 对应 |
| 3 | 请求体格式 | JSON / FormData / x-www-form-urlencoded |
| 4 | 响应结构 | 统一 `{ error?, data?, items?, pagination? }` |
| 5 | 错误码规范 | 200/400/401/403/404/500 含义统一 |
| 6 | 时间格式 | ISO 8601 (YYYY-MM-DDTHH:mm:ssZ) |
| 7 | ID 类型 | Number 还是 String，前后端统一 |
| 8 | 分页方向 | page 从 1 开始，limit 默认 20 |
| 9 | 认证方式 | Authorization: Bearer \<token\> |
| 10 | 编码 | UTF-8，避免中文乱码 |
| 11 | 空值处理 | null / undefined / '' 约定 |
| 12 | 布尔值 | true/false 而非 0/1/'true'/'false' |
| 13 | 数组字段 | tags: string[] 而非 tags: string |
| 14 | 文件上传 | enctype: multipart/form-data |
| 15 | 跨域配置 | CORS headers 正确设置 |