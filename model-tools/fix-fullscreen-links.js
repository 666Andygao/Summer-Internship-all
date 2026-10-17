const fs = require('fs');
// 1) model3_fullscreen: 加 DRACOLoader + 改 _draco.glb
let a = fs.readFileSync('D:/Summer Instern/model3_fullscreen.html', 'utf8');
a = a.replace(
  "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';",
  "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\n        import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';"
);
a = a.replace(
  "            const loader = new GLTFLoader();\n            const modelPath = '模型三模型/stone statue 3d model.glb';",
  "            const loader = new GLTFLoader();\n            const dracoLoader = new DRACOLoader();\n            dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');\n            loader.setDRACOLoader(dracoLoader);\n            const modelPath = '模型三模型/stone statue 3d model_draco.glb';"
);
fs.writeFileSync('D:/Summer Instern/model3_fullscreen.html', a, 'utf8');
console.log('model3_fullscreen fixed:', a.includes('DRACOLoader'), a.includes('_draco.glb'));

// 2) pendant fullscreen: 修正 glb 文件名
let b = fs.readFileSync('D:/Summer Instern/model1_metal_pendant_fullscreen.html', 'utf8');
b = b.replace('tripo_convert_849bd368-f9c7-4109-b019-91f94462c9e7.glb', 'ornate_metal_pendant_3d_model.glb');
fs.writeFileSync('D:/Summer Instern/model1_metal_pendant_fullscreen.html', b, 'utf8');
console.log('pendant fullscreen fixed:', b.includes('ornate_metal_pendant_3d_model.glb'));
