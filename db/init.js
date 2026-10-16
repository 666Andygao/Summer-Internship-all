/**
 * 数据库初始化脚本
 *
 * 作用：
 *   1) 自动创建数据库（若不存在）
 *   2) 执行 db/schema.sql 建表（CREATE TABLE IF NOT EXISTS，可重复执行）
 *
 * 使用：node db/init.js
 */
require('../lib/env').load();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'heritage';

const baseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4'
};

async function main() {
    console.log('========================================');
    console.log('  数据库初始化');
    console.log('========================================');
    console.log(`  目标: ${baseConfig.host}:${baseConfig.port} / ${DB_NAME}`);
    console.log('');

    // ---------- 1. 创建数据库 ----------
    let conn;
    try {
        conn = await mysql.createConnection(baseConfig);
    } catch (e) {
        console.error('❌ 无法连接 MySQL：', e.message);
        console.error('   请检查 .env 中的 DB_HOST / DB_PORT / DB_USER / DB_PASSWORD 配置，');
        console.error('   并确认 MySQL 服务已启动。');
        process.exit(1);
    }

    try {
        await conn.query(
            `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
        );
        console.log(`✅ 数据库 \`${DB_NAME}\` 已就绪`);
    } finally {
        await conn.end();
    }

    // ---------- 2. 执行建表脚本 ----------
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        console.error('❌ 找不到 db/schema.sql');
        process.exit(1);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    const dbConn = await mysql.createConnection({
        ...baseConfig,
        database: DB_NAME,
        multipleStatements: true   // schema.sql 含多条建表语句
    });

    try {
        await dbConn.query(schemaSql);
        console.log('✅ 数据表创建完成');

        // 列出已创建的表，便于确认
        const [rows] = await dbConn.query('SHOW TABLES');
        const tableKey = `Tables_in_${DB_NAME}`;
        const names = rows.map(r => r[tableKey] || Object.values(r)[0]);
        console.log(`   共 ${names.length} 张表: ${names.join(', ')}`);
    } catch (e) {
        console.error('❌ 建表失败：', e.message);
        process.exit(1);
    } finally {
        await dbConn.end();
    }

    console.log('');
    console.log('========================================');
    console.log('  下一步：node db/migrate.js  导入现有数据');
    console.log('========================================');
}

main().catch(e => {
    console.error('❌ 初始化异常：', e);
    process.exit(1);
});
