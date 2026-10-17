// download-draco.js —— 下载 three 的 Draco 解码器到本地 theme/draco/
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/';
const FILES = ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js', 'draco_encoder.js'];
const DIR = 'D:/Summer Instern/theme/draco';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

function dl(file, cb) {
  const url = BASE + file;
  const req = https.get(url, { headers: { 'User-Agent': 'node' }, timeout: 60000 }, (res) => {
    if (res.statusCode >= 400) { console.log(file, 'HTTP', res.statusCode); res.resume(); cb(false); return; }
    const ws = fs.createWriteStream(path.join(DIR, file));
    res.pipe(ws);
    ws.on('finish', () => { console.log('downloaded', file, fs.statSync(path.join(DIR, file)).size); cb(true); });
    ws.on('error', e => { console.log('write err', e.message); cb(false); });
  });
  req.on('timeout', () => { console.log(file, 'timeout'); req.destroy(); cb(false); });
  req.on('error', (e) => { console.log(file, 'ERR', e.code); cb(false); });
}
let i = 0;
(function next() { if (i >= FILES.length) { console.log('ALL DONE'); return; } dl(FILES[i++], () => next()); })();
