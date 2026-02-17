@echo off
REM ============================================
REM  Auth Admin Dashboard — One-Click Launcher
REM ============================================
REM Double-click this file to start the app.
REM A Command Prompt window will open automatically.
REM Press Ctrl+C to stop the server.
REM ============================================

cd /d "%~dp0"

echo ============================================
echo   Auth Admin Dashboard — Starting...
echo ============================================
echo.

REM --------------------------------------------------
REM Pre-flight checks
REM --------------------------------------------------
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo   ERROR: Node.js is not installed.
    echo   Please double-click Install.bat first.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo   Dependencies not installed yet.
    echo   Please double-click Install.bat first.
    echo.
    pause
    exit /b 1
)

REM --------------------------------------------------
REM Open the browser after a short delay
REM --------------------------------------------------
start "" cmd /c "timeout /t 3 /noq >nul && start http://localhost:3000"

REM --------------------------------------------------
REM Start the development server
REM --------------------------------------------------
echo   Starting server on http://localhost:3000
echo   Your browser will open automatically.
echo.
echo   To stop the server, press Ctrl+C
echo   or simply close this window.
echo ============================================
echo.

call yarn dev
