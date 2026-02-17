@echo off
REM ============================================
REM  Auth Admin Dashboard — One-Click Installer
REM ============================================
REM Double-click this file to install everything.
REM A Command Prompt window will open automatically.
REM ============================================

cd /d "%~dp0"

echo ============================================
echo   Auth Admin Dashboard — Installer
echo ============================================
echo.

REM --------------------------------------------------
REM 1. Check for Node.js
REM --------------------------------------------------
echo [1/4] Checking for Node.js...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo   ERROR: Node.js is not installed.
    echo.
    echo   Please install Node.js first:
    echo     1. Go to https://nodejs.org
    echo     2. Download the LTS version
    echo     3. Run the installer
    echo     4. CLOSE this window and double-click Install.bat again
    echo.
    echo   Opening the Node.js download page...
    start https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo        Found Node.js %NODE_VERSION%

REM --------------------------------------------------
REM 2. Check / install Yarn
REM --------------------------------------------------
echo [2/4] Checking for Yarn...
where yarn >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo        Yarn not found — installing via npm...
    call npm install -g yarn
    if %ERRORLEVEL% neq 0 (
        echo.
        echo   ERROR: Could not install Yarn.
        echo   Try opening Command Prompt as Administrator and running:
        echo     npm install -g yarn
        echo.
        pause
        exit /b 1
    )
    echo        Yarn installed successfully.
) else (
    for /f "tokens=*" %%i in ('yarn --version') do set YARN_VERSION=%%i
    echo        Found Yarn %YARN_VERSION%
)

REM --------------------------------------------------
REM 3. Install project dependencies
REM --------------------------------------------------
echo [3/4] Installing project dependencies (this may take a minute)...
echo.
call yarn install
if %ERRORLEVEL% neq 0 (
    echo.
    echo   ERROR: Dependency installation failed.
    echo   Check the messages above for details.
    echo.
    pause
    exit /b 1
)
echo.
echo        Dependencies installed.

REM --------------------------------------------------
REM 4. Set up environment file
REM --------------------------------------------------
echo [4/4] Setting up configuration...
if not exist .env (
    copy .env.example .env >nul
    echo        Created .env from template.
    echo        (Edit .env to add your own API keys if needed^)
) else (
    echo        .env already exists — skipping.
)

REM --------------------------------------------------
REM Done!
REM --------------------------------------------------
echo.
echo ============================================
echo   Installation complete!
echo ============================================
echo.
echo   To start the dashboard:
echo     Double-click  Launch.bat
echo.
echo   The app will open in your browser at:
echo     http://localhost:3000
echo.
pause
