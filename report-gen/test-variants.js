// test-variants.js —— 测试密码的常见变体（大小写/去符号）
const mysql = require('mysql2/promise');

const base = ['gaomslimf0608@', 'gaomslimf0608', 'Gaomslimf0608@', 'GAOMSLIMF0608@',
              'zgx158658', 'Zgx158658', 'ZGX158658', 'zgx158658@'];

(async () => {
  let found = false;
  for (const pw of base) {
    for (const user of ['root', 'heritage']) {
      try {
        const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user, password: pw });
        console.log(`✅✅ 命中！用户 "${user}" / 密码 "${pw}"`);
        await conn.end();
        found = true;
        break;
      } catch (e) { /* 静默继续 */ }
    }
    if (found) break;
  }
  if (!found) console.log('❌ 全部变体均无效（共测试 ' + base.length * 2 + ' 个组合）');
})();
