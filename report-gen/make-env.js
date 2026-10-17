const fs = require('fs');
const crypto = require('crypto');
const src = fs.readFileSync('D:/Summer Instern/.env.example', 'utf8');
let out = src;
out = out.replace('CHANGE_ME_请替换为随机长字符串', crypto.randomBytes(32).toString('hex'));
out = out.replace('CHANGE_ME_请替换为随机字符串', crypto.randomBytes(20).toString('hex'));
fs.writeFileSync('D:/Summer Instern/.env', out, 'utf8');
console.log('.env 已创建，长度', out.length);
