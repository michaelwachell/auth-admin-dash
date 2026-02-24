# Auth Admin Dashboard — Getting Started

## Quick Start (No Terminal Required)

### macOS

1. **Install**: Double-click `Install.command` in Finder
   - A Terminal window opens and installs everything automatically
   - If Node.js is missing, it installs Homebrew + Node.js for you (you may be prompted for your Mac password)
   - Press any key to close when it says "Installation complete!"

2. **Launch**: Double-click `Launch.command` in Finder
   - The dashboard starts and your browser opens to `http://localhost:3000`
   - Keep the Terminal window open while you use the app
   - To stop: press `Ctrl+C` in Terminal, or just close the Terminal window

### Windows

1. **Install**: Double-click `Install.bat` in File Explorer
   - A Command Prompt window opens and installs everything automatically
   - If Node.js is missing, it installs it via `winget` or downloads the official installer
   - Press any key to close when it says "Installation complete!"

2. **Launch**: Double-click `Launch.bat` in File Explorer
   - The dashboard starts and your browser opens to `http://localhost:3000`
   - Keep the Command Prompt window open while you use the app
   - To stop: press `Ctrl+C` in Command Prompt, or just close the window

---

## Prerequisites

Everything is installed automatically by the install script. No manual setup needed.

If auto-install fails, you can install manually:

| Requirement | Version | Download |
|-------------|---------|----------|
| Node.js     | 18+     | [nodejs.org](https://nodejs.org) — use the LTS version |
| Yarn        | 1.22+   | Installed automatically via npm |
| Homebrew (macOS only) | any | Installed automatically if needed |

---

## Troubleshooting

### macOS: "App can't be opened because it is from an unidentified developer"

Right-click the `.command` file, select **Open**, then click **Open** in the dialog.

### macOS: "Permission denied" when double-clicking

Open Terminal and run:
```
chmod +x Install.command Launch.command
```
Then double-click again.

### Windows: "Windows protected your PC" (SmartScreen)

Click **More info**, then click **Run anyway**.

### Port 3000 is already in use

The app will automatically try port 3001, then 3002. Check the Terminal/Command Prompt output for the actual URL.

### Dependencies fail to install

- Make sure you have an internet connection
- On Windows, try running `Install.bat` as Administrator (right-click > Run as administrator)
- On macOS, if Yarn fails to install, open Terminal and run: `sudo npm install -g yarn`

### The browser opens but shows a blank page

Wait a few seconds — the server may still be compiling. Refresh the page.

---

## What the Scripts Do

### Install script (`Install.command` / `Install.bat`)

1. Checks for Node.js — if missing, installs it automatically
   - **macOS**: Installs Homebrew (if needed), then `brew install node`
   - **Windows**: Uses `winget` or downloads the official Node.js MSI installer
2. Checks for Yarn — if missing, installs it via `npm install -g yarn`
3. Runs `yarn install` to download all project dependencies
4. Copies `.env.example` to `.env` if no `.env` exists yet

### Launch script (`Launch.command` / `Launch.bat`)

1. Verifies Node.js and dependencies are present
2. Starts the Next.js development server (`yarn dev`)
3. Opens your default browser to `http://localhost:3000` after 3 seconds

---

## Configuration

After installing, you can edit the `.env` file in the project folder to set your own API keys:

```
GIGYA_API_KEY=your_api_key_here
GIGYA_SECRET_KEY=your_secret_key_here
GIGYA_DATA_CENTER=us1
```

The app works for Ping AIC testing without any `.env` changes. Gigya features require valid credentials.

---

## For Developers

If you prefer the command line:

```bash
# Install
yarn install

# Run development server
yarn dev

# Build for production
yarn build
yarn start
```
