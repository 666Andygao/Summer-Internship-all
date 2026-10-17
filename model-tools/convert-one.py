# convert-one.py —— 通用：OBJ/GLB -> GLB(+Draco)
# 用法: python convert-one.py <src_obj_or_glb> <out_glb> [draco]
import sys, os, time
sys.path.insert(0, 'D:/Summer Instern/model-tools/pylibs')
import trimesh
from trimesh.exchange.gltf import export_glb

src = sys.argv[1]; out = sys.argv[2]; draco = len(sys.argv) > 3 and sys.argv[3] == 'draco'
t0 = time.time()
print('loading', os.path.basename(src), '%.1f MB' % (os.path.getsize(src)/1e6))
scene = trimesh.load(src, force='scene')
print('loaded %.1fs, %d geoms' % (time.time()-t0, len(scene.geometry)))
b = export_glb(scene, extension_draco=draco)
open(out, 'wb').write(b)
print('exported %s %.1f MB (%.1f MB) ratio %.1fx, %.0fs' % (
    'DRACO' if draco else 'plain', os.path.getsize(src)/1e6, len(b)/1e6,
    os.path.getsize(src)/1e6/(len(b)/1e6), time.time()-t0))
