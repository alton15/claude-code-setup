#!/bin/bash

# Stop hook: suggests /half-clone when context usage exceeds 85%.
# Blocks Claude from stopping and tells it to run /half-clone.

input=$(cat)

# Prevent infinite loops
stop_hook_active=$(echo "$input" | jq -r '.stop_hook_active // false')
if [[ "$stop_hook_active" == "true" ]]; then
    exit 0
fi

transcript_path=$(echo "$input" | jq -r '.transcript_path // empty')
if [[ -z "$transcript_path" || ! -f "$transcript_path" ]]; then
    exit 0
fi

max_context=200000

context_length=$(jq -s '
    map(select(.message.usage and .isSidechain != true and .isApiErrorMessage != true)) |
    last |
    if . then
        (.message.usage.input_tokens // 0) +
        (.message.usage.cache_read_input_tokens // 0) +
        (.message.usage.cache_creation_input_tokens // 0)
    else 0 end
' < "$transcript_path")

if [[ -z "$context_length" || "$context_length" -eq 0 ]]; then
    exit 0
fi

pct=$((context_length * 100 / max_context))

if [[ $pct -ge 85 ]]; then
    echo "{\"decision\": \"block\", \"reason\": \"Context usage is at ${pct}%. Please run /half-clone to create a new conversation with only the later half so a new agent can continue there.\"}"
fi
