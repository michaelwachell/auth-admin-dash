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
# Helper: reload PATH so newly installed tools are found
# --------------------------------------------------
reload_path() {
    export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
    # Pick up nvm / fnm / Homebrew paths if they exist
    [ -f "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
    [ -f "$HOME/.zprofile" ] && . "$HOME/.zprofile" 2>/dev/null
    [ -f "$HOME/.bash_profile" ] && . "$HOME/.bash_profile" 2>/dev/null
    eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null)" 2>/dev/null
    eval "$(/usr/local/bin/brew shellenv 2>/dev/null)" 2>/dev/null
}

# --------------------------------------------------
# 1. Check / install Node.js
# --------------------------------------------------
echo "[1/4] Checking for Node.js..."
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    echo "       Found Node.js $NODE_VERSION"
else
    echo "       Node.js not found — installing automatically..."
    echo ""

    # --- Strategy A: Use Homebrew if available ---
    if command -v brew &>/dev/null; then
        echo "       Installing Node.js via Homebrew..."
        brew install node
    else
        # --- Strategy B: Install Homebrew first, then Node ---
        echo "       Homebrew not found — installing Homebrew first..."
        echo "       (You may be prompted for your Mac password)"
        echo ""
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Add Homebrew to PATH for this session
        eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null)" 2>/dev/null
        eval "$(/usr/local/bin/brew shellenv 2>/dev/null)" 2>/dev/null

        if ! command -v brew &>/dev/null; then
            echo ""
            echo "  ERROR: Homebrew installation failed."
            echo "  Please install Node.js manually from https://nodejs.org"
            echo ""
            echo "  Press any key to exit..."
            read -n 1 -s
            exit 1
        fi

        echo ""
        echo "       Homebrew installed. Now installing Node.js..."
        brew install node
    fi

    # Reload PATH and verify
    reload_path

    if ! command -v node &>/dev/null; then
        echo ""
        echo "  ERROR: Node.js installation failed."
        echo "  Please install Node.js manually from https://nodejs.org"
        echo "  Then double-click this Install file again."
        echo ""
        echo "  Press any key to exit..."
        read -n 1 -s
        exit 1
    fi

    NODE_VERSION=$(node --version)
    echo "       Node.js $NODE_VERSION installed successfully."
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
        echo "       Retrying with sudo..."
        sudo npm install -g yarn
    fi
    reload_path
    if ! command -v yarn &>/dev/null; then
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
