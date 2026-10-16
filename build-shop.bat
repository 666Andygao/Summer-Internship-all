@echo off
echo.
echo   Building shop frontend...
echo.

rem --- Switch to the shop directory ---
cd /d "%~dp0feiyi-ecommerce"

rem --- Check if Node.js is installed ---
where node >nul 2>nul
if errorlevel 1 goto :nonode

rem --- Install dependencies if needed ---
if exist "node_modules" goto :installed
echo   Installing dependencies (first run, may take a while)...
call npm install
if errorlevel 1 goto :installfail

:installed
echo   Dependencies ready.

rem --- Build the shop ---
echo   Running npm run build...
call npm run build
if errorlevel 1 goto :buildfail

echo.
echo   ============================================
echo   BUILD COMPLETE!
echo   Shop is now served at:  http://localhost:3000/shop/
echo   Restart start-server.bat to use it.
echo   ============================================
echo.
pause
exit /b 0

:nonode
echo   [ERROR] Node.js not found. Please install Node.js first.
echo   Download: https://nodejs.org/
pause
exit /b 1

:installfail
echo   [ERROR] npm install failed. Please check the messages above.
pause
exit /b 1

:buildfail
echo   [ERROR] Build failed. Please check the messages above.
pause
exit /b 1
