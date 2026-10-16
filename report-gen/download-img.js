// download-img.js —— 尝试从 Wikimedia 下载《溪山清远图》高清缩略图
const https = require('https');
const fs = require('fs');

const url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/%E6%BA%AA%E5%B1%B1%E6%B8%85%E8%BF%9C%E5%9B%BE.jpg/8000px-%E6%BA%AA%E5%B1%B1%E6%B8%85%E8%BF%9C%E5%9B%BE.jpg';
const out = 'D:/Summer Instern/report-gen/xia-gui-8000.jpg';

const req = https.get(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' },
  timeout: 60000
}, (res) => {
  if (res.statusCode >= 400) { console.log('HTTP', res.statusCode); res.resume(); return; }
  const len = parseInt(res.headers['content-length'] || '0', 10);
  console.log('status', res.statusCode, 'type', res.headers['content-type'], 'bytes', len);
  const ws = fs.createWriteStream(out);
  res.pipe(ws);
  ws.on('finish', () => console.log('SAVED', out, fs.statSync(out).size));
  ws.on('error', e => console.log('WRITE ERR', e.message));
});
req.on('timeout', () => { console.log('TIMEOUT'); req.destroy(); });
req.on('error', (e) => console.log('REQ ERR', e.code, e.message));
