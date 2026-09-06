// 轻量 docx 文本提取脚本：解析 ZIP 中央目录，解压 word/document.xml 并抽取 <w:t> 文本
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function extractZip(buf) {
  // 查找 End of Central Directory
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('EOCD not found');
  const entryCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const entries = {};
  let p = cdOffset;
  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const uncompSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries[name] = { method, compSize, uncompSize, localOffset };
    p += 46 + nameLen + extraLen + commentLen;
  }
  const out = {};
  for (const [name, info] of Object.entries(entries)) {
    const lh = info.localOffset;
    const lnameLen = buf.readUInt16LE(lh + 26);
    const lextraLen = buf.readUInt16LE(lh + 28);
    const dataStart = lh + 30 + lnameLen + lextraLen;
    const data = buf.slice(dataStart, dataStart + info.compSize);
    if (info.method === 0) out[name] = data.toString('utf8');
    else if (info.method === 8) out[name] = zlib.inflateRawSync(data).toString('utf8');
    else out[name] = '[unsupported method ' + info.method + ']';
  }
  return out;
}

function docxText(xml) {
  // 提取 <w:t> 文本，段落 <w:p> 换行
  const paragraphs = [];
  const pRe = /<w:p[ >][\s\S]*?<\/w:p>/g;
  let m;
  while ((m = pRe.exec(xml)) !== null) {
    const tRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let t, line = '';
    while ((t = tRe.exec(m[0])) !== null) line += t[1];
    paragraphs.push(line.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'));
  }
  return paragraphs.join('\n');
}

const docsRoot = process.argv[2] || path.join(__dirname, 'docs');
const outFile = process.argv[3] || path.join(__dirname, 'docs_extracted.txt');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.docx')) files.push(p);
  }
})(docsRoot);

let result = '';
for (const f of files) {
  try {
    const buf = fs.readFileSync(f);
    const zip = extractZip(buf);
    const xml = zip['word/document.xml'] || '';
    const text = docxText(xml);
    result += `===== ${path.basename(f)} =====\n${text}\n\n`;
  } catch (err) {
    result += `===== ${path.basename(f)} ERROR: ${err.message} =====\n\n`;
  }
}
fs.writeFileSync(outFile, result, 'utf8');
console.log('Processed', files.length, 'files ->', outFile, 'chars:', result.length);
