const https=require('https');
const urls=[
 ['npmjs','https://registry.npmjs.org/mysql2'],
 ['npmmirror','https://registry.npmmirror.com/mysql2'],
 ['tencent','https://mirrors.cloud.tencent.com/npm/mysql2'],
 ['jsdelivr','https://cdn.jsdelivr.net/npm/mysql2/package.json']
];
function check(name,u,cb){
  const t=setTimeout(()=>{console.log(name,'TIMEOUT');cb();},15000);
  const r=https.get(u,{timeout:15000,headers:{'User-Agent':'node'}},res=>{
    clearTimeout(t); console.log(name,'HTTP',res.statusCode); res.resume(); cb();
  });
  r.on('error',e=>{clearTimeout(t);console.log(name,'ERR',e.code);cb();});
}
let i=0;(function next(){if(i>=urls.length)return;const it=urls[i++];check(it[0],it[1],()=>next());})();
