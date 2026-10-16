const https = require('https');
const apiKey = "3be5dfa704d54ca0b082b5a4ded3d86e.vAxK1k4hINJ5Q0XX";
const body = JSON.stringify({
  model: "glm-4.6v-flash",
  messages: [{ role: "user", content: "请用一句话回答：1+1=?" }],
  temperature: 0.1
});
const req = https.request("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey, "Content-Length": Buffer.byteLength(body) },
  timeout: 30000
}, (res) => {
  let d = "";
  res.on("data", c => d += c);
  res.on("end", () => {
    console.log("HTTP", res.statusCode);
    console.log(d.slice(0, 800));
  });
});
req.on("timeout", () => { console.log("TIMEOUT"); req.destroy(); });
req.on("error", (e) => console.log("ERR", e.code, e.message));
req.write(body); req.end();
