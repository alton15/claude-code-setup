#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract data from JSON
model_name=$(echo "$input" | jq -r '.model.display_name // "Claude"')
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd')
output_style=$(echo "$input" | jq -r '.output_style.name // "default"')
context_used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
context_remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')

# Extract cumulative token usage information
total_input_tokens=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_output_tokens=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')

# Session cost as Claude Code itself reckons it (the figure /cost shows): it
# follows each model's current list price and any org `modelPricing` override,
# so there is no price table here to go stale.
estimated_cost=""
session_cost=$(echo "$input" | jq -r '.cost.total_cost_usd // empty')
if [ -n "$session_cost" ]; then
    estimated_cost=$(awk -v c="$session_cost" 'BEGIN { printf "$%.2f", c }')
fi

# Effort level, when the model takes one (e.g. "xhigh")
effort=$(echo "$input" | jq -r '.effort.level // empty')

# Get git information (skip optional locks to avoid errors)
git_info=""
if git -C "$cwd" rev-parse --git-dir > /dev/null 2>&1; then
    branch=$(git -C "$cwd" --no-optional-locks rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [ -n "$branch" ]; then
        if git -C "$cwd" --no-optional-locks diff --quiet 2>/dev/null && \
           git -C "$cwd" --no-optional-locks diff --cached --quiet 2>/dev/null; then
            git_info=" $(printf '\033[32m')git:($branch)$(printf '\033[0m')"
        else
            git_info=" $(printf '\033[33m')git:($branch)✗$(printf '\033[0m')"
        fi
    fi
fi

# Format context window: used/remaining with color coding
context_info=""
if [ -n "$context_used" ] && [ -n "$context_remaining" ]; then
    # Color based on remaining: green >50%, yellow 20-50%, red <20%
    if [ "$context_remaining" -gt 50 ]; then
        ctx_color='\033[32m' # green
    elif [ "$context_remaining" -gt 20 ]; then
        ctx_color='\033[33m' # yellow
    else
        ctx_color='\033[31m' # red
    fi
    context_info=" $(printf "$ctx_color")[ctx:${context_used}% used | ${context_remaining}% left]$(printf '\033[0m')"
fi

# Format token counts with K/M suffixes
format_tokens() {
    local tok=$1
    if [ "$tok" -ge 1000000 ]; then
        awk -v t="$tok" 'BEGIN { printf "%.1fM", t/1000000 }'
    elif [ "$tok" -ge 1000 ]; then
        awk -v t="$tok" 'BEGIN { printf "%.1fK", t/1000 }'
    else
        echo "$tok"
    fi
}

input_display=$(format_tokens "$total_input_tokens")
output_display=$(format_tokens "$total_output_tokens")

# Build cost/token info line
if [ -n "$estimated_cost" ]; then
    cost_info=" $(printf '\033[32m')[${estimated_cost} | ${input_display}in/${output_display}out]$(printf '\033[0m')"
else
    cost_info=" $(printf '\033[32m')[${input_display}in/${output_display}out]$(printf '\033[0m')"
fi

# Build the status line
printf '\033[35m'
echo -n "$model_name"
[ -n "$effort" ] && echo -n " ($effort)"
printf '\033[0m'
echo -n " in "
printf '\033[34m'
echo -n "$cwd"
printf '\033[0m'
echo -n "$git_info"
echo -n "$context_info"
echo -n "$cost_info"
printf '\033[33m'
echo -n " [$output_style]"
printf '\033[0m'
echo ""
