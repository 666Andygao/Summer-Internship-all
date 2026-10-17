/**
 * MySQL 兼容数据层（Store）
 *
 * 设计目标：
 *   让现有 server.js 的 loadDB() / saveDB() 接口保持不变，底层换成 MySQL，
 *   从而以最小改动把数据真正持久化到数据库，避免重写 200+ 处业务代码。
 *
 * 工作方式：
 *   1) 启动时 init()：从 MySQL 各表全量载入内存，形成与原 JSON 完全一致的结构
 *   2) loadDB()      ：同步返回内存数据（与原来的同步语义一致）
 *   3) saveDB(db)    ：与快照对比，只把「发生变化的表」同步回 MySQL（串行队列，保证顺序）
 *   4) flush()       ：等待队列中所有写入完成（优雅关闭时调用，防止丢数据）
 *
 * 局限（已知并接受）：
 *   - 单进程部署：内存为唯一写入口，多实例部署会出现缓存不一致
 *   - 数据量建议在万级以内（每次启动全量载入）
 */
<<<<<<< HEAD
const fs = require('fs');
const path = require('path');
const { getPool, toDbDate, fromDbDate, toJson, fromJson } = require('./pool');

const JSON_FILE = path.join(__dirname, '..', 'database.json');
let mode = 'mysql';

=======
const { getPool, toDbDate, fromDbDate, toJson, fromJson } = require('./pool');

>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
// ---------- 表结构映射：内存字段 ↔ MySQL 列 ----------
// json: 需要序列化为 JSON 的字段；dates: 需要做时间转换的字段
const TABLES = {
    users: {
<<<<<<< HEAD
        columns: ['id', 'username', 'password', 'role', 'registration_role', 'display_name', 'phone', 'avatar', 'addresses', 'created_at'],
=======
        columns: ['id', 'username', 'password', 'role', 'display_name', 'phone', 'avatar', 'addresses', 'created_at'],
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
        json: ['addresses'],
        dates: ['created_at']
    },
    merchants: {
        columns: ['id', 'user_id', 'shop_name', 'intro', 'heritage_category', 'contact_phone',
<<<<<<< HEAD
            'qualification_note', 'status', 'approved_by', 'permissions', 'created_at', 'updated_at'],
=======
            'qualification_note', 'status', 'permissions', 'created_at', 'updated_at'],
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
        json: ['permissions'],
        dates: ['created_at', 'updated_at']
    },
    products: {
        columns: ['id', 'merchant_id', 'merchant_user_id', 'merchant_name', 'title', 'subtitle', 'brief',
            'description', 'detail_description', 'price', 'stock', 'category', 'tags', 'specifications',
            'cover_image', 'main_images', 'detail_images', 'video_url', 'model_url', 'story',
            'artisan_intro', 'heritage_background', 'is_recommended', 'recommend_reason',
            'featured_section', 'sales_count', 'status', 'is_deleted', 'created_at', 'updated_at'],
        json: ['tags', 'specifications', 'main_images', 'detail_images'],
        dates: ['created_at', 'updated_at'],
        bool: ['is_recommended', 'is_deleted']
    },
    addresses: {
        columns: ['id', 'user_id', 'recipient_name', 'phone', 'province', 'city', 'district', 'detail', 'is_default', 'created_at'],
        json: [],
        dates: ['created_at'],
        bool: ['is_default']
    },
    favorites: {
        columns: ['id', 'user_id', 'product_id', 'created_at'],
        json: [],
        dates: ['created_at']
    },
    carts: {
        columns: ['id', 'user_id', 'guest_id', 'product_id', 'title', 'price', 'quantity', 'cover_image',
            'merchant_id', 'merchant_name', 'selected', 'created_at', 'updated_at'],
        json: [],
        dates: ['created_at', 'updated_at'],
        bool: ['selected']
    },
    orders: {
        columns: ['id', 'order_no', 'user_id', 'buyer_id', 'buyer_name', 'address_id', 'shipping_address',
            'remarks', 'coupon_code', 'coupon_desc', 'subtotal', 'shipping_fee', 'discount_amount',
            'total_amount', 'status', 'items', 'payment', 'payment_logs', 'payment_credentials',
            'created_at', 'updated_at'],
        json: ['shipping_address', 'items', 'payment', 'payment_logs', 'payment_credentials'],
        dates: ['created_at', 'updated_at']
    },
    after_sales: {
        columns: ['id', 'order_id', 'order_no', 'user_id', 'type', 'reason', 'amount', 'description',
            'logistics', 'status', 'reviewed_by', 'review_remark', 'created_at', 'updated_at'],
        json: ['logistics'],
        dates: ['created_at', 'updated_at']
    },
    reviews: {
        columns: ['id', 'order_id', 'order_no', 'product_id', 'user_id', 'user_name', 'rating', 'content',
            'experience', 'files', 'parent_review_id', 'status', 'reply', 'reply_at',
            'is_hidden', 'is_blocked', 'created_at', 'updated_at'],
        json: ['files', 'reply'],
        dates: ['reply_at', 'created_at', 'updated_at'],
        bool: ['is_hidden', 'is_blocked']
    },
    complaints: {
        columns: ['id', 'order_id', 'order_no', 'user_id', 'type', 'reason', 'description',
            'evidence', 'status', 'remark', 'created_at', 'updated_at'],
        json: ['evidence'],
        dates: ['created_at', 'updated_at']
    },
    conversations: {
<<<<<<< HEAD
        columns: ['id', 'user_id', 'developer_id', 'product_id', 'product_name', 'created_at'],
=======
        columns: ['id', 'user_id', 'developer_id', 'created_at'],
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
        json: [],
        dates: ['created_at']
    },
    messages: {
        columns: ['id', 'conversation_id', 'sender_id', 'content', 'file_path', 'file_type',
            'file_name', 'is_read', 'created_at'],
        json: [],
        dates: ['created_at'],
        bool: ['is_read']
    },
    friends: {
        columns: ['id', 'from_user_id', 'to_user_id', 'status', 'created_at'],
        json: [],
        dates: ['created_at']
    }
};

