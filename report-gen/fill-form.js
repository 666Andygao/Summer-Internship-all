// fill-form.js —— 将团队信息填入《暑期社会实践优秀团队申报表》
// 填入：团队名称 + 主要事迹（1000字）；负责人/指导教师/成员/学院留空待用户补充
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------- zip 读 / 写 ----------
function parseZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  const n = buf.readUInt16LE(eocd + 10);
  const cd = buf.readUInt32LE(eocd + 16);
  const entries = [];
  let p = cd;
  for (let i = 0; i < n; i++) {
    const m = buf.readUInt16LE(p + 10), cs = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    const lo = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl);
    entries.push({ name, m, cs, lo });
    p += 46 + nl + el + cl;
  }
  const out = [];
  for (const e of entries) {
    const lh = e.lo, ln = buf.readUInt16LE(lh + 26), le = buf.readUInt16LE(lh + 28);
    const s = lh + 30 + ln + le;
    const d = buf.slice(s, s + e.cs);
    out.push({ name: e.name, data: e.m === 0 ? d : zlib.inflateRawSync(d) });
  }
  return out;
}

function crc32(buf) {
  let c, t = crc32.table;
  if (!t) { t = crc32.table = new Int32Array(256); for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } }
  let crc = -1; for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function buildZip(entries) {
  const parts = [], central = []; let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, 'utf8');
    let comp, method;
    if (raw.length > 40) { comp = zlib.deflateRawSync(raw, { level: 9 }); method = 8; if (comp.length >= raw.length) { comp = raw; method = 0; } }
    else { comp = raw; method = 0; }
    const crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, nameBuf, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
    central.push(ch, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16); eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...parts, cd, eocd]);
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const FS = 'w:rFonts w:hint="eastAsia" w:ascii="仿宋" w:hAnsi="仿宋" w:eastAsia="仿宋"';
// 生成一个含文本的 run（与单元格仿宋24同字体）
function run(t) { return `<w:r><w:rPr><${FS}/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${esc(t)}</w:t></w:r>`; }
// 生成一个正文段落（仿宋24，首行缩进2字符，行距560）
function para(t) {
  return `<w:p><w:pPr><w:keepNext w:val="0"/><w:keepLines w:val="0"/><w:pageBreakBefore w:val="0"/><w:kinsoku/><w:wordWrap/><w:overflowPunct/><w:autoSpaceDE/><w:autoSpaceDN/><w:bidi w:val="0"/><w:adjustRightInd/><w:spacing w:line="560" w:lineRule="exact"/><w:ind w:firstLine="480" w:firstLineChars="200"/><w:jc w:val="both"/><w:rPr><${FS}/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr>${run(t)}</w:p>`;
}
// 小标题段（加粗，无缩进）
function subpara(t) {
  return `<w:p><w:pPr><w:keepNext w:val="0"/><w:keepLines w:val="0"/><w:pageBreakBefore w:val="0"/><w:kinsoku/><w:wordWrap/><w:overflowPunct/><w:autoSpaceDE/><w:autoSpaceDN/><w:bidi w:val="0"/><w:adjustRightInd/><w:spacing w:line="560" w:lineRule="exact"/><w:jc w:val="both"/><w:rPr><${FS}/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><${FS}/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${esc(t)}</w:t></w:r></w:p>`;
}

