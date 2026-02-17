#!/bin/bash
# ============================================
#  Auth Admin Dashboard — One-Click Installer
# ============================================
# Double-click this file to install everything.
# A Terminal window will open automatically.
# ============================================

# cd to the folder where this script lives (the project root)
cd "$(dirname "$0")"

clear
echo "============================================"
echo "  Auth Admin Dashboard — Installer"
echo "============================================"
echo ""

# --------------------------------------------------
# 1. Check for Node.js
# --------------------------------------------------
echo "[1/4] Checking for Node.js..."
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    echo "       Found Node.js $NODE_VERSION"
else
    echo ""
    echo "  ERROR: Node.js is not installed."
    echo ""
    echo "  Please install Node.js first:"
    echo "    1. Go to https://nodejs.org"
    echo "    2. Download the LTS version"
    echo "    3. Run the installer"
    echo "    4. Then double-click this Install file again"
    echo ""
    echo "  Press any key to open the Node.js download page..."
    read -n 1 -s
    open "https://nodejs.org"
    exit 1
fi

# --------------------------------------------------
# 2. Check / install Yarn
# --------------------------------------------------
echo "[2/4] Checking for Yarn..."
if command -v yarn &>/dev/null; then
    YARN_VERSION=$(yarn --version)
    echo "       Found Yarn $YARN_VERSION"
else
    echo "       Yarn not found — installing via npm..."
    npm install -g yarn
    if [ $? -ne 0 ]; then
        echo ""
        echo "  ERROR: Could not install Yarn."
        echo "  Try running this in Terminal manually:"
        echo "    sudo npm install -g yarn"
        echo ""
        echo "  Press any key to exit..."
        read -n 1 -s
        exit 1
    fi
    echo "       Yarn installed successfully."
fi

# --------------------------------------------------
# 3. Install project dependencies
# --------------------------------------------------
echo "[3/4] Installing project dependencies (this may take a minute)..."
echo ""
yarn install
if [ $? -ne 0 ]; then
    echo ""
    echo "  ERROR: Dependency installation failed."
    echo "  Check the messages above for details."
    echo ""
    echo "  Press any key to exit..."
    read -n 1 -s
    exit 1
fi
echo ""
echo "       Dependencies installed."

# --------------------------------------------------
# 4. Set up environment file
# --------------------------------------------------
echo "[4/4] Setting up configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "       Created .env from template."
    echo "       (Edit .env to add your own API keys if needed)"
else
    echo "       .env already exists — skipping."
fi

# --------------------------------------------------
# Make the Launch file executable (safety net)
# --------------------------------------------------
chmod +x "$(dirname "$0")/Launch.command"

# --------------------------------------------------
# Done!
# --------------------------------------------------
echo ""
echo "============================================"
echo "  Installation complete!"
echo "============================================"
echo ""
echo "  To start the dashboard:"
echo "    Double-click  Launch.command"
echo ""
echo "  The app will open in your browser at:"
echo "    http://localhost:3000"
echo ""
echo "  Press any key to close this window..."
read -n 1 -s