// nextId 需要维护自增键的表（与 TABLES 的键一一对应，外加 order_items/cart 等）
const NEXT_ID_KEYS = {
    users: 'user', conversations: 'conversation', messages: 'message', addresses: 'address',
    favorites: 'favorite', reviews: 'review', orders: 'order', merchants: 'merchant',
    products: 'product', carts: 'cart', complaints: 'complaint', friends: 'friend', after_sales: 'after_sale'
};

// ---------- 内部状态 ----------
let cache = null;          // 内存数据（结构与原 database.json 一致）
let snapshot = null;       // 上次成功同步后的快照，用于差异比对
let writeQueue = Promise.resolve();   // 串行写入队列
let lastError = null;

// ---------- 工具 ----------

/** 深拷贝（数据均为 JSON 安全类型，直接用 JSON 往返） */
const clone = (v) => JSON.parse(JSON.stringify(v));

/** 把内存值转换为 MySQL 列值 */
function toColumn(field, value, meta) {
    if (meta.dates.includes(field)) return toDbDate(value);
    if (meta.json.includes(field)) return toJson(value);
    if ((meta.bool || []).includes(field)) return value ? 1 : 0;
    if (value === undefined) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value;
}

/** 把 MySQL 行转换为内存对象 */
function fromRow(row, meta) {
    const out = {};
    for (const col of meta.columns) {
        let v = row[col];
        if (meta.dates.includes(col)) v = fromDbDate(v);
        else if (meta.json.includes(col)) v = fromJson(v, col === 'permissions' || col === 'tags' ||
            col === 'files' || col === 'evidence' || col === 'items' || col === 'main_images' ||
            col === 'detail_images' || col === 'specifications' ? [] : null);
        else if ((meta.bool || []).includes(col)) v = Boolean(v);
        out[col] = v === undefined ? null : v;
    }
    // 内存中保留数据库不存储的派生字段（如 orders.items 之外的字段由业务代码自行维护）
    return out;
}

