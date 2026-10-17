// test-pw.js —— 用指定密码测试 root / heritage 两个账号
const mysql = require('mysql2/promise');

(async () => {
  const pw = process.argv[2];
  if (pw === undefined) { console.log('用法: node test-pw.js <密码>'); return; }
  console.log('待测密码:', JSON.stringify(pw), '（长度 ' + pw.length + '）');
  let ok = false;
  for (const user of ['root', 'heritage']) {
    try {
      const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user, password: pw });
      const [v] = await conn.query('SELECT VERSION() AS v');
      const [dbs] = await conn.query('SHOW DATABASES');
      console.log(`✅ 成功！用户 "${user}"  密码有效  →  MySQL ${v[0].v}`);
      console.log('   可见数据库:', dbs.map(d => Object.values(d)[0]).join(', '));
      const [has] = await conn.query("SHOW DATABASES LIKE 'heritage'");
      console.log('   heritage 库:', has.length > 0 ? '已存在' : '不存在（下一步需执行 init.js）');
      await conn.end();
      ok = true;
    } catch (e) {
      console.log(`❌ 用户 "${user}" → ${e.code}`);
    }
  }
  console.log(ok ? '\n结论: 密码可用，可以继续配置 .env' : '\n结论: 该密码对这两个账号均无效');
})();
