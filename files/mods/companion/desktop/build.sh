#!/bin/bash
# Builds the desktop companion into ~/.claude/companion/Companion.app
# The 3D renderer is bundled with npm in ~/.claude/companion/build, kept
# out of the mod folder so node_modules never lands next to the mod.
set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$HOME/.claude/companion"
APP="$ROOT/Companion.app"
BIN_DIR="$APP/Contents/MacOS"
WEB_OUT="$APP/Contents/Resources/web"
WEB_BUILD="$ROOT/build"

mkdir -p "$BIN_DIR" "$WEB_OUT" "$WEB_BUILD"
swiftc -O -parse-as-library -o "$BIN_DIR/Companion" "$SRC_DIR/Companion.swift" "$SRC_DIR/Model3D.swift"

if command -v npm >/dev/null; then
    cp "$SRC_DIR/web/package.json" "$SRC_DIR/web/index.html" "$SRC_DIR/web/"*.js "$WEB_BUILD/"
    if [ ! -d "$WEB_BUILD/node_modules" ]; then
        (cd "$WEB_BUILD" && npm install --no-audit --no-fund)
    fi
    (cd "$WEB_BUILD" && npm run build --silent)
    cp "$WEB_BUILD/index.html" "$WEB_BUILD/dist/companion3d.js" "$WEB_OUT/"
else
    echo "npm not found: 3D renderer skipped, the app shows still images"
fi

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>Companion</string>
  <key>CFBundleIdentifier</key><string>local.companion</string>
  <key>CFBundleName</key><string>Companion</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.2.0</string>
  <key>LSUIElement</key><true/>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
</dict>
</plist>
PLIST

echo "built: $APP"