// ---------- 载入 ----------

/**
 * 从 MySQL 载入全部数据到内存
 * @returns {Promise<Object>} 与 database.json 同构的数据对象
 */
async function loadAllFromMySQL() {
    const pool = getPool();
    const data = {};

    for (const [table, meta] of Object.entries(TABLES)) {
        const [rows] = await pool.query(
            `SELECT ${meta.columns.map(c => `\`${c}\``).join(', ')} FROM \`${table}\``
        );
        data[table] = rows.map(r => fromRow(r, meta));
    }

    // order_items 是 orders.items 的派生表，内存中不单独保留（由 orders.items 承载）
    data.order_items = [];

    // 保证所有数组字段存在
    for (const k of ['addresses', 'favorites', 'reviews', 'orders', 'carts', 'merchants',
        'products', 'after_sales', 'complaints', 'friends', 'messages', 'conversations', 'users']) {
        if (!Array.isArray(data[k])) data[k] = [];
    }

    // 依据实际数据重建 nextId，避免与已有 id 冲突
    const nextId = {};
    for (const [table, key] of Object.entries(NEXT_ID_KEYS)) {
        const list = data[table] || [];
        let maxId = 0;
        for (const row of list) {
            const idNum = Number(row.id);
            if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
        }
        nextId[key] = maxId + 1;
    }
    // 补充业务代码使用的固定键
    Object.assign(nextId, {
        user: nextId.user || 1, conversation: nextId.conversation || 1, message: nextId.message || 1,
        address: nextId.address || 1, favorite: nextId.favorite || 1, review: nextId.review || 1,
        order: nextId.order || 1, merchant: nextId.merchant || 1, product: nextId.product || 1,
        cart: nextId.cart || 1, complaint: nextId.complaint || 1, friend: nextId.friend || 1
    });
    data.nextId = nextId;

    return data;
}

<<<<<<< HEAD
function loadAllFromJSON() {
    if (!fs.existsSync(JSON_FILE)) {
        const empty = { users: [], conversations: [], messages: [], addresses: [],
            favorites: [], reviews: [], orders: [], carts: [], merchants: [],
            products: [], after_sales: [], complaints: [], friends: [],
            order_items: [], nextId: {
                user: 1, conversation: 1, message: 1, address: 1,
                favorite: 1, review: 1, order: 1, merchant: 1, product: 1,
                cart: 1, complaint: 1, friend: 1, after_sale: 1
            }};
        fs.writeFileSync(JSON_FILE, JSON.stringify(empty, null, 2), 'utf8');
        return empty;
    }
    try {
        return JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    } catch (e) {
        console.error('❌ 读取 database.json 失败：', e.message);
        throw e;
    }
}

async function ensureRegistrationRoleColumn() {
    const pool = getPool();
    const [columns] = await pool.query("SHOW COLUMNS FROM `users` LIKE 'registration_role'");
    if (columns.length) return;

    await pool.query(
        "ALTER TABLE `users` ADD COLUMN `registration_role` VARCHAR(32) NULL AFTER `role`"
    );
    await pool.query(`
        UPDATE users u
        SET registration_role = CASE
            WHEN u.role IN ('user', 'buyer') THEN 'buyer'
            WHEN u.role IN ('developer', 'artisan') AND EXISTS (
                SELECT 1 FROM merchants m WHERE m.user_id = u.id AND m.status = 'approved'
            ) THEN 'buyer'
            WHEN u.role IN ('developer', 'artisan') THEN 'artisan'
            ELSE u.role
        END
        WHERE registration_role IS NULL OR registration_role = ''
    `);
    await pool.query(
        "ALTER TABLE `users` MODIFY COLUMN `registration_role` VARCHAR(32) NOT NULL DEFAULT 'buyer'"
    );
}

