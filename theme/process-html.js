// process-html.js —— 批量统一古风风格：注入主题、颜色映射、字体替换、文案修复
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname); // 项目根目录（theme 的上一级）
const THEME_LINK = '<link rel="stylesheet" href="theme/gufeng.css">';

/* ---------- 颜色映射：现代彩色 → 古风淡雅色板 ---------- */
const HEX_MAP = {
  // 蓝色系 → 墨青
  '#2563eb': '#2f4f4f', '#3b82f6': '#3a5a54', '#60a5fa': '#4a6b63',
  '#1e40af': '#2a3d38', '#1d4ed8': '#2b433d', '#93c5fd': '#7a8f88',
  '#bfdbfe': '#a8bab3', '#667eea': '#2f4f4f', '#764ba2': '#5c4a3d',
  '#f093fb': '#b0806a', '#0ea5e9': '#3a5a54', '#38bdf8': '#4a6b63',
  '#7dd3fc': '#6f8f87', '#bae6fd': '#a8bab3', '#e0f2fe': '#d8e2dd',
  '#f0f9ff': '#eef3ef',
  // 绿色系 → 墨青绿
  '#059669': '#3a6b5f', '#34d399': '#4e7a6c', '#6ee7b7': '#7aa89a',
  '#a7f3d0': '#b5cdc3', '#d1fae5': '#dbe9e2', '#ecfdf5': '#eef4f0',
  '#f0fdf9': '#eef3ef',
  // 粉色系 → 朱砂 / 褐
  '#e91e63': '#a5372f', '#f48fb1': '#c07a6a', '#f8bbd0': '#d9b3a6',
  '#fce4ec': '#f0e2dd', '#fdf2f2': '#f6ecea', '#fdf2f8': '#f6ecea',
  // 黄色系 → 赭石 / 赭金
  '#fbbf24': '#b5853f', '#d97706': '#9c5a34', '#f59e0b': '#b5853f',
  '#fde68a': '#e4cd9e', '#fef3c7': '#f1e6cd', '#fffbeb': '#f7f2e7',
  '#fcd34d': '#c9a25f',
  // 红色系 → 朱砂
  '#f87171': '#b06052', '#ef4444': '#a5372f', '#fca5a5': '#d0a49b',
  '#fecaca': '#ecd2cb', '#fee2e2': '#f2e3df', '#dc2626': '#a5372f',
  '#e11d48': '#a5372f', '#fb7185': '#b06052', '#fda4af': '#c98a80',
  '#fecdd3': '#ecd8d3', '#fff1f2': '#f7efed',
  // 中性文字 / 背景
  '#2d3748': '#3a3226', '#2d3a5c': '#3a3226', '#3d4a6c': '#4a4236',
  '#6b7fa3': '#6b6255', '#1f2937': '#3a3226', '#111827': '#2a241c',
  '#4b5563': '#6b6255', '#6b7280': '#6b6255', '#374151': '#4a4236',
  '#f5f5f5': '#f7f2e7', '#f8f8f8': '#f7f2e7', '#f5f2ef': '#f6f0e4',
  '#f2ebe4': '#f6efe2', '#e8d5c4': '#e8dcc6', '#1a3d32': '#3a3226',
  '#4a3040': '#3a3226', '#5c4a1f': '#3a3226', '#5c1f2e': '#3a3226',
  '#3e2723': '#3a3226', '#f5ecd7': '#f6efdf', '#ede0c8': '#ece0c8',
  '#e2d4b8': '#e2d4b6', '#d4c4a0': '#d3c29c', '#fffaf0': '#fffdf4',
  // 背景渐变浅色 → 宣纸
  '#f0f4ff': '#f7f2e7', '#e8eeff': '#f1e8d8', '#d4e0f7': '#e6d6ba', '#b8c9ed': '#d3c29c',
  '#c7d6fe': '#e6d6ba', '#a5b4fc': '#d3c29c', '#fdf4ff': '#f7f2e7', '#fae8ff': '#f1e8d8',
  '#f5d0fe': '#e6d6ba', '#f0abfc': '#d3c29c', '#f0fdf9': '#f7f2e7', '#d1fae5': '#f1e8d8',
  '#a7f3d0': '#e6d6ba', '#6ee7b7': '#d3c29c', '#ecfdf5': '#f6f0e4',
  // 紫色点缀 → 褐紫
  '#c084fc': '#9c6a5a', '#a855f7': '#7c5a4a', '#a78bfa': '#9c6a5a',
  '#c7d2fe': '#e6d6ba', '#eef2ff': '#f7f2e7',
  // 粉红系 → 朱砂/褐粉
  '#d81b60': '#a5372f', '#db2777': '#a5372f', '#f06292': '#c07a6a',
  '#f9a8d4': '#d9b3a6', '#f472b6': '#c07a6a', '#c2185b': '#a5372f',
  // 橙黄系 → 赭石/赭金
  '#f39c12': '#b5853f', '#ffc107': '#b5853f', '#b45309': '#9c5a34',
  '#e67e6b': '#b06052',
  // 红系 → 朱砂
  '#e74c3c': '#a5372f', '#e53935': '#a5372f', '#be123c': '#8f2f28',
  '#d94f3a': '#b06052', '#b0301e': '#8f2f28', '#c0392b': '#a5372f',
  '#b14f3e': '#9c5a34', '#a83226': '#8f2f28',
  // 淡绿 → 宣纸
  '#bbf7d0': '#e6d6ba', '#f0fdf4': '#f7f2e7',
  // 灰系 → 宣纸/淡褐
  '#a0aec0': '#a89472', '#bcaaa4': '#c4b59a', '#eaeaea': '#efe4d0',
  '#ececec': '#efe4d0', '#f0f0f0': '#f7f2e7', '#ddd': '#d8cdb8',
  '#e5dcd4': '#e6dcc8', '#ede7e1': '#f1e8d8', '#efebe9': '#f1e8d8',
  '#faf8f6': '#fffdf7', '#fcf8f5': '#fffdf7', '#fcfaf8': '#fffdf7',
  '#f0ebe7': '#f1e8d8', '#f5efe9': '#f6f0e4', '#e6ddd6': '#e6dcc8',
  '#e8d7cf': '#e6dcc8', '#dccfc4': '#d8cdb8', '#e5dbd2': '#e6dcc8',
  '#d7ccc8': '#d8cdb8', '#e0d8d1': '#e6dcc8', '#ddd6cf': '#d8cdb8',
  '#e0e9ff': '#f1e8d8', '#fce8e5': '#f6ecea', '#fcded9': '#f2e3df',
  // 仪表盘特殊色
  '#4a69bd': '#2f4f4f', '#2d3436': '#243f3f', '#27ae60': '#3a6b5f',
  // 冷紫/冷灰蓝 → 褐紫/灰褐
  '#6d28d9': '#7c5a4a', '#7c3aed': '#7c5a4a', '#9333ea': '#7c5a4a',
  '#718096': '#6b6255', '#64748b': '#6b6255', '#dfe6e9': '#efe4d0',
  // 金黄/棕金 → 赭金/赭石
  '#856404': '#b5853f', '#92702a': '#b5853f', '#8b5a2b': '#9c5a34'
};

