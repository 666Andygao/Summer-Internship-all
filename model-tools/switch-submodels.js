const fs = require('fs');
const p = 'D:/Summer Instern/model1_submodels.html';
let src = fs.readFileSync(p, 'utf8');
const orig = src;

// 1) import
src = src.replace(
  /import \{ OBJLoader \} from 'three\/addons\/loaders\/OBJLoader\.js';[\s\S]*?import \{ MTLLoader \} from 'three\/addons\/loaders\/MTLLoader\.js';/,
  "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\n        import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';"
);

// 2) config: mtlPath/objPath -> glbPath（5 个，.obj->.glb；pendant 特判）
function glbFor(obj) {
  if (obj.includes('tripo_convert')) return obj.replace(/tripo_convert_[a-z0-9-]+\.obj/, 'ornate_metal_pendant_3d_model.glb');
  return obj.replace(/\.obj$/, '.glb');
}
src = src.replace(/mtlPath: encodeURI\('([^']+\.mtl)'\),\s*\r?\n\s*objPath: encodeURI\('([^']+\.obj)'\),/g,
  (m, mtl, obj) => `glbPath: encodeURI('${glbFor(obj)}'),`);

// 3) loadModelToPreview + loadOBJ -> GLTF 单函数
const s = src.indexOf('function loadModelToPreview(modelId) {');
const e = src.indexOf('function showPlaceholder', s);
const newFn = `function loadModelToPreview(modelId) {
            const config = modelConfigs[modelId];
            if (!config || !config.glbPath) {
                showPlaceholder(modelId);
                return;
            }
            const loadingEl = document.getElementById(\`loading_\${modelId}\`);
            const sceneData = previewScenes[modelId];
            if (!sceneData) return;

            const gltfLoader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
            gltfLoader.setDRACOLoader(dracoLoader);

            gltfLoader.load(config.glbPath, (gltf) => {
                const object = gltf.scene;
                const box = new THREE.Box3().setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());
                object.position.sub(center);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                object.scale.setScalar(2 / maxDim);
                sceneData.scene.add(object);
                if (loadingEl) loadingEl.classList.add('hidden');
            }, (xhr) => {
                console.log(\`Loading \${modelId}...\`);
            }, (error) => {
                console.error(\`Error loading \${modelId}:\`, error);
                if (loadingEl) loadingEl.classList.add('hidden');
                showPlaceholder(modelId);
            });
        }

        `;
src = src.slice(0, s) + newFn + src.slice(e);

if (src !== orig) { fs.writeFileSync(p, src, 'utf8'); console.log('SWITCHED submodels'); }
else console.log('NO CHANGE submodels');
