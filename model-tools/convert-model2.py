# convert-model2.py —— 把 model2 陶瓷 OBJ+MTL 转为 GLB（保留 baseColor 贴图）
import sys
sys.path.insert(0, 'D:/Summer Instern/model-tools/pylibs')
import trimesh, os, time

obj = r'D:/Summer Instern/模型二模型/ceramic vase 3d model/ceramic+vase+3d+model.obj'
out = r'D:/Summer Instern/模型二模型/ceramic vase 3d model/ceramic+vase+3d+model.glb'

t0 = time.time()
print('loading OBJ (may take a while)...', os.path.getsize(obj)/1e6, 'MB')
scene = trimesh.load(obj, force='scene')
print('loaded in %.1fs, %d geometries' % (time.time()-t0, len(scene.geometry)))

# 导出 glb（内嵌贴图/材质）
scene.export(out)
gb = os.path.getsize(out)/1e6
print('exported GLB: %.1f MB' % gb)
print('original OBJ: %.1f MB -> GLB: %.1f MB  (ratio %.2fx)' % (os.path.getsize(obj)/1e6, gb, os.path.getsize(obj)/1e6/gb))
