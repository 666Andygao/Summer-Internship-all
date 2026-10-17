// enhance-models.js — 为模型详情页增强：返回栏 / 信息标签页 / 相关模型推荐
// 用法: node enhance-models.js model1 model2 ...  (默认全部 model1-5)
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname); // 项目根目录

const MODELS = {
  model1: { name: '苗族银饰锻造技艺', file: 'model1.html', img: 'model-1.jpg' },
  model2: { name: '建水紫陶烧制技艺', file: 'model2.html', img: 'model-2.jpg' },
  model3: { name: '云南瓦猫', file: 'model3.html', img: 'model-3.jpg' },
  model4: { name: '黄平泥哨制作技艺', file: 'model4.html', img: 'model-4.jpg' },
  model5: { name: '火草纺织工艺', file: 'model5.html', img: 'model-5.jpg' }
};

const backBar = `<div class="model-back-bar">
  <a href="model.html">← 返回数字馆</a>
  <span class="crumb">数字馆 / <b>__TITLE__</b></span>
</div>`;

const tabsJS = `
<script>
(function(){
  var content = document.querySelector('.info-content-scrollable');
  var infoSec = document.querySelector('.info-section');
  if(!content || !infoSec) return;
  var blocks = Array.prototype.slice.call(content.children);
  var g = { archive: [], process: [], story: [] };
  blocks.forEach(function(b){
    if(b.classList.contains('features-grid')){ g.story.push(b); return; }
    var ti = b.querySelector('.info-block-title');
    var t = ti ? ti.textContent : '';
    // 优先匹配工艺/流程/简介（含工艺流程的简介块归工艺流程），其次档案，其余归故事
    if(/工艺|流程|制作|步骤|材料|技法|工序|简介|步骤/.test(t)) g.process.push(b);
    else if(/地区|分布|产地|等级|民族|历史|档案|概述|名称|名录/.test(t)) g.archive.push(b);
    else g.story.push(b);
  });
  var tabs = document.createElement('div');
  tabs.className = 'model-tabs';
  var labels = [['archive','非遗档案'],['process','工艺流程'],['story','文化故事']];
  labels.forEach(function(L){
    var b = document.createElement('button');
    b.className = 'mtab' + (L[0]==='archive'?' active':'');
    b.textContent = L[1];
    b.setAttribute('data-tab', L[0]);
    tabs.appendChild(b);
  });
  var panWrap = document.createElement('div');
  labels.forEach(function(L){
    var p = document.createElement('div');
    p.className = 'model-tab-panel' + (L[0]==='archive'?' active':'');
    p.setAttribute('data-panel', L[0]);
    g[L[0]].forEach(function(el){ p.appendChild(el); });
    panWrap.appendChild(p);
  });
  infoSec.insertBefore(tabs, content);
  infoSec.insertBefore(panWrap, content);
  content.style.display = 'none';
  tabs.addEventListener('click', function(e){
    var t = e.target.closest('.mtab'); if(!t) return;
    tabs.querySelectorAll('.mtab').forEach(function(x){ x.classList.remove('active'); });
    t.classList.add('active');
    panWrap.querySelectorAll('.model-tab-panel').forEach(function(x){ x.classList.remove('active'); });
    var panel = panWrap.querySelector('[data-panel="' + t.getAttribute('data-tab') + '"]');
    if(panel) panel.classList.add('active');
  });
})();
</script>`;

function relatedHTML(selfKey) {
  const items = Object.keys(MODELS).filter(k => k !== selfKey);
  const cards = items.map(k => `<a class="related-card" href="${MODELS[k].file}" style="background-image:url('uploads/images/${MODELS[k].img}')"><span class="rc-label">${MODELS[k].name}</span></a>`).join('');
  return `<div class="related-models">
  <div class="rel-head"><div><span class="rel-en">Related Heritage</span><h3>相关 · 非遗模型</h3></div></div>
  <div class="rel-grid">${cards}</div>
</div>`;
}

function enhance(key) {
  const m = MODELS[key];
  const p = path.join(ROOT, m.file);
  let src = fs.readFileSync(p, 'utf8');
  const original = src;

  // 1) 注入 model-ui.css
  if (!src.includes('theme/model-ui.css')) {
    src = src.replace('</head>', '  <link rel="stylesheet" href="theme/model-ui.css">\n</head>');
  }
  // 2) 顶部返回栏（body 开头、<header> 之前）
  if (!src.includes('model-back-bar')) {
    const bb = backBar.replace('__TITLE__', m.name);
    src = src.replace(/<body>\s*(\s*<header>)?/i, function(_, h){ return '<body>\n' + bb + '\n' + (h || ''); });
  }
  // 3) 标签页 JS（body 关闭前, </script>\n</body> 前 —— 简单插在 </body> 前）
  if (!src.includes('data-panel="archive"')) {
    src = src.replace('</body>', tabsJS + '\n</body>');
  }
  // 4) 相关推荐（</body> 前，在标签 JS 之后）
  if (!src.includes('related-models')) {
    src = src.replace('</body>', relatedHTML(key) + '\n</body>');
  }
  if (src !== original) {
    fs.writeFileSync(p, src, 'utf8');
    console.log('enhanced:', m.file);
  } else {
    console.log('unchanged:', m.file);
  }
}

const args = process.argv.slice(2);
const targets = args.length ? args : Object.keys(MODELS);
targets.forEach(t => { if (MODELS[t]) enhance(t); });
