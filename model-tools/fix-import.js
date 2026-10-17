const fs = require('fs');
const p = 'D:/Summer Instern/model2.html';
let s = fs.readFileSync(p, 'utf8');
const before = s;
// 替换 OBJ/MTL import 为 GLTF import
s = s.replace(
  /import \{ OBJLoader \} from 'three\/addons\/loaders\/OBJLoader\.js';[\s\S]*?import \{ MTLLoader \} from 'three\/addons\/loaders\/MTLLoader\.js';/,
  "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';"
);
if (s !== before) {
  fs.writeFileSync(p, s, 'utf8');
  console.log('import replaced:', s.includes('import { GLTFLoader }'),
    '| MTL removed:', !s.includes('MTLLoader'),
    '| OBJ removed:', !s.includes('OBJLoader'));
} else {
  console.log('no import change');
}