const RGB_MAP = {
  '37, 99, 235': '47, 79, 79',     // blue → 墨青
  '59, 130, 246': '58, 90, 84',
  '96, 165, 250': '74, 107, 99',
  '66, 103, 178': '79, 95, 86',
  '29, 78, 216': '43, 61, 58',
  '30, 64, 175': '42, 61, 56',
  '255, 255, 255': '255, 253, 247', // 纯白 → 米白
  '255, 250, 240': '255, 253, 247'  // 宣纸米 → 米白
};

function replaceColors(src) {
  // rgb / rgba 三元组
  src = src.replace(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)/gi, (m, r, g, b, a) => {
    const key = `${r}, ${g}, ${b}`;
    if (RGB_MAP[key]) return a !== undefined ? `rgba(${RGB_MAP[key]}, ${a})` : `rgb(${RGB_MAP[key]})`;
    return m;
  });
  // hex
  // 先修复历史误替换产生的 ## 前缀
  src = src.replace(/##([0-9a-fA-F]{3,8})/g, '#$1');
  const hexes = Object.keys(HEX_MAP).map(h => h.slice(1)).sort((x, y) => y.length - x.length);
  const hexRe = new RegExp(`#(${hexes.join('|')})`, 'gi');
  src = src.replace(hexRe, (m, g1) => HEX_MAP['#' + g1.toLowerCase()]);
  return src;
}

