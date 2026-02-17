#!/bin/bash
# ============================================
#  Auth Admin Dashboard — One-Click Launcher
# ============================================
# Double-click this file to start the app.
# A Terminal window will open automatically.
# Press Ctrl+C in Terminal to stop the server.
# ============================================

# cd to the folder where this script lives (the project root)
cd "$(dirname "$0")"

clear
echo "============================================"
echo "  Auth Admin Dashboard — Starting..."
echo "============================================"
echo ""

# --------------------------------------------------
# Pre-flight checks
# --------------------------------------------------
if ! command -v node &>/dev/null; then
    echo "  ERROR: Node.js is not installed."
    echo "  Please double-click Install.command first."
    echo ""
    echo "  Press any key to exit..."
    read -n 1 -s
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "  Dependencies not installed yet."
    echo "  Please double-click Install.command first."
    echo ""
    echo "  Press any key to exit..."
    read -n 1 -s
    exit 1
fi

# --------------------------------------------------
# Open the browser after a short delay
# --------------------------------------------------
(sleep 3 && open "http://localhost:3000") &

# --------------------------------------------------
# Start the development server
# --------------------------------------------------
echo "  Starting server on http://localhost:3000"
echo "  Your browser will open automatically."
echo ""
echo "  To stop the server, press Ctrl+C"
echo "  or simply close this Terminal window."
echo "============================================"
echo ""

yarn dev
