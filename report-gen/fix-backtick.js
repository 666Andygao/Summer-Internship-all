const fs=require('fs');
const files=fs.readdirSync('D:/Summer Instern').filter(n=> /model.*(fullscreen|submodels)\.html$/.test(n));
let fix=0;
for(const f of files){
  const p='D:/Summer Instern/'+f;
  let c=fs.readFileSync(p,'utf8');
  // 移除 PowerShell 注入产生的字面 "`n"（反引号+n）
  const before=c.length;
  c=c.split('\u0060n').join('');       // 反引号 + n 字面
  c=c.split('&gt;`n&lt;/head&gt;').join('>');
  if(c.length!==before){ fs.writeFileSync(p,c,'utf8'); fix++; console.log('cleaned',f); }
}
console.log('done, fixed',fix);