function replaceFonts(src) {
  return src.replace(/font-family\s*:\s*[^;}]+/g, 'font-family: var(--font-kai), var(--font-song), serif');
}

/* ---------- 文案修复 ---------- */
function fixCopy(src, name) {
  if (name === 'model2.html') {
    src = src.split('<title>牙州陶器 - 3D模型展示</title>').join('<title>建水紫陶 - 3D模型展示</title>');
    src = src.split('<h1>🏺 牙州陶器 - 传统非遗文化</h1>').join('<h1>🏺 建水紫陶 - 传统非遗文化</h1>');
    src = src.split('正在加载3D牙州陶器模型').join('正在加载3D建水紫陶模型');
    src = src.split('模型二 · 牙州陶器').join('模型二 · 建水紫陶');
    src = src.split('广东省<strong>牙州地区</strong>，被誉为"岭南陶都"')
      .join('云南省红河哈尼族彝族自治州<strong>建水县</strong>，被誉为"滇南琼玉"');
    src = src.split('牙州陶器与广东石湾陶、江西景德镇瓷并称<strong>"华南三大陶瓷"</strong>。')
      .join('建水紫陶与江苏宜兴陶、广东石湾陶、四川荣昌陶并称<strong>"中国四大名陶"</strong>。');
    src = src.split('牙州陶器历史悠久，始创于<strong>明朝永乐年间</strong>，距今已有600余年历史。其制作工艺独特，以<strong>"釉下彩绘、龙窑烧制"</strong>为核心技法，成品色泽温润、造型古朴典雅。')
      .join('建水紫陶烧制技艺于<strong>2008年列入第二批国家级非物质文化遗产代表性项目名录</strong>。其制作工艺独特，以<strong>"阴刻阳填、无釉磨光"</strong>为核心技法，成品坚实温润，素有"质如铁、亮如镜、润如玉、声如磬"之美誉。');
    src = src.split('牙州陶器以其<strong>独特的釉下彩绘艺术</strong>和精湛的龙窑烧制工艺闻名于世，具有极高的实用价值和收藏价值。')
      .join('建水紫陶以其<strong>独特的"残帖"装饰艺术</strong>和精湛的无釉磨光工艺闻名于世，具有极高的实用价值和收藏价值。');
    src = src.split('✨ 华南三大陶瓷').join('✨ 中国四大名陶');
    src = src.split('查看牙州陶器制作流程').join('查看建水紫陶制作流程');
    src = src.split('牙州陶器').join('建水紫陶');
  }
  if (name === 'model2_fullscreen.html') {
    src = src.split('<title>牙州陶器 - 全屏展示</title>').join('<title>建水紫陶 - 全屏展示</title>');
    src = src.split('牙州陶器').join('建水紫陶');
  }
  if (name === 'model4.html') {
    src = src.split('正在加载3D彝族漆器模型').join('正在加载3D黄平泥哨模型');
  }
  if (name === 'model4_fullscreen.html') {
    src = src.split('<title>彝族漆器髹饰技艺 - 全屏展示</title>').join('<title>黄平泥哨 - 全屏展示</title>');
    src = src.split('彝族漆器髹饰技艺').join('黄平泥哨');
    src = src.split('彝族漆器').join('黄平泥哨');
  }
  return src;
}

/* ---------- 主流程 ---------- */
const BACKUP_DIR = path.join(ROOT, 'theme', 'backup');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
let changed = 0;
for (const f of files) {
  const p = path.join(ROOT, f);
  let src = fs.readFileSync(p, 'utf8');
  const orig = src;
  // 0) 备份原文件
  fs.writeFileSync(path.join(BACKUP_DIR, f), orig, 'utf8');
  // 1) 文案修复
  src = fixCopy(src, f);
  // 2) 颜色映射
  src = replaceColors(src);
  // 3) 字体替换
  src = replaceFonts(src);
  // 4) 注入主题（仅一次）
  if (!src.includes('theme/gufeng.css')) {
    src = src.replace('</head>', `  ${THEME_LINK}\n</head>`);
  }
  if (src !== orig) {
    fs.writeFileSync(p, src, 'utf8');
    changed++;
    console.log('processed:', f);
  } else {
    console.log('unchanged:', f);
  }
}
console.log(`\nDone. ${changed}/${files.length} files changed.`);
