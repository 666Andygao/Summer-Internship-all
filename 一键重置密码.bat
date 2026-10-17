@echo off
chcp 65001 >nul
title MySQL 密码重置
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
    echo.
    echo   [错误] 需要管理员权限！
    echo.
    echo   请右键本文件 -^> 选择"以管理员身份运行"
    echo.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0重置MySQL密码.ps1"
