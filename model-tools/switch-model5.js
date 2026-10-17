// switch-model5.js —— 将 model5 双模型切换改为 Draco GLB 加载
const fs = require('fs');
const p = 'D:/Summer Instern/model5.html';
let src = fs.readFileSync(p, 'utf8');
const orig = src;

// 1) import
src = src.replace(
  /import \{ OBJLoader \} from 'three\/addons\/loaders\/OBJLoader\.js';[\s\S]*?import \{ MTLLoader \} from 'three\/addons\/loaders\/MTLLoader\.js';/,
  "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\n        import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';"
);

// 2) config: mtlPath/objPath -> glbPath（两个模型）
src = src.replace(
  /mtlPath: encodeURI\('模型五模型\/fabric roll 3d model\/fabric\+roll\+3d\+model\.mtl'\),\s*\n\s*objPath: encodeURI\('模型五模型\/fabric roll 3d model\/fabric\+roll\+3d\+model\.obj'\),/,
  "glbPath: encodeURI('模型五模型/fabric roll 3d model/fabric+roll+3d+model.glb'),"
);
src = src.replace(
  /mtlPath: encodeURI\('模型五模型\/traditional dress 3d model\/traditional\+dress\+3d\+model\.mtl'\),\s*\n\s*objPath: encodeURI\('模型五模型\/traditional dress 3d model\/traditional\+dress\+3d\+model\.obj'\),/,
  "glbPath: encodeURI('模型五模型/traditional dress 3d model/traditional+dress+3d+model.glb'),"
);

// 3) 加载块：mtlLoader... 到函数闭合前
const s = src.indexOf('const mtlLoader = new MTLLoader();');
const funcEnd = src.indexOf('        }\n\n        function animate', s); // 函数闭合 '}' 位置
const newBlock = `            const gltfLoader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
            gltfLoader.setDRACOLoader(dracoLoader);

            gltfLoader.load(config.glbPath, (gltf) => {
                const object = gltf.scene;
                console.log(config.label + ' GLB 模型加载成功');

                currentModel = object;

                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                const box = new THREE.Box3().setFromObject(currentModel);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 4 / maxDim;
                currentModel.scale.multiplyScalar(scale);

                box.setFromObject(currentModel);
                const center = box.getCenter(new THREE.Vector3());
                currentModel.position.sub(center);

                scene.add(currentModel);

                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                }, 600);
            }, (xhr) => {
                if (xhr.lengthComputable) {
                    const percent = Math.round((xhr.loaded / xhr.total) * 100);
                    const loadedMB = (xhr.loaded / 1024 / 1024).toFixed(2);
                    const totalMB = (xhr.total / 1024 / 1024).toFixed(2);
                    textEl.textContent = \`\${config.loadingText} \${percent}% (\${loadedMB}MB / \${totalMB}MB)\`;
                }
            }, (error) => {
                console.error(config.label + ' GLB 加载错误:', error);
                textEl.innerHTML = \`⚠️ \${config.label}加载失败<br><span style="font-size: 0.85em; color: #666;">请检查文件路径或刷新页面重试</span>\`;
                const sp = loadingOverlay.querySelector('.loading-spinner');
                if (sp) sp.style.borderTopColor = '#a5372f';
            });
`;

src = src.slice(0, s) + newBlock + src.slice(funcEnd);
if (src !== orig) { fs.writeFileSync(p, src, 'utf8'); console.log('SWITCHED model5'); }
else console.log('NO CHANGE model5');
