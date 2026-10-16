// fix-cantsplit.js —— 基于"原表.docx"（干净内容）去掉 cantSplit，生成最终可跨页版
const fs = require('fs');
const zlib = require('zlib');

function parseZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  const n = buf.readUInt16LE(eocd + 10), cd = buf.readUInt32LE(eocd + 16);
  const entries = []; let p = cd;
  for (let i = 0; i < n; i++) {
    const m = buf.readUInt16LE(p + 10), cs = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42);
    entries.push({ name: buf.toString('utf8', p + 46, p + 46 + nl), m, cs, lo }); p += 46 + nl + el + cl;
  }
  const out = [];
  for (const e of entries) {
    const lh = e.lo, ln = buf.readUInt16LE(lh + 26), le = buf.readUInt16LE(lh + 28), s = lh + 30 + ln + le, d = buf.slice(s, s + e.cs);
    out.push({ name: e.name, data: e.m === 0 ? d : zlib.inflateRawSync(d) });
  }
  return out;
}
function crc32(buf) {
  let c, t = crc32.table; if (!t) { t = crc32.table = new Int32Array(256); for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } }
  let crc = -1; for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xff]; return (crc ^ -1) >>> 0;
}
function buildZip(entries) {
  const parts = [], central = []; let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8'), raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, 'utf8');
    let comp, method; if (raw.length > 40) { comp = zlib.deflateRawSync(raw, { level: 9 }); method = 8; if (comp.length >= raw.length) { comp = raw; method = 0; } } else { comp = raw; method = 0; }
    const crc = crc32(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, nameBuf, comp);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
    central.push(ch, nameBuf); offset += 30 + nameBuf.length + comp.length;
  }
  const cd0 = Buffer.concat(central); const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10); eocd.writeUInt32LE(cd0.length, 12); eocd.writeUInt32LE(offset, 16); eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...parts, cd0, eocd]);
}

const inFile = 'D:\\Summer Instern\\2026年暑期社会实践优秀团队申报表.docx'; // 干净内容（1 次填充）
const outFile = 'D:\\Summer Instern\\2026年暑期社会实践优秀团队申报表（已填）.docx';
const entries = parseZip(fs.readFileSync(inFile));
const idx = entries.findIndex(e => e.name === 'word/document.xml');
let xml = entries[idx].data.toString('utf8');
xml = xml.replace(/<w:cantSplit\s*\/>/g, '');
entries[idx].data = Buffer.from(xml, 'utf8');
fs.writeFileSync(outFile, buildZip(entries));
console.log('OK ->', outFile);

// 自检
const x2 = entries[idx].data.toString('utf8');
console.log('cantSplit:', (x2.match(/<w:cantSplit\s*\/>/g) || []).length);
console.log('团队名出现次数:', (x2.match(/数赋黔滇/g) || []).length);
console.log('事迹出现次数:', (x2.match(/深耕田野，摸清家底/g) || []).length);