async function ensureMerchantApprovedByColumn() {
    const pool = getPool();
    const [columns] = await pool.query("SHOW COLUMNS FROM `merchants` LIKE 'approved_by'");
    if (columns.length) return;

    await pool.query(
        "ALTER TABLE `merchants` ADD COLUMN `approved_by` BIGINT NULL AFTER `status`"
    );
}

async function ensureConversationProductColumns() {
    const pool = getPool();
    const [columns] = await pool.query("SHOW COLUMNS FROM `conversations` LIKE 'product_id'");
    if (!columns.length) {
        await pool.query(
            "ALTER TABLE `conversations` ADD COLUMN `product_id` BIGINT NULL AFTER `developer_id`"
        );
    }
    const [productNameColumns] = await pool.query("SHOW COLUMNS FROM `conversations` LIKE 'product_name'");
    if (!productNameColumns.length) {
        await pool.query(
            "ALTER TABLE `conversations` ADD COLUMN `product_name` VARCHAR(255) NOT NULL DEFAULT '' AFTER `product_id`"
        );
    }
}

/**
 * 初始化：优先从 MySQL 载入，失败则降级为 JSON 文件模式
 * @returns {Promise<Object>} 内存数据对象
 */
async function init() {
    if ((process.env.DB_MODE || 'mysql').toLowerCase() === 'json') {
        cache = loadAllFromJSON();
        snapshot = clone(cache);
        mode = 'json';
        return cache;
    }

    try {
        await ensureRegistrationRoleColumn();
        await ensureMerchantApprovedByColumn();
        await ensureConversationProductColumns();
        cache = await loadAllFromMySQL();
        snapshot = clone(cache);
        mode = 'mysql';
        return cache;
    } catch (mysqlErr) {
        throw new Error(`MySQL 数据层初始化失败；为防止切换到另一份数据库导致账号“丢失”，已停止启动而非回退到 JSON：${mysqlErr.message}`);
    }
}

/** 当前存储模式 ('mysql' | 'json') */
function getMode() { return mode; }

=======
/**
 * 初始化：从 MySQL 载入数据
 * @returns {Promise<Object>} 内存数据对象
 */
async function init() {
    cache = await loadAllFromMySQL();
    snapshot = clone(cache);
    return cache;
}

>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
// ---------- 读取 ----------

/**
 * 同步获取内存数据（替代原 loadDB）
 * @returns {Object}
 */
function loadDB() {
    if (!cache) {
        throw new Error('数据层尚未初始化，请先 await store.init()');
    }
    return cache;
}

// ---------- 写入 ----------

/**
 * 同步单张表到 MySQL（在事务中：先删多余行，再 UPSERT 全部行）
 * @param {string} table
 * @param {Array} rows
 */
