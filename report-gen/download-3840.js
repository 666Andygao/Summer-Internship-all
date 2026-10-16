const https = require('https');
const fs = require('fs');
const url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/%E6%BA%AA%E5%B1%B1%E6%B8%85%E8%BF%9C%E5%9B%BE.jpg/3840px-%E6%BA%AA%E5%B1%B1%E6%B8%85%E8%BF%9C%E5%9B%BE.jpg';
const out = 'D:/Summer Instern/report-gen/xia-gui-3840.jpg';
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/126.0' }, timeout: 90000 }, (res) => {
  if (res.statusCode >= 400) { console.log('HTTP', res.statusCode); res.resume(); return; }
  console.log('status', res.statusCode, 'bytes', res.headers['content-length']);
  const ws = fs.createWriteStream(out);
  res.pipe(ws);
  ws.on('finish', () => console.log('SAVED', fs.statSync(out).size));
  ws.on('error', e => console.log('WRITE ERR', e.message));
}).on('error', (e) => console.log('REQ ERR', e.code, e.message));
