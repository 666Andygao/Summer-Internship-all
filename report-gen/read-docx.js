// read-docx.js —— 读取 docx 表格结构与文本
const fs = require('fs');
const zlib = require('zlib');

function parseZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  const n = buf.readUInt16LE(eocd + 10);
  const cd = buf.readUInt32LE(eocd + 16);
  const entries = [];
  let p = cd;
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.push({ name, method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const out = {};
  for (const e of entries) {
    const lh = e.localOffset;
    const lnameLen = buf.readUInt16LE(lh + 26);
    const lextraLen = buf.readUInt16LE(lh + 28);
    const start = lh + 30 + lnameLen + lextraLen;
    const data = buf.slice(start, start + e.compSize);
    out[e.name] = e.method === 0 ? data : zlib.inflateRawSync(data);
  }
  return out;
}

function cellText(c) {
  const ts = c.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || [];
  return ts.map(x => x.replace(/<[^>]+>/g, '')).join('').trim();
}

const file = process.argv[2];
const zip = parseZip(fs.readFileSync(file));
const xml = zip['word/document.xml'].toString('utf8');

const tbls = xml.match(/<w:tbl[ >][\s\S]*?<\/w:tbl>/g) || [];
console.log('Tables found:', tbls.length);
tbls.forEach((tbl, ti) => {
  console.log(`\n===== TABLE ${ti + 1} =====`);
  const rows = tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
  rows.forEach((row, ri) => {
    const cells = row.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) || [];
    const cellTxt = cells.map(cellText);
    console.log(`  R${ri + 1}: [${cellTxt.join(' | ')}]`);
  });
});

const body = xml.replace(/<w:tbl[ >][\s\S]*?<\/w:tbl>/g, '');
const paras = (body.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(p => {
  return (p.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(x => x.replace(/<[^>]+>/g, '')).join('').trim();
}).filter(t => t);
console.log('\n===== NON-TABLE TEXT =====');
console.log(paras.join('\n'));