async function syncTable(table, rows) {
    const meta = TABLES[table];
    if (!meta) return;

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const ids = rows.map(r => r.id).filter(id => id !== undefined && id !== null);
        // 删除内存中已不存在的行
        if (ids.length) {
            const placeholders = ids.map(() => '?').join(',');
            await conn.query(`DELETE FROM \`${table}\` WHERE id NOT IN (${placeholders})`, ids);
        } else {
            await conn.query(`DELETE FROM \`${table}\``);
        }

        // UPSERT 所有行
        if (rows.length) {
            const cols = meta.columns;
            const colSql = cols.map(c => `\`${c}\``).join(',');
            const updateSql = cols.filter(c => c !== 'id').map(c => `\`${c}\`=VALUES(\`${c}\`)`).join(',');
            const sql = `INSERT INTO \`${table}\` (${colSql}) VALUES (${cols.map(() => '?').join(',')})` +
                (updateSql ? ` ON DUPLICATE KEY UPDATE ${updateSql}` : '');
            for (const row of rows) {
                const values = cols.map(c => toColumn(c, row[c], meta));
                await conn.query(sql, values);
            }
        }

        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

/**
 * 同步订单明细表（orders.items 是嵌套结构，需拆分到 order_items）
 * @param {Array} orders
 */
async function syncOrderItems(orders) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM `order_items`');
        for (const o of orders) {
            for (const it of o.items || []) {
                await conn.query(
                    `INSERT INTO order_items (order_id, product_id, title, price, quantity, cover_image, created_at)
                     VALUES (?,?,?,?,?,?,?)`,
                    [o.id, it.product_id, it.title || '', Number(it.price) || 0,
                     Number(it.quantity) || 1, it.cover_image || '', toDbDate(o.created_at)]
                );
            }
        }
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

/**
 * 与快照比较，把变化的表同步到 MySQL
 * @param {Object} current 当前内存数据
 */
async function persistChanges(current) {
<<<<<<< HEAD
    if (mode === 'json') {
        fs.writeFileSync(JSON_FILE, JSON.stringify(current, null, 2), 'utf8');
        snapshot = clone(current);
        return;
    }
    for (const table of Object.keys(TABLES)) {
        const before = JSON.stringify(snapshot[table] || []);
        const after = JSON.stringify(current[table] || []);
        if (before === after) continue;
=======
    for (const table of Object.keys(TABLES)) {
        const before = JSON.stringify(snapshot[table] || []);
        const after = JSON.stringify(current[table] || []);
        if (before === after) continue;   // 该表无变化，跳过
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
        await syncTable(table, current[table] || []);
        if (table === 'orders') {
            await syncOrderItems(current.orders || []);
        }
    }
    snapshot = clone(current);
}

/**
 * 保存数据（替代原 saveDB）
 *
 * 保持同步签名以便业务代码零改动：实际写入在后台串行队列中完成。
 * 需要确保落盘的场景（如优雅关闭）请调用 flush()。
 *
 * @param {Object} data 内存数据对象
 * @returns {Promise<void>} 本次写入完成的 Promise（不 await 也不影响流程）
 */
<<<<<<< HEAD
function queueSave(data) {
    // 更新内存引用（业务代码可能传入新的 db 对象）
    cache = data;
    const task = writeQueue.then(async () => {
        await persistChanges(data);
        lastError = null;
    });
    writeQueue = task.catch(e => {
        lastError = e;
        if (mode === 'json') {
            console.error('❌ 写入 database.json 失败：', e.message);
        } else {
            console.error('❌ 数据持久化到 MySQL 失败：', e.message);
            console.error('   内存数据仍然有效，但数据库可能未同步。请检查 MySQL 连接。');
        }
    });
    return task;
}

function saveDB(data) {
    return queueSave(data).catch(() => {});
}

function saveDBDurable(data) {
    return queueSave(data);
}

=======
function saveDB(data) {
    // 更新内存引用（业务代码可能传入新的 db 对象）
    cache = data;
    const task = writeQueue.then(() => persistChanges(data)).catch(e => {
        lastError = e;
        console.error('❌ 数据持久化到 MySQL 失败：', e.message);
        console.error('   内存数据仍然有效，但数据库可能未同步。请检查 MySQL 连接。');
    });
    writeQueue = task;
    return task;
}

>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
/**
 * 等待队列中所有写入完成（优雅关闭时调用，防止丢数据）
 * @returns {Promise<void>}
 */
async function flush() {
    await writeQueue;
    if (lastError) {
        console.warn('⚠️  最近一次持久化曾失败：', lastError.message);
    }
}

/** 获取最近的持久化错误（供健康检查使用） */
function getLastError() {
    return lastError;
}

module.exports = {
    init,
    loadDB,
    saveDB,
<<<<<<< HEAD
    saveDBDurable,
    flush,
    getLastError,
    getMode,
    TABLES,
    NEXT_ID_KEYS,
    _internal: {
        loadAllFromMySQL,
        loadAllFromJSON,
=======
    flush,
    getLastError,
    TABLES,
    NEXT_ID_KEYS,
    // 供测试使用
    _internal: {
        loadAllFromMySQL,
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
        persistChanges,
        getSnapshot: () => snapshot,
        reset: () => { cache = null; snapshot = null; writeQueue = Promise.resolve(); lastError = null; }
    }
<<<<<<< HEAD
};
=======
};
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
