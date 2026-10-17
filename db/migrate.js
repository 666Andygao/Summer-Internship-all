/**
 * 数据迁移脚本：database.json → MySQL
 *
 * 使用：
 *   node db/migrate.js          正常迁移（目标表非空时会拒绝执行）
 *   node db/migrate.js --force  先清空目标表再迁移（会删除 MySQL 中现有数据）
 *
 * 说明：
 *   - 保留原有 id，确保表间关联关系不变
 *   - 时间字段统一转换为 MySQL DATETIME（UTC）
 *   - 数组/对象字段序列化为 JSON 存储
 *   - 订单的 items 会同时写入 order_items 明细表
 */
require('../lib/env').load();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'heritage';
const FORCE = process.argv.includes('--force');
const JSON_PATH = path.join(__dirname, '..', 'database.json');

const connConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',
    multipleStatements: false
};

// ---------- 转换工具 ----------
const toDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
};
const toJson = (v) => (v === undefined || v === null ? null : JSON.stringify(v));
const s = (v, def = '') => (v === undefined || v === null ? def : String(v));
const n = (v, def = 0) => (v === undefined || v === null || isNaN(Number(v)) ? def : Number(v));
const b = (v) => (v ? 1 : 0);

// 按依赖顺序迁移的表（清空时按反序，避免外键问题）
const TABLES = [
    'users', 'merchants', 'products', 'addresses', 'favorites', 'carts',
    'orders', 'order_items', 'after_sales', 'reviews', 'complaints',
    'conversations', 'messages', 'friends'
];

