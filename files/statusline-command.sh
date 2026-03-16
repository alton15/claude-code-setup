#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract data from JSON
model_name=$(echo "$input" | jq -r '.model.display_name // "Claude"')
model_id=$(echo "$input" | jq -r '.model.id // ""')
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd')
output_style=$(echo "$input" | jq -r '.output_style.name // "default"')
context_used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
context_remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')

# Extract cumulative token usage information
total_input_tokens=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_output_tokens=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
cache_creation=$(echo "$input" | jq -r '.context_window.current_usage.cache_creation_input_tokens // 0')
cache_read=$(echo "$input" | jq -r '.context_window.current_usage.cache_read_input_tokens // 0')

# Estimate cost based on model pricing (per million tokens)
# Claude Sonnet 4: $3/M input, $15/M output, $3.75/M cache_write, $0.30/M cache_read
# Claude Opus 4:   $15/M input, $75/M output
# Claude Haiku:    $0.80/M input, $4/M output
estimated_cost=""
if [ -n "$model_id" ]; then
    if echo "$model_id" | grep -q "opus"; then
        in_price=15.0; out_price=75.0; cw_price=18.75; cr_price=1.50
    elif echo "$model_id" | grep -q "haiku"; then
        in_price=0.80; out_price=4.0; cw_price=1.0; cr_price=0.08
    else
        # Default: Sonnet pricing
        in_price=3.0; out_price=15.0; cw_price=3.75; cr_price=0.30
    fi
    estimated_cost=$(awk -v inp="$total_input_tokens" -v out="$total_output_tokens" \
        -v cw="$cache_creation" -v cr="$cache_read" \
        -v ip="$in_price" -v op="$out_price" -v cwp="$cw_price" -v crp="$cr_price" \
        'BEGIN {
            cost = (inp/1000000)*ip + (out/1000000)*op + (cw/1000000)*cwp + (cr/1000000)*crp
            printf "$%.4f", cost
        }')
fi

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
    context_info=" $(printf "$ctx_color")[ctx:${context_used}%% used | ${context_remaining}%% left]$(printf '\033[0m')"
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
    cost_info=" $(printf '\033[32m')[~${estimated_cost} est | ${input_display}in/${output_display}out]$(printf '\033[0m')"
else
    cost_info=" $(printf '\033[32m')[${input_display}in/${output_display}out]$(printf '\033[0m')"
fi

# Build the status line
printf '\033[35m'
echo -n "$model_name"
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
