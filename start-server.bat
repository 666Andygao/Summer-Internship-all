@echo off
rem ============================================
rem   Huaxia Fengwu - Heritage Backend Server
rem ============================================
echo.
echo   Starting server...
echo   Homepage:  http://localhost:3000/MainPage.html
echo   Login:     http://localhost:3000/login.html
echo   Shop:      http://localhost:3000/shop/
echo.
rem Switch to the script's directory so relative paths work
cd /d "%~dp0"
rem Start the Node.js server
"C:\Program Files\nodejs\node.exe" "%~dp0server.js"

echo.
echo   Server stopped.
pause
