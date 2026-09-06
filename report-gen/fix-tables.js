// fix-tables.js —— 修复 content-part*.js 中 table 块的多余花括号
const fs = require('fs');
const path = require('path');

for (let i = 1; i <= 4; i++) {
  const f = path.join(__dirname, `content-part${i}.js`);
  let src = fs.readFileSync(f, 'utf8');
  const before = src;
  // 1) table 开头：{ type: 'table', {  ->  { type: 'table',
  src = src.split("{ type: 'table', {").join("{ type: 'table',");
  // 2) table 结尾（行首）：  } },  ->  },
  src = src.split('\n  } },').join('\n  },');
  // 3) 数组末尾 table 结尾：  } }\n];  ->  }\n];
  src = src.split('\n  } }\n];').join('\n  }\n];');
  if (src !== before) {
    fs.writeFileSync(f, src, 'utf8');
    console.log('fixed', path.basename(f));
  } else {
    console.log('no change', path.basename(f));
  }
}
