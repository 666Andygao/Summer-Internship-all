const fs = require('fs');
const p = 'D:/Summer Instern/model3_fullscreen.html';
let s = fs.readFileSync(p, 'utf8');
const old = /const loader = new GLTFLoader\(\);\s*\r?\n\s*const modelPath = '模型三模型\/stone statue 3d model\.glb';/;
const neu = "const loader = new GLTFLoader();\n            const dracoLoader = new DRACOLoader();\n            dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');\n            loader.setDRACOLoader(dracoLoader);\n            const modelPath = '模型三模型/stone statue 3d model_draco.glb';";
s = s.replace(old, neu);
fs.writeFileSync(p, s, 'utf8');
console.log('model3_fullscreen _draco.glb:', s.includes('_draco.glb'), '| dracoLoader:', s.includes('DRACOLoader'));