async function main() {
    console.log('========================================');
    console.log('  数据迁移：database.json → MySQL');
    console.log('========================================');

    if (!fs.existsSync(JSON_PATH)) {
        console.error('❌ 找不到 database.json');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    console.log(`  源文件: database.json`);
    console.log(`  目标库: ${connConfig.host}:${connConfig.port}/${DB_NAME}`);
    console.log(`  模式:   ${FORCE ? '强制（清空后导入）' : '安全（表非空则中止）'}`);
    console.log('');

    const conn = await mysql.createConnection(connConfig);
    const stats = {};

    try {
        // ---------- 检查目标表是否为空 ----------
        if (!FORCE) {
            const nonEmpty = [];
            for (const t of TABLES) {
                const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
                if (rows[0].c > 0) nonEmpty.push(`${t}(${rows[0].c})`);
            }
            if (nonEmpty.length) {
                console.error('❌ 以下表已有数据，为避免覆盖已中止：');
                console.error('   ' + nonEmpty.join(', '));
                console.error('   如确认要覆盖，请执行：node db/migrate.js --force');
                process.exit(1);
            }
        } else {
            console.log('🧹 清空目标表...');
            await conn.query('SET FOREIGN_KEY_CHECKS = 0');
            for (const t of [...TABLES].reverse()) {
                await conn.query(`TRUNCATE TABLE \`${t}\``);
            }
            await conn.query('SET FOREIGN_KEY_CHECKS = 1');
            console.log('   已清空');
            console.log('');
        }

        // ---------- 1. users ----------
<<<<<<< HEAD
=======
<<<<<<< HEAD
        const approvedMerchantUserIds = new Set(
            (data.merchants || [])
                .filter(merchant => merchant.status === 'approved')
                .map(merchant => String(merchant.user_id))
        );
        for (const u of data.users || []) {
            const role = s(u.role, 'user');
            const registrationRole = u.registration_role ||
                (['developer', 'artisan'].includes(role) && approvedMerchantUserIds.has(String(u.id))
                    ? 'buyer'
                    : role);
            await conn.execute(
                `INSERT INTO users (id, username, password, role, registration_role, display_name, phone, avatar, addresses, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?)`,
                [u.id, s(u.username), s(u.password), role,
                 registrationRole, s(u.display_name),
=======
>>>>>>> 8f4aae9ea20839b655018b479d45434fa8db2a1b
        for (const u of data.users || []) {
            await conn.execute(
                `INSERT INTO users (id, username, password, role, display_name, phone, avatar, addresses, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?)`,
                [u.id, s(u.username), s(u.password), s(u.role, 'user'), s(u.display_name),
<<<<<<< HEAD
=======
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
>>>>>>> 8f4aae9ea20839b655018b479d45434fa8db2a1b
                 s(u.phone), s(u.avatar), toJson(u.addresses || []), toDate(u.created_at)]
            );
        }
        stats.users = (data.users || []).length;

        // ---------- 2. merchants ----------
        for (const m of data.merchants || []) {
            await conn.execute(
                `INSERT INTO merchants (id, user_id, shop_name, intro, heritage_category, contact_phone,
<<<<<<< HEAD
=======
<<<<<<< HEAD
                                        qualification_note, status, approved_by, permissions, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                [m.id, m.user_id, s(m.shop_name), s(m.intro), s(m.heritage_category), s(m.contact_phone),
                 s(m.qualification_note), s(m.status, 'pending'), m.approved_by || null, toJson(m.permissions || []),
=======
>>>>>>> 8f4aae9ea20839b655018b479d45434fa8db2a1b
                                        qualification_note, status, permissions, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                [m.id, m.user_id, s(m.shop_name), s(m.intro), s(m.heritage_category), s(m.contact_phone),
                 s(m.qualification_note), s(m.status, 'pending'), toJson(m.permissions || []),
<<<<<<< HEAD
=======
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
>>>>>>> 8f4aae9ea20839b655018b479d45434fa8db2a1b
                 toDate(m.created_at), toDate(m.updated_at)]
            );
        }
        stats.merchants = (data.merchants || []).length;

        // ---------- 3. products ----------
        for (const p of data.products || []) {
            await conn.execute(
                `INSERT INTO products (id, merchant_id, merchant_user_id, merchant_name, title, subtitle, brief,
                                       description, detail_description, price, stock, category, tags, specifications,
                                       cover_image, main_images, detail_images, video_url, model_url, story,
                                       artisan_intro, heritage_background, is_recommended, recommend_reason,
                                       featured_section, sales_count, status, is_deleted, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [p.id, p.merchant_id || null, p.merchant_user_id || null, s(p.merchant_name), s(p.title),
                 s(p.subtitle), s(p.brief), s(p.description), s(p.detail_description), n(p.price), n(p.stock),
                 s(p.category, '非遗手作'), toJson(p.tags || []), toJson(p.specifications || []),
                 s(p.cover_image), toJson(p.main_images || []), toJson(p.detail_images || []),
                 s(p.video_url), s(p.model_url), s(p.story), s(p.artisan_intro), s(p.heritage_background),
                 b(p.is_recommended), s(p.recommend_reason), s(p.featured_section), n(p.sales_count),
                 s(p.status, 'published'), b(p.is_deleted), toDate(p.created_at), toDate(p.updated_at)]
            );
        }
        stats.products = (data.products || []).length;

        // ---------- 4. addresses ----------
        for (const a of data.addresses || []) {
            await conn.execute(
                `INSERT INTO addresses (id, user_id, recipient_name, phone, province, city, district, detail, is_default, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?)`,
                [a.id, a.user_id, s(a.recipient_name), s(a.phone), s(a.province), s(a.city),
                 s(a.district), s(a.detail), b(a.is_default), toDate(a.created_at)]
            );
        }
        stats.addresses = (data.addresses || []).length;

        // ---------- 5. favorites ----------
        for (const f of data.favorites || []) {
            await conn.execute(
                `INSERT INTO favorites (id, user_id, product_id, created_at) VALUES (?,?,?,?)`,
                [f.id, f.user_id, f.product_id, toDate(f.created_at)]
            );
        }
        stats.favorites = (data.favorites || []).length;

        // ---------- 6. carts ----------
        for (const c of data.carts || []) {
            await conn.execute(
                `INSERT INTO carts (id, user_id, guest_id, product_id, title, price, quantity, cover_image,
                                    merchant_id, merchant_name, selected, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [c.id, c.user_id || null, c.guest_id || null, c.product_id, s(c.title), n(c.price),
                 n(c.quantity, 1), s(c.cover_image), c.merchant_id || null, s(c.merchant_name),
                 b(c.selected), toDate(c.created_at), toDate(c.updated_at)]
            );
        }
        stats.carts = (data.carts || []).length;

        // ---------- 7. orders + 8. order_items ----------
        let itemCount = 0;
        for (const o of data.orders || []) {
            await conn.execute(
                `INSERT INTO orders (id, order_no, user_id, buyer_id, buyer_name, address_id, shipping_address,
                                     remarks, coupon_code, coupon_desc, subtotal, shipping_fee, discount_amount,
                                     total_amount, status, items, payment, payment_logs, payment_credentials,
                                     created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [o.id, s(o.order_no), o.user_id, o.buyer_id || null, s(o.buyer_name), o.address_id || null,
                 toJson(o.shipping_address), s(o.remarks), s(o.coupon_code), s(o.coupon_desc),
                 n(o.subtotal), n(o.shipping_fee), n(o.discount_amount), n(o.total_amount),
                 s(o.status, 'pending_payment'), toJson(o.items || []), toJson(o.payment),
                 toJson(o.payment_logs), toJson(o.payment_credentials),
                 toDate(o.created_at), toDate(o.updated_at)]
            );
            // 拆分订单明细
            for (const it of o.items || []) {
                await conn.execute(
                    `INSERT INTO order_items (order_id, product_id, title, price, quantity, cover_image, created_at)
                     VALUES (?,?,?,?,?,?,?)`,
                    [o.id, it.product_id, s(it.title), n(it.price), n(it.quantity, 1), s(it.cover_image), toDate(o.created_at)]
                );
                itemCount++;
            }
        }
        stats.orders = (data.orders || []).length;
        stats.order_items = itemCount;

        // ---------- 9. after_sales ----------
        for (const r of data.after_sales || []) {
            await conn.execute(
                `INSERT INTO after_sales (id, order_id, order_no, user_id, type, reason, amount, description,
                                          logistics, status, reviewed_by, review_remark, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [s(r.id), r.order_id || null, s(r.order_no), r.user_id, s(r.type, 'refund'), s(r.reason),
                 n(r.amount), s(r.description), toJson(r.logistics), s(r.status, 'pending_review'),
                 r.reviewed_by || null, s(r.review_remark), toDate(r.created_at), toDate(r.updated_at)]
            );
        }
        stats.after_sales = (data.after_sales || []).length;

        // ---------- 10. reviews ----------
        for (const r of data.reviews || []) {
            await conn.execute(
                `INSERT INTO reviews (id, order_id, order_no, product_id, user_id, user_name, rating, content,
                                      experience, files, parent_review_id, status, reply, reply_at,
                                      is_hidden, is_blocked, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [s(r.id), r.order_id || null, s(r.order_no), r.product_id || null, r.user_id, s(r.user_name),
                 n(r.rating, 5), s(r.content), s(r.experience), toJson(r.files || []),
                 r.parent_review_id || null, s(r.status, 'approved'), toJson(r.reply), toDate(r.reply_at),
                 b(r.is_hidden), b(r.is_blocked), toDate(r.created_at), toDate(r.updated_at)]
            );
        }
        stats.reviews = (data.reviews || []).length;

        // ---------- 11. complaints ----------
        for (const c of data.complaints || []) {
            await conn.execute(
                `INSERT INTO complaints (id, order_id, order_no, user_id, type, reason, description,
                                         evidence, status, remark, created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                [s(c.id), c.order_id || null, s(c.order_no), c.user_id, s(c.type, 'complaint'),
                 s(c.reason), s(c.description), toJson(c.evidence || []), s(c.status, 'pending'),
                 s(c.remark), toDate(c.created_at), toDate(c.updated_at)]
            );
        }
        stats.complaints = (data.complaints || []).length;

        // ---------- 12. conversations ----------
        for (const c of data.conversations || []) {
            await conn.execute(
                `INSERT INTO conversations (id, user_id, developer_id, created_at) VALUES (?,?,?,?)`,
                [c.id, c.user_id, c.developer_id, toDate(c.created_at)]
            );
        }
        stats.conversations = (data.conversations || []).length;

        // ---------- 13. messages ----------
        for (const m of data.messages || []) {
            await conn.execute(
                `INSERT INTO messages (id, conversation_id, sender_id, content, file_path, file_type,
                                       file_name, is_read, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?)`,
                [m.id, m.conversation_id, m.sender_id, s(m.content), s(m.file_path), s(m.file_type),
                 s(m.file_name), b(m.is_read), toDate(m.created_at)]
            );
        }
        stats.messages = (data.messages || []).length;

        // ---------- 14. friends ----------
        for (const f of data.friends || []) {
            await conn.execute(
                `INSERT INTO friends (id, from_user_id, to_user_id, status, created_at) VALUES (?,?,?,?,?)`,
                [f.id, f.from_user_id, f.to_user_id, s(f.status, 'pending'), toDate(f.created_at)]
            );
        }
        stats.friends = (data.friends || []).length;

        // ---------- 迁移结果 ----------
        console.log('📦 迁移完成，各表记录数：');
        for (const [k, v] of Object.entries(stats)) {
            console.log(`   ${k.padEnd(16)} ${v}`);
        }
        const total = Object.values(stats).reduce((a, b2) => a + b2, 0);
        console.log(`   ${'合计'.padEnd(15)} ${total}`);
        console.log('');
        console.log('========================================');
        console.log('  ✅ 数据迁移成功');
        console.log('========================================');

    } catch (e) {
        console.error('');
        console.error('❌ 迁移失败：', e.message);
        console.error('   已导入的数据可能不完整，可执行 node db/migrate.js --force 重新导入');
        process.exit(1);
    } finally {
        await conn.end();
    }
}

main().catch(e => {
    console.error('❌ 迁移异常：', e);
    process.exit(1);
});
