// switch-model2.js —— 将 model2 的 OBJ/MTL 加载改为 GLTF 加载（使用转换后的 .glb）
const fs = require('fs');
const p = 'D:/Summer Instern/model2.html';
let src = fs.readFileSync(p, 'utf8');
const orig = src;

// 1) 替换 import：OBJLoader/MTLLoader -> GLTFLoader
src = src.replace(
  "        import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';\n        import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';",
  "        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';"
);

// 2) 替换加载块（从 const mtlLoader 到 function animate 前的 });）
const sMarker = 'const mtlLoader = new MTLLoader();';
const s = src.indexOf(sMarker);
const endMarker = '            function animate';
const endIdx = src.indexOf(endMarker, s);
const blockEnd = src.lastIndexOf('});', endIdx) + '});'.length;

const newBlock = `            const gltfLoader = new GLTFLoader();
            const glbPath = encodeURI('模型二模型/ceramic vase 3d model/ceramic+vase+3d+model.glb');

            gltfLoader.load(glbPath, (gltf) => {
                const object = gltf.scene;
                console.log('建水紫陶GLB模型加载成功');

                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                const box = new THREE.Box3().setFromObject(object);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 4 / maxDim;
                object.scale.multiplyScalar(scale);

                box.setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());
                object.position.sub(center);

                scene.add(object);

                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                }, 600);
            }, (xhr) => {
                if (xhr.lengthComputable) {
                    const percent = Math.round((xhr.loaded / xhr.total) * 100);
                    const textEl = loadingOverlay.querySelector('.loading-text');
                    if (textEl) {
                        const loadedMB = (xhr.loaded / 1024 / 1024).toFixed(2);
                        const totalMB = (xhr.total / 1024 / 1024).toFixed(2);
                        textEl.textContent = \`正在加载3D建水紫陶模型... \${percent}% (\${loadedMB}MB / \${totalMB}MB)\`;
                    }
                }
            }, (error) => {
                console.error('GLB模型加载错误:', error);
                const textEl = loadingOverlay.querySelector('.loading-text');
                if (textEl) {
                    textEl.innerHTML = '⚠️ 模型加载失败<br><span style="font-size: 0.85em; color: #666;">请检查文件路径或刷新页面重试</span>';
                }
                const spinnerEl = loadingOverlay.querySelector('.loading-spinner');
                if (spinnerEl) spinnerEl.style.borderTopColor = '#a5372f';
            });
`;

src = src.slice(0, s) + newBlock + src.slice(blockEnd);

if (src !== orig) {
  fs.writeFileSync(p, src, 'utf8');
  console.log('model2 switched to GLB OK');
} else {
  console.log('NO CHANGE');
}
