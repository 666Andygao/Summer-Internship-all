# process-image.ps1 —— 从《江山小景图》横卷中裁剪出 Hero 背景图
# 输入: report-gen/litang-full.jpg (7104x1452)
# 输出: uploads/images/hero-inkwash-bg.jpg (2400x~1089, 约 2.2:1 宽幅)
Add-Type -AssemblyName System.Drawing

$src = "D:\Summer Instern\report-gen\litang-full.jpg"
$dst = "D:\Summer Instern\uploads\images\hero-inkwash-bg.jpg"

$img = [System.Drawing.Image]::FromFile($src)
Write-Output "Source: $($img.Width) x $($img.Height)"

# 从横卷中段截取（避开两侧题跋留白，取山水主体）
$srcW = $img.Width    # 7104
$srcH = $img.Height   # 1452
$cropW = [int]($srcW * 0.45)   # 约 3196
$cropH = $srcH                  # 全高 1452
$cropX = [int]($srcW * 0.28)    # 起点 28% 处
$cropY = 0

# 目标尺寸（宽 2400，等比）
$dstW = 2400
$dstH = [int]($cropH * $dstW / $cropW)

Write-Output "Crop: X=$cropX Y=$cropY W=$cropW H=$cropH -> Resize: $dstW x $dstH"

$bmp = New-Object System.Drawing.Bitmap($cropW, $cropH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)),
    (New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)),
    [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$resized = New-Object System.Drawing.Bitmap($bmp, $dstW, $dstH)
$bmp.Dispose()

# JPEG 质量 82
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)
$resized.Save($dst, $enc, $ep)

$resized.Dispose()
$img.Dispose()
$out = Get-Item $dst
Write-Output "Saved: $($out.FullName) ($($out.Length) bytes)"
