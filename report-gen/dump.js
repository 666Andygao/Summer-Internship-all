const fs=require('fs');const zlib=require('zlib');
function parseZip(buf){let e=-1;for(let i=buf.length-22;i>=0;i--){if(buf.readUInt32LE(i)===0x06054b50){e=i;break}}const n=buf.readUInt16LE(e+10);const cd=buf.readUInt32LE(e+16);const out=[];let p=cd;for(let i=0;i<n;i++){const m=buf.readUInt16LE(p+10);const cs=buf.readUInt32LE(p+20);const nl=buf.readUInt16LE(p+28);const el=buf.readUInt16LE(p+30);const cl=buf.readUInt16LE(p+32);const lo=buf.readUInt32LE(p+42);const name=buf.toString("utf8",p+46,p+46+nl);out.push({name,m,cs,lo});p+=46+nl+el+cl}const r={};for(const e of out){const lh=e.lo;const ln=buf.readUInt16LE(lh+26);const le=buf.readUInt16LE(lh+28);const s=lh+30+ln+le;const d=buf.slice(s,s+e.cs);r[e.name]=e.m===0?d:zlib.inflateRawSync(d)}return r}
const xml=parseZip(fs.readFileSync(process.argv[2]))["word/document.xml"].toString("utf8");
console.log("len",xml.length);
console.log("has w:tbl:",xml.includes("<w:tbl"));
console.log("has w:tr:",xml.includes("<w:tr"));
console.log("has w:tc:",xml.includes("<w:tc"));
console.log("has w:t ",xml.includes("<w:t>"));
// 打印前 1500 字符
console.log("----HEAD----");
console.log(xml.slice(0,1500));
