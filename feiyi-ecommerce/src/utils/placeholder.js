/*
 * 占位图生成工具
 * 说明：项目脱离后端也需完整展示，故用纯前端生成 SVG 占位图（data URI），
 *       无需任何图片资源、无需联网即可显示，配色贴合国风。
 *       后端接入真实商品图后，可直接用后端返回的图片 URL 替换本工具。
 */

// 国风底色（与商品实拍图的色调协调）
const PALETTE = [
  { bg: '#1f4e4a', fg: '#f6f2ea' }, // 深青
  { bg: '#9c5a34', fg: '#f6f2ea' }, // 赭石
  { bg: '#3e5c58', fg: '#f6f2ea' }, // 黛青
  { bg: '#8a6d3b', fg: '#f6f2ea' }, // 秋香
  { bg: '#6b4226', fg: '#f6f2ea' }  // 檀褐
]

/**
 * 生成器物占位图
 * @param {string} text  图面主体文字（一般为器物名/民族）
 * @param {number} seed  用于挑选配色的整数（如商品 id）
 * @param {number} w     宽
 * @param {number} h     高
 * @returns {string} data:image/svg+xml 数据地址
 */
export function placeholderImage(text = '非遗', seed = 0, w = 600, h = 600) {
  const c = PALETTE[Math.abs(seed) % PALETTE.length]
  // 简单的对角纹样 + 居中文字，模拟器物图卡片
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c.bg}"/>
        <stop offset="1" stop-color="${shade(c.bg, -18)}"/>
      </linearGradient>
      <pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="40" height="40" fill="none"/>
        <path d="M0 20 H40" stroke="${c.fg}" stroke-opacity="0.06" stroke-width="2"/>
      </pattern>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <rect width="${w}" height="${h}" fill="url(#p)"/>
    <rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none"
          stroke="${c.fg}" stroke-opacity="0.35" stroke-width="2"/>
    <text x="50%" y="50%" fill="${c.fg}" font-size="${Math.round(w / 8)}"
          font-family="STZhongsong, SimSun, serif" font-weight="700"
          text-anchor="middle" dominant-baseline="middle"
          letter-spacing="4">${escapeXml(text)}</text>
  </svg>`
  // 用 encodeURIComponent 编码，兼容中文
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`
}

// 调整十六进制颜色明暗
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const r = clamp((n >> 16) + amt)
  const g = clamp(((n >> 8) & 0xff) + amt)
  const b = clamp((n & 0xff) + amt)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
function clamp(v) {
  return Math.max(0, Math.min(255, v))
}
// 转义 XML 特殊字符，避免文字破坏 SVG
function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (ch) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch]
  ))
}
