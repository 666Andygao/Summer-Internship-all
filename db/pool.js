/**
 * MySQL 连接池（mysql2/promise）
 *
 * 设计说明：
 *   - 连接参数全部来自 .env（由 lib/env.js 加载），便于部署时切换数据库
 *   - 时区统一使用 UTC（timezone: 'Z'），与代码中的 new Date().toISOString() 保持一致，
 *     避免服务器时区不同导致时间错乱
 *   - 对外暴露 query / execute / withTransaction 与时间、JSON 转换工具，
 *     供 db/repositories 下的各仓储模块复用
 */
const mysql = require('mysql2/promise');

// ---------- 配置 ----------
const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'heritage',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: 'Z',              // 统一按 UTC 处理时间
    dateStrings: false,         // 让 mysql2 返回 Date 对象，便于统一转 ISO
    supportBigNumbers: true,
    bigNumberStrings: false,
    multipleStatements: false   // 防注入：禁止一次执行多条语句
};

let pool = null;

/**
 * 获取（懒加载）连接池
 * @returns {import('mysql2/promise').Pool}
 */
function getPool() {
    if (!pool) {
        pool = mysql.createPool(poolConfig);
    }
    return pool;
}

/**
 * 执行查询（返回行数据）
 * @param {string} sql
 * @param {Array} [params]
 * @returns {Promise<Array>}
 */
async function query(sql, params = []) {
    const [rows] = await getPool().query(sql, params);
    return rows;
}

/**
 * 执行写入语句（INSERT/UPDATE/DELETE），返回 OkPacket
 * @param {string} sql
 * @param {Array} [params]
 * @returns {Promise<import('mysql2').OkPacket>}
 */
async function execute(sql, params = []) {
    const [result] = await getPool().execute(sql, params);
    return result;
}

/**
 * 在事务中执行（用于需要原子性的多表操作，如创建订单）
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<any>} callback
 * @returns {Promise<any>}
 */
async function withTransaction(callback) {
    const conn = await getPool().getConnection();
    try {
        await conn.beginTransaction();
        const result = await callback(conn);
        await conn.commit();
        return result;
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

/**
 * 检查数据库连通性（启动时自检）
 * @returns {Promise<{ok: boolean, error?: string, version?: string}>}
 */
async function ping() {
    try {
        const rows = await query('SELECT VERSION() AS version');
        return { ok: true, version: rows[0] && rows[0].version };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

/**
 * 关闭连接池（优雅关闭时调用）
 */
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

// ---------- 数据格式转换工具 ----------

/**
 * ISO 时间字符串 → MySQL DATETIME（'YYYY-MM-DD HH:mm:ss'，UTC）
 * @param {string|Date|null} value
 * @returns {string|null}
 */
function toDbDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * MySQL DATETIME（Date 对象或字符串）→ ISO 时间字符串
 * @param {Date|string|null} value
 * @returns {string|null}
 */
function fromDbDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    // 字符串形式（如 '2026-07-21 10:23:05'）按 UTC 解析，补上 Z
    const normalized = String(value).replace(' ', 'T');
    const d = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : normalized + 'Z');
    return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * JS 值 → JSON 列可存储的字符串
 * @param {*} value
 * @returns {string|null}
 */
function toJson(value) {
    if (value === undefined || value === null) return null;
    return JSON.stringify(value);
}

/**
 * JSON 列读取后的值 → JS 值（mysql2 通常已自动解析，这里做兜底）
 * @param {*} value
 * @param {*} fallback 解析失败时的默认值
 * @returns {*}
 */
function fromJson(value, fallback = null) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return value;    // mysql2 已解析
    try {
        return JSON.parse(value);
    } catch (e) {
        return fallback;
    }
}

module.exports = {
    getPool,
    query,
    execute,
    withTransaction,
    ping,
    closePool,
    poolConfig,
    // 转换工具
    toDbDate,
    fromDbDate,
    toJson,
    fromJson
};
