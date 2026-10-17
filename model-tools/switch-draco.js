// switch-draco.js —— 通用：把 model 页的 OBJ/MTL 加载改为 GLTF+DRACO(GLB)
// 用法: node switch-draco.js <html> <glb_path> <模型名>
const fs = require('fs');
const [,, file, glb, name] = process.argv;
let src = fs.readFileSync(file, 'utf8');
const orig = src;

// 1) import 替换
src = src.replace(
  /import \{ OBJLoader \} from 'three\/addons\/loaders\/OBJLoader\.js';[\s\S]*?import \{ MTLLoader \} from 'three\/addons\/loaders\/MTLLoader\.js';/,
  "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\n        import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';"
);

// 2) 加载块替换
const s = src.indexOf('const mtlLoader = new MTLLoader();');
if (s < 0) { console.log('no mtlLoader anchor in', file); return; }
const endIdx = src.indexOf('            function animate', s);
const blockEnd = src.lastIndexOf('});', endIdx) + '});'.length;

const N = name;
const newBlock = `            const gltfLoader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
            gltfLoader.setDRACOLoader(dracoLoader);
            const glbPath = encodeURI('${glb}');

            gltfLoader.load(glbPath, (gltf) => {
                const object = gltf.scene;
                console.log('${N} GLB 模型加载成功');

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
                        textEl.textContent = \`正在加载3D模型... \${percent}% (\${loadedMB}MB / \${totalMB}MB)\`;
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
if (src !== orig) { fs.writeFileSync(file, src, 'utf8'); console.log('SWITCHED', file); }
else console.log('NO CHANGE', file);
