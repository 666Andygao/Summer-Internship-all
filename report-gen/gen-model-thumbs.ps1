# gen-model-thumbs.ps1 —— 为 5 个模型生成竖版缩略图（cover 裁剪到 600x800 JPEG）
Add-Type -AssemblyName System.Drawing

$jobs = @(
  @{ src='D:\Summer Instern\模型一图片\锤揲.png'; dst='D:\Summer Instern\uploads\images\model-1.jpg' },
  @{ src='D:\Summer Instern\模型二图片\拉坯.png'; dst='D:\Summer Instern\uploads\images\model-2.jpg' },
  @{ src='D:\Summer Instern\模型三图片\塑身.png'; dst='D:\Summer Instern\uploads\images\model-3.jpg' },
  @{ src='D:\Summer Instern\模型四图片\手捏塑形.png'; dst='D:\Summer Instern\uploads\images\model-4.jpg' },
  @{ src='D:\Summer Instern\模型五图片\纺织.png'; dst='D:\Summer Instern\uploads\images\model-5.jpg' }
)

$dstW = 600; $dstH = 800
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)

foreach ($j in $jobs) {
  if (-not (Test-Path $j.src)) { Write-Output "missing: $($j.src)"; continue }
  $img = [System.Drawing.Image]::FromFile($j.src)
  $sw = $img.Width; $sh = $img.Height
  # cover 裁剪到 3:4
  $targetRatio = $dstW / $dstH   # 0.75
  $srcRatio = $sw / $sh
  if ($srcRatio -gt $targetRatio) {
    # 原图更宽：裁左右
    $cropH = $sh
    $cropW = [int]($sh * $targetRatio)
    $cropX = [int](($sw - $cropW) / 2); $cropY = 0
  } else {
    $cropW = $sw
    $cropH = [int]($sw / $targetRatio)
    $cropX = 0; $cropY = [int](($sh - $cropH) / 2)
  }
  $bmp = New-Object System.Drawing.Bitmap($cropW, $cropH)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0,0,$cropW,$cropH)),
     (New-Object System.Drawing.Rectangle($cropX,$cropY,$cropW,$cropH)),
     [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $resized = New-Object System.Drawing.Bitmap($bmp, $dstW, $dstH)
  $bmp.Dispose()
  $resized.Save($j.dst, $enc, $ep)
  $resized.Dispose(); $img.Dispose()
  Write-Output "saved $($j.dst) ($(Get-Item $j.dst).Length bytes)"
}
