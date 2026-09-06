const fs=require('fs');const zlib=require('zlib');
function parseZip(buf){let e=-1;for(let i=buf.length-22;i>=0;i--){if(buf.readUInt32LE(i)===0x06054b50){e=i;break}}const n=buf.readUInt16LE(e+10);const cd=buf.readUInt32LE(e+16);const out=[];let p=cd;for(let i=0;i<n;i++){const m=buf.readUInt16LE(p+10);const cs=buf.readUInt32LE(p+20);const nl=buf.readUInt16LE(p+28);const el=buf.readUInt16LE(p+30);const cl=buf.readUInt16LE(p+32);const lo=buf.readUInt32LE(p+42);const name=buf.toString("utf8",p+46,p+46+nl);out.push({name,m,cs,lo});p+=46+nl+el+cl}const r={};for(const e of out){const lh=e.lo;const ln=buf.readUInt16LE(lh+26);const le=buf.readUInt16LE(lh+28);const s=lh+30+ln+le;const d=buf.slice(s,s+e.cs);r[e.name]=e.m===0?d:zlib.inflateRawSync(d)}return r}
const xml=parseZip(fs.readFileSync(process.argv[2]))["word/document.xml"].toString("utf8");
const tbl=xml.match(/<w:tbl[ >][\s\S]*?<\/w:tbl>/)[0];
// 打印每个 tc 的索引 + 文本 + 长度，便于定位
const tcs=tbl.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g)||[];
console.log("total tc:",tcs.length);
tcs.forEach((tc,i)=>{
  const t=(tc.match(/<w:t[^>]*>[^<]*<\/w:t>/g)||[]).map(x=>x.replace(/<[^>]+>/g,"")).join("").trim();
  console.log("TC"+i+" ["+(t||"(empty)")+"] len="+(t?t.length:0));
});
// 打印 R4（主要事迹）完整 xml
const rows=tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g)||[];
console.log("\n===== ROW 4 RAW (主要事迹) =====");
console.log(rows[3]);
