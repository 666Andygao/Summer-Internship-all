// test-db.js —— 测试 MySQL 连接（不改动任何配置）
const mysql = require('mysql2/promise');

(async () => {
  const pw = process.argv[2] || '';
  try {
    const conn = await mysql.createConnection({
      host: 'localhost', port: 3306, user: 'root', password: pw
    });
    const [v] = await conn.query('SELECT VERSION() AS v');
    console.log('✅ 连接成功！MySQL 版本:', v[0].v);
    const [dbs] = await conn.query('SHOW DATABASES');
    console.log('现有数据库:', dbs.map(d => Object.values(d)[0]).join(', '));
    const [has] = await conn.query("SHOW DATABASES LIKE 'heritage'");
    console.log('heritage 库是否已存在:', has.length > 0 ? '是' : '否（需执行 init.js 建库）');
    await conn.end();
  } catch (e) {
    console.log('❌ 连接失败:', e.code, '-', e.message);
  }
})();
