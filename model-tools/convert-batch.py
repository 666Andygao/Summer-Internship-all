# convert-batch.py —— 批量转 Draco GLB（model1 银饰、model5 双模型、model3 雕像）
import sys, os, time
sys.path.insert(0, 'D:/Summer Instern/model-tools/pylibs')
import trimesh
from trimesh.exchange.gltf import export_glb

JOBS = [
  # 模型一 银饰 submodel
  ('D:/Summer Instern/模型一模型/ceremonial figure 3d model/ceremonial+figure+3d+model.obj',
   'D:/Summer Instern/模型一模型/ceremonial figure 3d model/ceremonial+figure+3d+model.glb'),
  ('D:/Summer Instern/模型一模型/ornamental metal heart 3d model/ornamental+metal+heart+3d+model.obj',
   'D:/Summer Instern/模型一模型/ornamental metal heart 3d model/ornamental+metal+heart+3d+model.glb'),
  ('D:/Summer Instern/模型一模型/ornate floral crown 3d model/ornate+floral+crown+3d+model.obj',
   'D:/Summer Instern/模型一模型/ornate floral crown 3d model/ornate+floral+crown+3d+model.glb'),
  ('D:/Summer Instern/模型一模型/ornate metal bracelet 3d model/ornate+metal+bracelet+3d+model.obj',
   'D:/Summer Instern/模型一模型/ornate metal bracelet 3d model/ornate+metal+bracelet+3d+model.glb'),
  ('D:/Summer Instern/模型一模型/ornate silver necklace 3d model/ornate+silver+necklace+3d+model.obj',
   'D:/Summer Instern/模型一模型/ornate silver necklace 3d model/ornate+silver+necklace+3d+model.glb'),
  # 模型五 火草 双模型
  ('D:/Summer Instern/模型五模型/fabric roll 3d model/fabric+roll+3d+model.obj',
   'D:/Summer Instern/模型五模型/fabric roll 3d model/fabric+roll+3d+model.glb'),
  ('D:/Summer Instern/模型五模型/traditional dress 3d model/traditional+dress+3d+model.obj',
   'D:/Summer Instern/模型五模型/traditional dress 3d model/traditional+dress+3d+model.glb'),
  # 模型三 雕像（已是 glb，转 draco）
  ('D:/Summer Instern/模型三模型/stone statue 3d model.glb',
   'D:/Summer Instern/模型三模型/stone statue 3d model_draco.glb'),
]

for src, out in JOBS:
  if not os.path.exists(src):
    print('SKIP missing:', os.path.basename(src)); continue
  t0 = time.time()
  try:
    scene = trimesh.load(src, force='scene')
    b = export_glb(scene, extension_draco=True)
    open(out, 'wb').write(b)
    print('%.1fMB -> %.1fMB  %s  (%.0fs)' % (os.path.getsize(src)/1e6, len(b)/1e6, os.path.basename(out), time.time()-t0))
  except Exception as e:
    print('FAIL', os.path.basename(src), e)
print('BATCH DONE')
