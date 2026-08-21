#!/usr/bin/env python3
"""Extract genuine user-typed messages from Claude Code session transcripts.

Reads ~/.claude/projects/**/*.jsonl and emits only what the human actually
typed -- no tool results, no compaction summaries, no system-reminder noise.
The output feeds the `my-voice` skill: re-run it whenever your writing style
has drifted enough that the distilled style guide feels stale.

Usage:
    python3 extract-voice.py                       # stats only
    python3 extract-voice.py -o corpus.json        # stats + JSON corpus
    python3 extract-voice.py -o corpus.json --text corpus.txt
    python3 extract-voice.py --projects-dir ~/.claude/projects --min-len 5
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path

# Lines that look like a human message but are injected by the harness.
NOISE_PREFIXES = (
    "<",
    "/",
    "Caveat:",
    "[Request interrupted",
    "This session is being continued",
    "Your task is to create a detailed summary",
    "API Error",
    "Please continue the conversation from where",
)

NOISE_SUBSTRINGS = (
    "system-reminder",
    "<command-name>",
    "<local-command-stdout>",
    "<user-prompt-submit-hook>",
)

HANGUL = re.compile(r"[가-힣]")
SENTENCE_END = re.compile(r"[가-힣]{1,4}(?:줘|주세요|해|하자|야|어|봐|까|네|음|지|다)(?=[\s.?!]|$)")


def iter_transcripts(projects_dir: Path):
    """Yield every session transcript under the projects directory."""
    yield from sorted(projects_dir.glob("**/*.jsonl"))


def message_text(entry: dict) -> str | None:
    """Return the plain text a human typed, or None if this isn't one."""
    if entry.get("type") != "user":
        return None
    # Sidechains are subagent conversations; meta entries are harness bookkeeping.
    if entry.get("isMeta") or entry.get("isSidechain"):
        return None

    content = (entry.get("message") or {}).get("content")
    if isinstance(content, list):
        # A list content block is a tool_result unless it carries text parts.
        parts = [
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        ]
        content = "".join(parts)
    if not isinstance(content, str):
        return None

    text = content.strip()
    if not text:
        return None
    if text.startswith(NOISE_PREFIXES):
        return None
    if any(marker in text for marker in NOISE_SUBSTRINGS):
        return None
    return text


def collect(projects_dir: Path, min_len: int) -> list[dict]:
    """Read every transcript and return deduped, time-ordered user messages."""
    records: list[dict] = []
    for path in iter_transcripts(projects_dir):
        try:
            with path.open(encoding="utf-8") as handle:
                for line in handle:
                    try:
                        entry = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    text = message_text(entry)
                    if text is None or len(text) < min_len:
                        continue
                    records.append(
                        {
                            "project": path.parent.name,
                            "timestamp": entry.get("timestamp", ""),
                            "text": text,
                        }
                    )
        except OSError as err:
            print(f"  skipped {path}: {err}", file=sys.stderr)

    seen: set[str] = set()
    unique = []
    for record in records:
        if record["text"] in seen:
            continue
        seen.add(record["text"])
        unique.append(record)
    unique.sort(key=lambda r: r["timestamp"])
    return unique


def report(records: list[dict]) -> None:
    """Print corpus stats -- enough to sanity-check an extraction run."""
    if not records:
        print("No user messages found. Wrong --projects-dir?")
        return

    korean = [r for r in records if HANGUL.search(r["text"])]
    lengths = sorted(len(r["text"]) for r in records)
    endings: Counter[str] = Counter()
    for record in korean:
        for match in SENTENCE_END.findall(record["text"]):
            endings[match[-3:]] += 1

    print(f"messages      : {len(records)}")
    print(f"korean        : {len(korean)}")
    print(f"projects      : {len({r['project'] for r in records})}")
    print(f"date range    : {records[0]['timestamp'][:10]} -> {records[-1]['timestamp'][:10]}")
    print(f"length median : {lengths[len(lengths) // 2]}")
    print(f"length p90    : {lengths[int(len(lengths) * 0.9)]}")
    print("top endings   :")
    for ending, count in endings.most_common(20):
        print(f"  {ending:<8} {count}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--projects-dir",
        type=Path,
        default=Path.home() / ".claude" / "projects",
        help="Claude Code transcript root (default: ~/.claude/projects)",
    )
    parser.add_argument("-o", "--output", type=Path, help="write the corpus as JSON")
    parser.add_argument("--text", type=Path, help="write the corpus as plain text, one message per block")
    parser.add_argument("--min-len", type=int, default=4, help="drop messages shorter than this (default: 4)")
    args = parser.parse_args()

    if not args.projects_dir.is_dir():
        print(f"Not a directory: {args.projects_dir}", file=sys.stderr)
        return 1

    records = collect(args.projects_dir, args.min_len)
    report(records)

    if args.output:
        args.output.write_text(json.dumps(records, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"\nwrote {args.output}")
    if args.text:
        blocks = [f"--- {r['timestamp'][:10]} | {r['project']}\n{r['text']}" for r in records]
        args.text.write_text("\n\n".join(blocks), encoding="utf-8")
        print(f"wrote {args.text}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
