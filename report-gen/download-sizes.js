const https = require('https');
const fs = require('fs');
const base = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/%E6%BA%AA%E5%B1%B1%E6%B8%85%E8%BF%9C%E5%9B%BE.jpg/';
function tryGet(px, cb) {
  const url = base + px + 'px-%E6%BA%AA%E5%B1%B1%E6%B8%85%E8%BF%9C%E5%9B%BE.jpg';
  const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/126.0' }, timeout: 120000 }, (res) => {
    if (res.statusCode >= 400) { console.log(px + 'px -> HTTP ' + res.statusCode); res.resume(); cb(null); return; }
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      const buf = Buffer.concat(chunks);
      console.log(px + 'px -> OK ' + buf.length + ' bytes');
      cb(buf);
    });
  });
  req.on('error', (e) => { console.log(px + 'px -> ERR ' + e.code); cb(null); });
}
const sizes = [5000, 6000, 7000, 9000, 12000, 16000];
let i = 0;
function next() {
  if (i >= sizes.length) { console.log('ALL DONE'); return; }
  const px = sizes[i++];
  tryGet(px, (buf) => {
    if (buf) {
      fs.writeFileSync('D:/Summer Instern/report-gen/xia-gui-' + px + '.jpg', buf);
      console.log('saved xia-gui-' + px + '.jpg');
      // 一旦成功就停下（优先最大可用的）
      console.log('STOPPING at ' + px + 'px');
      return;
    }
    next();
  });
}
next();
