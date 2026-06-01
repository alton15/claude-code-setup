# Claude Code aliases
alias c='claude'
alias ch='claude --chrome'

# claude-code-templates CLI (davila7/claude-code-templates)
# Component installer, analytics, conversation monitor, health check.
alias cct='npx claude-code-templates@latest'
alias cct-analytics='npx claude-code-templates@latest --analytics'
alias cct-chats='npx claude-code-templates@latest --chats'
alias cct-health='npx claude-code-templates@latest --health-check'

# --fs → --fork-session shortcut
claude() {
  local args=()
  for arg in "$@"; do
    if [[ "$arg" == "--fs" ]]; then
      args+=("--fork-session")
    else
      args+=("$arg")
    fi
  done
  command claude "${args[@]}"
}
