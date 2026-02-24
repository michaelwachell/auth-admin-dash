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
REM 1. Check / install Node.js
REM --------------------------------------------------
echo [1/4] Checking for Node.js...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo        Node.js not found — installing automatically...
    echo.

    REM --- Strategy A: Use winget (built into Windows 10/11) ---
    where winget >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo        Installing Node.js via winget...
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        goto :refresh_path_after_node
    )

    REM --- Strategy B: Download and run the MSI installer ---
    echo        winget not available — downloading Node.js installer...
    echo        (This will download the official Node.js LTS installer^)
    echo.
    powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $url = (Invoke-WebRequest -Uri 'https://nodejs.org/en/download/' -UseBasicParsing).Links | Where-Object { $_.href -match 'node-v.*-x64\.msi$' } | Select-Object -First 1 -ExpandProperty href; if (-not $url) { $url = 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' }; Write-Host \"Downloading $url ...\"; Invoke-WebRequest -Uri $url -OutFile \"$env:TEMP\nodejs-install.msi\"; Write-Host 'Running installer...'; Start-Process msiexec.exe -ArgumentList '/i', \"$env:TEMP\nodejs-install.msi\", '/passive', '/norestart' -Wait; Remove-Item \"$env:TEMP\nodejs-install.msi\" -ErrorAction SilentlyContinue }"

    :refresh_path_after_node
    REM Refresh PATH so node/npm are available in this session
    set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"

    where node >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo.
        echo   ERROR: Node.js installation failed.
        echo   Please install manually from https://nodejs.org
        echo   Then CLOSE this window and double-click Install.bat again.
        echo.
        pause
        exit /b 1
    )
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
    REM Refresh PATH for yarn
    set "PATH=%APPDATA%\npm;%PATH%"
    where yarn >nul 2>nul
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
