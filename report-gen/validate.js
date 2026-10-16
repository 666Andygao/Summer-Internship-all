// validate.js —— 验证生成的 .docx 可被正常解包解析（复用 extract-docs.js 的 zip 逻辑思路）
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function parseZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('EOCD not found');
  const entryCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const entries = [];
  let p = cdOffset;
  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central dir entry');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const uncompSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.push({ name, method, compSize, uncompSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const out = {};
  for (const info of entries) {
    const lh = info.localOffset;
    const lnameLen = buf.readUInt16LE(lh + 26);
    const lextraLen = buf.readUInt16LE(lh + 28);
    const dataStart = lh + 30 + lnameLen + lextraLen;
    const data = buf.slice(dataStart, dataStart + info.compSize);
    out[info.name] = info.method === 0 ? data : zlib.inflateRawSync(data);
  }
  return out;
}

const file = process.argv[2];
const buf = fs.readFileSync(file);
const zip = parseZip(buf);
console.log('Entries:', Object.keys(zip).join(', '));
const doc = zip['word/document.xml'].toString('utf8');
const styles = zip['word/styles.xml'].toString('utf8');
const ct = zip['[Content_Types].xml'].toString('utf8');
if (!doc.includes('<w:body>')) throw new Error('document.xml malformed');
if (!styles.includes('Heading1')) throw new Error('styles.xml missing headings');
if (!ct.includes('document.main+xml')) throw new Error('content types malformed');
const textLen = (doc.match(/<w:t[^>]*>/g) || []).length;
console.log('document.xml OK, text runs:', textLen, '| styles.xml OK | content-types OK');
console.log('VALID DOCX:', file);
