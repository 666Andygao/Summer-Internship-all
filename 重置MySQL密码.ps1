# ============================================================
#  MySQL Root 密码重置工具（需管理员权限）
#  用法：双击「一键重置密码.bat」，或右键它选择"以管理员身份运行"
# ============================================================
$ErrorActionPreference = 'Continue'
$Host.UI.RawUI.WindowTitle = 'MySQL 密码重置工具'

Write-Host ''
Write-Host '============================================' -ForegroundColor Cyan
Write-Host '   MySQL Root 密码重置工具' -ForegroundColor Cyan
Write-Host '============================================' -ForegroundColor Cyan
Write-Host ''

# ---------- 0. 管理员权限检查 ----------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host '[错误] 需要管理员权限！' -ForegroundColor Red
    Write-Host '请右键「一键重置密码.bat」→ 选择"以管理员身份运行"' -ForegroundColor Yellow
    Read-Host '按回车退出'
    exit 1
}
Write-Host '[✓] 管理员权限检查通过' -ForegroundColor Green

# ---------- 1. 定位 MySQL 服务 ----------
$svc = Get-CimInstance Win32_Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'MySQL' }
if (-not $svc) {
    Write-Host '[错误] 未找到名为 MySQL 的服务，请手动确认服务名（sc query | findstr /i mysql）' -ForegroundColor Red
    Read-Host '按回车退出'
    exit 1
}
$pathName = $svc.PathName
Write-Host "[✓] 找到服务 MySQL，状态: $($svc.State)"
Write-Host "    命令行: $pathName"

# ---------- 2. 解析 mysqld.exe 与配置文件 ----------
$exeMatch = [regex]::Match($pathName, '^\s*"([^"]+)"')
if ($exeMatch.Success) { $exe = $exeMatch.Groups[1].Value }
else { $exe = ($pathName -split '\s+')[0] }

$df = $null
$dfMatch = [regex]::Match($pathName, '--defaults-file=("([^"]+)"|([^\s]+))')
if ($dfMatch.Success) {
    if ($dfMatch.Groups[2].Success) { $df = $dfMatch.Groups[2].Value } else { $df = $dfMatch.Groups[3].Value }
}

Write-Host "[✓] mysqld 路径: $exe"
if ($df) { Write-Host "[✓] 配置文件: $df" } else { Write-Host '[!] 未解析到 --defaults-file，将使用默认配置' -ForegroundColor Yellow }

if (-not (Test-Path $exe)) {
    Write-Host "[错误] 找不到 $exe" -ForegroundColor Red
    Read-Host '按回车退出'; exit 1
}

# ---------- 3. 检查 SQL 脚本 ----------
$sqlFile = Join-Path $PSScriptRoot '重置MySQL密码.sql'
if (-not (Test-Path $sqlFile)) {
    Write-Host "[错误] 缺少文件: $sqlFile" -ForegroundColor Red
    Read-Host '按回车退出'; exit 1
}
Write-Host "[✓] 重置脚本: $sqlFile"
Write-Host ''
Write-Host '即将开始重置，过程约 30 秒...' -ForegroundColor Yellow
Write-Host ''

# ---------- 4. 停止服务 ----------
Write-Host '[1/5] 停止 MySQL 服务...' -ForegroundColor Yellow
Stop-Service -Name 'MySQL' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Get-Process mysqld -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host '      已停止'

# ---------- 5. 以 init-file 方式启动并执行重置 ----------
Write-Host '[2/5] 启动临时实例并执行密码重置...' -ForegroundColor Yellow
$argList = @()
if ($df) { $argList += "--defaults-file=$df" }
$argList += "--init-file=$sqlFile"
Write-Host "      参数: $($argList -join ' ')"

$proc = Start-Process -FilePath $exe -ArgumentList $argList -PassThru -WindowStyle Hidden
Write-Host '      等待数据库启动并应用脚本（20 秒）...'
Start-Sleep -Seconds 20

# ---------- 6. 关闭临时实例 ----------
Write-Host '[3/5] 关闭临时实例...' -ForegroundColor Yellow
Get-Process mysqld -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 4

# ---------- 7. 重启服务 ----------
Write-Host '[4/5] 重新启动 MySQL 服务...' -ForegroundColor Yellow
Start-Service -Name 'MySQL' -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# ---------- 8. 结果确认 ----------
$state = (Get-Service -Name 'MySQL').Status
Write-Host '[5/5] 检查服务状态...' -ForegroundColor Yellow
Write-Host ''
if ($state -eq 'Running') {
    Write-Host '============================================' -ForegroundColor Green
    Write-Host '  ✅ 重置完成！服务已正常运行' -ForegroundColor Green
    Write-Host '============================================' -ForegroundColor Green
    Write-Host ''
    Write-Host '新密码 = 「重置MySQL密码.sql」中 ALTER USER 语句里设置的值' -ForegroundColor Cyan
    Write-Host '请回到对话中告诉 AI，继续完成 .env 配置与数据库初始化。' -ForegroundColor Cyan
} else {
    Write-Host "⚠️ 服务状态异常: $state" -ForegroundColor Red
    Write-Host '请手动执行: net start MySQL' -ForegroundColor Yellow
}
Write-Host ''
Read-Host '按回车退出'
