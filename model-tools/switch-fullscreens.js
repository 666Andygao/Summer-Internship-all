// switch-fullscreens.js —— 批量把 fullscreen 全屏页改为 GLTF+DRACO(GLB)
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname); // 项目根

const files = fs.readdirSync(ROOT).filter(n => /model.*_fullscreen\.html$/.test(n));

files.forEach(f => {
  const p = path.join(ROOT, f);
  let src = fs.readFileSync(p, 'utf8');
  const orig = src;

  // 1) import
  src = src.replace(
    /import \{ OBJLoader \} from 'three\/addons\/loaders\/OBJLoader\.js';[\s\S]*?import \{ MTLLoader \} from 'three\/addons\/loaders\/MTLLoader\.js';/,
    "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\n        import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';"
  );

  // 2) 从 objPath 推导 glbPath
  const mp = src.match(/encodeURI\('([^']+\.obj)'\)/);
  if (!mp) { console.log('NO OBJ in', f); return; }
  const glb = mp[1].replace(/\.obj$/, '.glb');

  // 3) 定位加载块（从 const mtlLoader 到 loadModel 内最后一个 });）
  const s = src.indexOf('const mtlLoader = new MTLLoader();');
  if (s < 0) { console.log('NO mtlLoader in', f); return; }
  const animEnd = src.indexOf('function animate', s);
  const blockEnd = (animEnd > s ? src.lastIndexOf('});', animEnd) : src.lastIndexOf('});')) + '});'.length;

  const newBlock = `            const gltfLoader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
            gltfLoader.setDRACOLoader(dracoLoader);
            const glbPath = encodeURI('${glb}');

            gltfLoader.load(glbPath, (gltf) => {
                const object = gltf.scene;
                object.traverse((child) => {
                    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
                });
                const box = new THREE.Box3().setFromObject(object);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                object.scale.multiplyScalar(4.5 / maxDim);
                box.setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());
                object.position.sub(center);
                scene.add(object);
                setTimeout(() => { loadingOverlay.classList.add('hidden'); }, 600);
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
                    textEl.innerHTML = '⚠️ 模型加载失败<br><span style="font-size: 0.88em; color: #666; margin-top: 8px; display: block;">请检查文件路径或返回重试</span>';
                }
                const sp = loadingOverlay.querySelector('.spinner') || loadingOverlay.querySelector('.loading-spinner');
                if (sp) sp.style.borderTopColor = '#a5372f';
            });
`;

  src = src.slice(0, s) + newBlock + src.slice(blockEnd);
  if (src !== orig) { fs.writeFileSync(p, src, 'utf8'); console.log('OK', f, '->', glb); }
  else console.log('NO CHANGE', f);
});