// ---------- 主要事迹内容（1000 字） ----------
const paras = [
  { title: '深耕田野，摸清家底。', body: '团队奔赴黔、滇、川三省，实地走访苗族银饰锻制、建水紫陶烧制、彝族火草纺织等代表性技艺，调研传承人、工坊与市场现状，提取非遗器物背后的文化基因与传统色值，凝练出“非遗色彩图谱”可视化方案，为数字化保护奠定了扎实的内容基础。' },
  { title: '数字建模，让文物“活”起来。', body: '团队利用专业建模软件，完成我国西南苗族银饰、建水紫陶、云南瓦猫、黄平泥哨、火草纺织等 5 件非遗器物的高精度三维采集与建模，输出兼容主流 Web 引擎的 GLTF/OBJ 格式，实现网页端 720° 旋转、缩放与纹理细节浏览；同步编制云南、四川、贵州三省 16 份非遗技艺档案，建成结构清晰、可检索、可扩展的非遗知识库。' },
  { title: '自主开发，构建“非遗云上传承”平台。', body: '团队全程自主设计并开发了集门户与电商于一体的综合平台。门户实现文化资讯、非遗名录、工艺流程图解等功能；电商系统构建“商品浏览—详情—加购—结算”完整闭环，创新性地在商品页高亮植入非遗等级、民族标签与文化故事，以“文化浸润式”导购取代单一比价，助力非遗产品文化溢价；后端开发 126 个 RESTful 接口、设计 17 张数据表，并预留京东、淘宝跨平台商品解析与导流能力。项目全程采用开源框架与低门槛技术栈，成本可控、易于在基层文保单位和中小非遗工坊推广。' },
  { title: '以用促保，成效初显。', body: '平台将“数字建档—三维呈现—电商转化”串成完整链路，让公众透过屏幕即可看懂器物背后的工艺与民族记忆；将文化属性与商品属性绑定，直接为传承人与手工艺人拓宽增收渠道，为乡村振兴注入数字动能。平台已在 web 端稳定运行，形成可复制、可推广的非遗数字化保护样板。' },
  { title: '薪火相传，步履不停。', body: '团队跨专业协作，从田野调查到建模开发、从上线运行到持续迭代全程自主完成，在一次次磨合中锤炼了调研、工程与创新能力。未来，团队将持续扩充非遗档案与三维模型库，接入真实支付与更多传承机构，让西南非遗在数字时代“活”得更久、“火”得更远，以实际行动践行“以用促保、以商养传”的青春承诺。' }
];

// ---------- 主流程 ----------
const inFile = 'D:\\Summer Instern\\2026年暑期社会实践优秀团队申报表.docx';
const backup = 'D:\\Summer Instern\\report-gen\\申报表-原版备份.docx';
fs.copyFileSync(inFile, backup);

const entries = parseZip(fs.readFileSync(inFile));
const docIdx = entries.findIndex(e => e.name === 'word/document.xml');
let xml = entries[docIdx].data.toString('utf8');

// 0) 去掉表格行的 cantSplit 限制，使"主要事迹"内容能跨页展开，避免整行被推到下一页
xml = xml.replace(/<w:cantSplit\s*\/>/g, '');

// 1) 团队名称：定位空 cell 段落 paraId="4DBF68DF"，在 </w:p> 前插入文本 run
function fillCellById(xml, paraId, text) {
  const key = '<w:p w14:paraId="' + paraId + '"';
  const start = xml.indexOf(key);
  if (start < 0) { console.log('NOT FOUND paraId', paraId); return xml; }
  const end = xml.indexOf('</w:p>', start) + '</w:p>'.length;
  const seg = xml.slice(start, end);
  const nu = seg.replace('</w:p>', run(text) + '</w:p>');
  return xml.slice(0, start) + nu + xml.slice(end);
}
xml = fillCellById(xml, '4DBF68DF', '数赋黔滇');

// 2) 主要事迹：定位 TC11 提示段（paraId="08BF9B7A"），在其之后插入同级事迹段落（不嵌套 <w:p>）
xml = (function setDeeds(x) {
  const keyId = '<w:p w14:paraId="08BF9B7A"';
  const s = x.indexOf(keyId);
  if (s < 0) { console.log('NOT FOUND deeds cell'); return x; }
  const endPara = x.indexOf('</w:p>', s) + '</w:p>'.length; // 原提示段完整结束
  const injected = paras.map(p => p.title ? subpara(p.title + p.body) : para(p.body)).join('');
  // 作为兄弟段落，插在原提示段之后、</w:tc> 之前
  return x.slice(0, endPara) + injected + x.slice(endPara);
})(xml);

// 重新写回 document.xml
entries[docIdx].data = Buffer.from(xml, 'utf8');

const outBuf = buildZip(entries);
const outFile = 'D:\\Summer Instern\\2026年暑期社会实践优秀团队申报表（已填）.docx'; // 原表可能被 Word 占用，输出新文件
fs.writeFileSync(outFile, outBuf);
console.log('FILLED ->', outFile, outBuf.length, 'bytes');
console.log('backup ->', backup);
