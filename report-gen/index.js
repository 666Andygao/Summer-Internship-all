// index.js —— 组装报告内容并生成 .docx
const fs = require('fs');
const path = require('path');
const { buildDocx } = require('./docx-lib');

const p1 = require('./content-part1');
const p2 = require('./content-part2');
const p3 = require('./content-part3');
const p4 = require('./content-part4');

const blocks = [...p1, ...p2, ...p3, ...p4];

const title = '非遗云上传承平台设计报告';
const outPath = process.argv[2] || path.join(__dirname, '..', '非遗云上传承平台设计报告.docx');

const buf = buildDocx({ title, blocks });
fs.writeFileSync(outPath, buf);
console.log('OK ->', outPath, buf.length, 'bytes, blocks:', blocks.length);
