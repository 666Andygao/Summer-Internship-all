const https=require('https');
const urls=[
 ['npmjs','https://registry.npmjs.org/obj2gltf'],
 ['npmmirror','https://registry.npmmirror.com/obj2gltf'],
 ['jsdelivr','https://cdn.jsdelivr.net/npm/obj2gltf/package.json']
];
function check(name,u,cb){
  const t=setTimeout(()=>{console.log(name,'TIMEOUT');cb();},20000);
  const r=https.get(u,{timeout:20000,headers:{'User-Agent':'node'}},res=>{
    clearTimeout(t); console.log(name,'HTTP',res.statusCode,'len',res.headers['content-length']||'?'); res.resume(); cb();
  });
  r.on('error',e=>{clearTimeout(t);console.log(name,'ERR',e.code);cb();});
}
let i=0;
(function next(){ if(i>=urls.length)return; const it=urls[i++]; check(it[0],it[1],()=>next()); })();
