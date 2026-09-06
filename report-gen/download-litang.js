const https = require('https');
const fs = require('fs');
const urls = [
  { u: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Li_Tang_-_Intimate_Scenery_of_River_and_Mountains.jpg', out: 'D:/Summer Instern/report-gen/litang-full.jpg', label: 'ORIGINAL' },
  { u: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Li_Tang_-_Intimate_Scenery_of_River_and_Mountains.jpg/3840px-Li_Tang_-_Intimate_Scenery_of_River_and_Mountains.jpg', out: 'D:/Summer Instern/report-gen/litang-3840.jpg', label: 'THUMB3840' }
];
function dl(item, cb) {
  const req = https.get(item.u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36', 'Referer': 'https://commons.wikimedia.org/' }, timeout: 180000 }, (res) => {
    if (res.statusCode >= 400) { console.log(item.label, '-> HTTP', res.statusCode); res.resume(); cb(false); return; }
    const ws = fs.createWriteStream(item.out);
    res.pipe(ws);
    ws.on('finish', () => { console.log(item.label, '-> SAVED', fs.statSync(item.out).size); cb(true); });
    ws.on('error', e => { console.log(item.label, '-> WRITE ERR', e.message); cb(false); });
  });
  req.on('timeout', () => { console.log(item.label, '-> TIMEOUT'); req.destroy(); cb(false); });
  req.on('error', (e) => { console.log(item.label, '-> ERR', e.code); cb(false); });
}
dl(urls[0], (ok) => { if (!ok) dl(urls[1], () => {}); });
