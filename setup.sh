#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "=== Claude Code Setup ==="
echo "Source: $SCRIPT_DIR"
echo "Target: $CLAUDE_DIR"
echo ""

# 1. Create directories
echo "[1/9] Creating directories..."
mkdir -p "$CLAUDE_DIR/rules/common"
mkdir -p "$CLAUDE_DIR/rules/python"
mkdir -p "$CLAUDE_DIR/scripts"
mkdir -p "$CLAUDE_DIR/contexts"
mkdir -p "$CLAUDE_DIR/skills"
mkdir -p "$CLAUDE_DIR/commands"

# 2. Copy CLAUDE.md
echo "[2/9] Installing global CLAUDE.md..."
if [ -f "$CLAUDE_DIR/CLAUDE.md" ] && [ -s "$CLAUDE_DIR/CLAUDE.md" ]; then
    echo "  WARNING: ~/.claude/CLAUDE.md already exists and is non-empty."
    echo "  Backup saved as CLAUDE.md.bak"
    cp "$CLAUDE_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md.bak"
fi
cp "$SCRIPT_DIR/files/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"

# 3. Copy settings.json
echo "[3/9] Installing settings.json..."
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    echo "  WARNING: ~/.claude/settings.json already exists."
    echo "  Backup saved as settings.json.bak"
    cp "$CLAUDE_DIR/settings.json" "$CLAUDE_DIR/settings.json.bak"
fi
cp "$SCRIPT_DIR/files/settings.json" "$CLAUDE_DIR/settings.json"

# 4. Copy scripts
echo "[4/9] Installing scripts..."
cp "$SCRIPT_DIR/files/statusline-command.sh" "$CLAUDE_DIR/statusline-command.sh"
cp "$SCRIPT_DIR/files/scripts/check-context.sh" "$CLAUDE_DIR/scripts/check-context.sh"
chmod +x "$CLAUDE_DIR/statusline-command.sh"
chmod +x "$CLAUDE_DIR/scripts/check-context.sh"

# 5. Copy rules
echo "[5/9] Installing rules..."
cp "$SCRIPT_DIR/files/rules/common/"*.md "$CLAUDE_DIR/rules/common/"
cp "$SCRIPT_DIR/files/rules/python/"*.md "$CLAUDE_DIR/rules/python/"

# 6. Copy contexts
echo "[6/9] Installing contexts..."
cp "$SCRIPT_DIR/files/contexts/"*.md "$CLAUDE_DIR/contexts/"

# 7. Copy commands
echo "[7/9] Installing custom commands..."
if ls "$SCRIPT_DIR/files/commands/"*.md 1>/dev/null 2>&1; then
    cp "$SCRIPT_DIR/files/commands/"*.md "$CLAUDE_DIR/commands/"
    echo "  Installed: $(ls "$SCRIPT_DIR/files/commands/"*.md | wc -l | tr -d ' ') commands"
else
    echo "  No custom commands to install"
fi

# 8. Copy skills (if any exist)
echo "[8/9] Installing skills..."
if ls "$SCRIPT_DIR/files/skills/"*.md 1>/dev/null 2>&1; then
    cp "$SCRIPT_DIR/files/skills/"*.md "$CLAUDE_DIR/skills/"
else
    echo "  No custom skills to install"
fi

# 9. Shell aliases
echo "[9/9] Installing shell aliases..."
SHELL_RC="$HOME/.zshrc"
if [ -n "$BASH_VERSION" ] || [ ! -f "$SHELL_RC" ]; then
    SHELL_RC="$HOME/.bashrc"
fi
if ! grep -q "# Claude Code aliases" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    cat "$SCRIPT_DIR/files/shell-aliases.sh" >> "$SHELL_RC"
    echo "  Added aliases to $SHELL_RC"
else
    echo "  Shell aliases already exist in $SHELL_RC, skipping"
fi

echo ""
echo "=== Files installed ==="
echo ""

# 9. Plugin installation
echo "=== Plugin Installation ==="
echo "Run these commands to install plugins:"
echo ""
echo "  claude plugin marketplace add anthropics/claude-plugins-official"
echo "  claude plugin marketplace add ykdojo/claude-code-tips"
echo "  claude plugin marketplace add HKUDS/CLI-Anything"
echo ""
echo "  claude plugin install superpowers@claude-plugins-official"
echo "  claude plugin install dx@ykdojo"
echo "  claude plugin install cli-anything@cli-anything"
echo ""

# 10. Reference repos
echo "=== Reference Repos (optional but recommended) ==="
echo "These repos provide additional tips, skills, and configs:"
echo ""
echo "  git clone https://github.com/ykdojo/claude-code-tips.git"
echo "  git clone https://github.com/anthropics/everything-claude-code.git"
echo ""

echo "=== Done ==="
echo ""
echo "NOTES:"
echo "  - MCP servers (atlassian-agent, pencil) need manual setup (see README.md)"
echo "  - Run 'source $SHELL_RC' to activate shell aliases"
echo "  - Add custom skills to ~/.claude/skills/ as needed"
