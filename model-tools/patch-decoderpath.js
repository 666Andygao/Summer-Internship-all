const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const OLD = 'https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/';
const NEW = 'theme/draco/';
const files = fs.readdirSync(ROOT).filter(n => /^model.*\.html$/.test(n) && !n.includes('全屏'));
let changed = 0;
files.forEach(f => {
  const p = path.join(ROOT, f);
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes(OLD)) {
    s = s.split(OLD).join(NEW);
    fs.writeFileSync(p, s, 'utf8');
    changed++;
    console.log('patched', f);
  }
});
console.log('patched', changed, 'files');
