// test-db2.js —— 多点尝试连接（用户名 × 密码组合）
const mysql = require('mysql2/promise');

const combos = [
  ['heritage', 'zgx158658'],
  ['heritage', 'heritage'],
  ['heritage', '123456'],
  ['root', 'zgx158658'],
  ['root', 'root'],
  ['root', '123456'],
  ['root', ''],
  ['root', 'password']
];

(async () => {
  for (const [user, password] of combos) {
    try {
      const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user, password });
      const [v] = await conn.query('SELECT VERSION() AS v');
      const [dbs] = await conn.query('SHOW DATABASES');
      console.log(`✅ 成功: 用户 "${user}" / 密码 "${password}"  →  MySQL ${v[0].v}`);
      console.log('   可见数据库:', dbs.map(d => Object.values(d)[0]).join(', '));
      await conn.end();
    } catch (e) {
      console.log(`❌ 失败: 用户 "${user}" / 密码 "${password}"  →  ${e.code}`);
    }
  }
})();
