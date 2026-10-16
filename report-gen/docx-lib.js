// docx-lib.js —— 最小化 OOXML (.docx) 生成库
// 支持：标题(1-3级)、正文段落、项目符号列表、编号列表、表格、等宽代码块、粗体/强调
// 纯 Node.js 实现，无外部依赖
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- zip 打包（存储 + deflate 混合） ----------
function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function buildZip(entries) {
  // entries: [{ name, data(Buffer|string) }]
  const parts = [];
  const central = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, 'utf8');
    const crc = crc32(raw);
    let comp, method;
    if (raw.length > 40) {
      comp = zlib.deflateRawSync(raw, { level: 9 });
      method = 8;
      if (comp.length >= raw.length) { comp = raw; method = 0; }
    } else {
      comp = raw;
      method = 0;
    }
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);   // version needed
    lh.writeUInt16LE(0x0800, 6); // flags: UTF-8
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(0, 10);   // mod time
    lh.writeUInt16LE(0x21, 12); // mod date
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);   // extra len
    parts.push(lh, nameBuf, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0x21, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const cdStart = offset;
  const cd = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...parts, cd, eocd]);
}

// ---------- document.xml 片段生成 ----------
function runXml(text, opts) {
  opts = opts || {};
  const rPr = [];
  if (opts.bold) rPr.push('<w:b/>');
  if (opts.italic) rPr.push('<w:i/>');
  if (opts.color) rPr.push(`<w:color w:val="${opts.color}"/>`);
  if (opts.size) rPr.push(`<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>`);
  const rPrXml = rPr.length ? `<w:rPr>${rPr.join('')}</w:rPr>` : '';
  return `<w:r>${rPrXml}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function pPrXml(opts) {
  opts = opts || {};
  const parts = [];
  if (opts.style) parts.push(`<w:pStyle w:val="${opts.style}"/>`);
  if (opts.align) parts.push(`<w:jc w:val="${opts.align}"/>`);
  if (opts.indent) parts.push(`<w:ind w:left="${opts.indent}" w:hanging="${opts.hanging || 0}"/>`);
  if (opts.spacing) parts.push(`<w:spacing w:before="${opts.spacing.before || 0}" w:after="${opts.spacing.after || 0}" w:line="${opts.spacing.line || 0}" w:lineRule="${opts.spacing.lineRule || 'auto'}"/>`);
  return parts.length ? `<w:pPr>${parts.join('')}</w:pPr>` : '';
}

function paraXml(runs, opts) {
  opts = opts || {};
  const runsXml = runs.map(r => typeof r === 'string' ? runXml(r) : runXml(r.text, r.opts)).join('');
  return `<w:p>${pPrXml(opts)}${runsXml}</w:p>`;
}

function headingXml(level, text) {
  return paraXml([text], { style: `Heading${level}`, spacing: { before: level === 1 ? 240 : 160, after: 120, line: 288 } });
}

function bodyXml(text, opts) {
  opts = opts || {};
  const paraOpts = { spacing: { before: 0, after: 80, line: 300 } };
  if (opts.align) paraOpts.align = opts.align;
  if (opts.indent) paraOpts.indent = opts.indent;
  return paraXml([{ text, opts: { bold: opts.bold, italic: opts.italic, color: opts.color, size: opts.size } }], paraOpts);
}

function bulletXml(text) {
  return paraXml([text], { style: 'ListBullet', spacing: { before: 0, after: 40, line: 288 } });
}

function numberedXml(text, num) {
  return paraXml([text], { style: 'ListNumber', spacing: { before: 0, after: 40, line: 288 } });
}

function codeXml(text) {
  const lines = String(text).split('\n');
  const runs = lines.map(l => runXml(l, {})).join('<w:br/>');
  return `<w:p><w:pPr>${pPrXml({ style: 'CodeBlock' })}<w:spacing w:before="0" w:after="80" w:line="240"/></w:pPr>${runs}</w:p>`;
}

function tableXml(headers, rows, colWidths) {
  const n = headers.length;
  const widths = colWidths || headers.map(() => Math.floor(9000 / n));
  const border = '<w:tblBorders>' +
    '<w:top w:val="single" w:sz="4" w:color="999999"/>' +
    '<w:left w:val="single" w:sz="4" w:color="999999"/>' +
    '<w:bottom w:val="single" w:sz="4" w:color="999999"/>' +
    '<w:right w:val="single" w:sz="4" w:color="999999"/>' +
    '<w:insideH w:val="single" w:sz="4" w:color="999999"/>' +
    '<w:insideV w:val="single" w:sz="4" w:color="999999"/></w:tblBorders>';
  const tblPr = `<w:tblPr><w:tblW w:w="0" w:type="auto"/>${border}<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
  const grid = `<w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;

  function cellXml(content, isHeader, width) {
    const cellPr = `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr>`;
    const texts = Array.isArray(content) ? content : [content];
    const paras = texts.map(t => {
      if (isHeader) return paraXml([{ text: t, opts: { bold: true } }], { align: 'center', spacing: { before: 20, after: 20, line: 260 } });
      return paraXml([t], { spacing: { before: 20, after: 20, line: 260 } });
    }).join('');
    return `<w:tc>${cellPr}${paras}</w:tc>`;
  }

  const headRow = `<w:tr>${headers.map((h, i) => cellXml(h, true, widths[i])).join('')}</w:tr>`;
  const bodyRows = rows.map(r => `<w:tr>${r.map((c, i) => cellXml(c, false, widths[i])).join('')}</w:tr>`).join('');
  return `<w:tbl>${tblPr}${grid}${headRow}${bodyRows}</w:tbl>`;
}

// ---------- 文档组装 ----------
function buildDocx({ title, blocks }) {
  // blocks: array of { type, ... }
  const content = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'h1': content.push(headingXml(1, b.text)); break;
      case 'h2': content.push(headingXml(2, b.text)); break;
      case 'h3': content.push(headingXml(3, b.text)); break;
      case 'p': content.push(bodyXml(b.text, b.opts || {})); break;
      case 'ul': content.push(bulletXml(b.text)); break;
      case 'ol': content.push(numberedXml(b.text)); break;
      case 'code': content.push(codeXml(b.text)); break;
      case 'table': content.push(tableXml(b.headers, b.rows, b.colWidths)); break;
      case 'spacer': content.push(paraXml([''], {})); break;
      default: break;
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${content.join('\n')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="宋体" w:hAnsi="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120" w:line="288" w:lineRule="auto"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:eastAsia="黑体" w:hAnsi="Cambria"/><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="1F4E4A"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100" w:line="288" w:lineRule="auto"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:eastAsia="黑体" w:hAnsi="Cambria"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="1F4E4A"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80" w:line="288" w:lineRule="auto"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:eastAsia="黑体" w:hAnsi="Cambria"/><w:b/><w:sz w:val="23"/><w:szCs w:val="23"/><w:color w:val="9C5A34"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="420" w:hanging="200"/><w:spacing w:after="40" w:line="288" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListNumber"><w:name w:val="List Number"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="420" w:hanging="200"/><w:spacing w:after="40" w:line="288" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="CodeBlock"><w:name w:val="Code Block"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="80" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="333333"/></w:rPr></w:style>
</w:styles>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>${esc(title)}</dc:title><dc:creator>数赋黔滇项目组</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">2026-08-01T00:00:00Z</dcterms:created></cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>DSH Report Generator</Application></Properties>`;

  const zip = buildZip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rels },
    { name: 'docProps/core.xml', data: coreXml },
    { name: 'docProps/app.xml', data: appXml },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/_rels/document.xml.rels', data: docRels },
    { name: 'word/styles.xml', data: stylesXml }
  ]);
  return zip;
}

module.exports = { buildDocx };
