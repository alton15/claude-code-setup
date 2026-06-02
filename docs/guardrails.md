# LLM 시대의 가드레일 — Claude Code Hooks

> 출처 영감: [Reindeer — LLM 시대의 엔지니어링](https://news.hada.io/topic?id=30060)
> 핵심: CLAUDE.md는 "권고", hook은 "법". exit code 2가 실제로 blocking 가능.

이 문서는 본 setup에 추가할 7가지 hook과 작동 원리, 참조 repo를 정리한다.

## 기존 setup 대비 변경 사항 요약

**기존 (commit `1a9bc74` 시점)**:
- `settings.json` — 40+ permission allow / 6 deny / 1 `Stop` hook (`check-context.sh`)
- 토큰 최적화 레이어: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=60`, `.claudeignore.template`, 모델 믹스 (Haiku 4.5 / Sonnet 4.6 / Opus 4.8)
- 강제력 있는 검증: 0개 (CLAUDE.md 룰만 존재 — 모델이 "준수하기로 결정"해야 작동)
- `.claudeignore`는 Read/Grep/Glob 차단이지 Edit/Write 차단이 아님 — 즉 LLM 출력에 대한 가드레일은 별개 필요

**변경 후 추가**:
- `PreToolUse` hooks 2종 (시크릿 스캐너, padded-room 경로 가드)
- `PostToolUse` hooks 3종 (ruff+mypy, 파일 크기 한계, ast-grep 불변성 검사)
- `Stop` hook 1종 추가 (검증 게이트 — 기존 context-check와 병렬)
- `UserPromptSubmit` hook 1종 (컨텍스트 위생 인젝터)

**핵심 원칙**:
- exit code 1 = 경고만, 2 = 실제 blocking
- Stop hook은 `stop_hook_active` 가드 없으면 무한 루프
- `Bash` matcher도 Edit/Write와 함께 걸어야 `cat .env` 같은 우회 차단
- 경로는 `~` 대신 `$CLAUDE_PROJECT_DIR` 사용 (cwd 변경 대비)

---

## Guardrail 1 — Secret Scanner (PreToolUse)

| 항목 | 내용 |
|---|---|
| 필요성 | AWS 키, GH 토큰, JWT, API 키가 디스크에 쓰이거나 쉘로 파이프되기 전 차단 |
| 도구 | [gitleaks](https://github.com/gitleaks/gitleaks) |
| 참조 repo | [coo-quack/sensitive-canary](https://github.com/coo-quack/sensitive-canary), [mintmcp/agent-security](https://github.com/mintmcp/agent-security) |
| 매칭 | `Edit\|Write\|MultiEdit\|Bash` |
| 매핑 영역 | `files/scripts/secret-scan.sh` (신규) |

**스크립트 동작**: stdin JSON에서 `tool_input.content / new_string / command`를 `jq`로 추출 → `gitleaks detect --pipe --no-banner` 파이프 → 감지 시 exit 2.

**기사와의 연결**: "deterministic over prose" — 시크릿 금지 룰이 CLAUDE.md에 있어도 prose는 권고일 뿐. exit 2 hook만 법.

---

## Guardrail 2 — ruff + mypy Auto-pass (PostToolUse)

| 항목 | 내용 |
|---|---|
| 필요성 | Claude의 Python 출력을 정규화, 타입 에러를 즉시 surface |
| 도구 | [ruff](https://github.com/astral-sh/ruff), [mypy](https://github.com/python/mypy) |
| 참조 repo | [TMYuan/ruff-claude-hook](https://github.com/TMYuan/ruff-claude-hook), [astral 공식 plugin](https://docs.astral.sh/ruff/integrations/) |
| 매칭 | `Edit\|Write\|MultiEdit` (file_path가 `*.py`일 때만) |
| 매핑 영역 | hook inline command + `files/CLAUDE.md` 룰 보강 |

**스크립트 동작**: ruff fix 조용히 실행, mypy stderr만 Claude에 표시 (exit 0, 정보성).

**기사와의 연결**: "포매터/검증기가 코드의 최종형을 소유" — 모델이 아닌 결정론적 도구가 정답.

---

## Guardrail 3 — File Size Hard Limit (PostToolUse)

| 항목 | 내용 |
|---|---|
| 필요성 | CLAUDE.md의 800줄 한계를 실제 강제 |
| 도구 | bash + `jq` + `wc -l` |
| 참조 | ["Your CLAUDE.md Is a Suggestion"](https://medium.com/codetodeploy/your-claude-md-is-a-suggestion-hooks-make-it-law-0124c5783b68) |
| 매칭 | `Write\|Edit` |
| 매핑 영역 | `files/scripts/file-size-check.sh` (신규) |

**티어**:
- 400줄: 정보
- 500줄: 경고
- 800줄: hard block (exit 2)

**기사와의 연결**: "padded rooms" — 검색 공간 자체를 작게 유지해야 LLM이 sprawl 대신 composition을 한다.

---

## Guardrail 4 — Padded Room Path Guard (PreToolUse)

| 항목 | 내용 |
|---|---|
| 필요성 | `.env`, `.git/`, `*.pem`, lockfiles 등 민감 경로 차단. plan-mode 외에는 `core/domain/schema/` 외부 편집 금지 |
| 도구 | node/bash + `jq` |
| 참조 | ["Protecting .env with Claude Code Hooks"](https://jorgepit-14189.medium.com/protecting-your-env-file-with-claude-code-hooks-c0122019a575) |
| 매칭 | `Edit\|Write\|Bash` |
| 매핑 영역 | `files/scripts/padded-room.js` (신규) |

**스크립트 동작**: `tool_input.file_path` + `.command` (cat .env 우회 차단) 둘 다 검사 → deny-glob 매칭 시 exit 2. `$CLAUDE_PERMISSION_MODE == "plan"`이면 완화.

**기사와의 연결**: "blast radius 제한" — 에이전트 루프가 인프라 영역으로 못 새게.

---

## Guardrail 5 — Verification Gate on Stop

| 항목 | 내용 |
|---|---|
| 필요성 | "done / fixed / complete" 주장에 실제 테스트 통과 증거가 있는지 검증 |
| 도구 | bash + `jq` + 프로젝트 test 커맨드 |
| 참조 | [shipwithaiio 3-layer self-verification](https://dev.to/shipwithaiio/how-to-build-a-self-verification-loop-in-claude-code-3-layers-20-minutes-m1p) |
| 매칭 | `Stop` (기존 context-check와 array로 병렬) |
| 매핑 영역 | `files/scripts/verify-on-stop.sh` (신규), `files/settings.json` Stop array 확장 |

**스크립트 동작**:
1. `stop_hook_active` 체크로 무한 루프 방지
2. transcript에서 `done|fixed|complete|works now` 패턴 grep
3. 매칭 시 `pytest -x` (또는 `npm test`) 실행
4. 실패면 stderr 마지막 50줄과 함께 exit 2

**기사와의 연결**: "에벨이 보상 함수" — 모델은 자신을 평가할 수 없으므로 hook이 평가.

---

## Guardrail 6 — Immutability Lint via ast-grep (PostToolUse)

| 항목 | 내용 |
|---|---|
| 필요성 | CLAUDE.md의 불변성 룰을 AST 수준에서 검증 (`.push()`, `.sort()`, `Object.assign` 등) |
| 도구 | [ast-grep](https://github.com/ast-grep/ast-grep) |
| 참조 | [ast-grep/agent-skill](https://github.com/ast-grep/agent-skill), [TSX 카탈로그](https://ast-grep.github.io/catalog/tsx/) |
| 매칭 | `Edit\|Write\|MultiEdit` (`*.{ts,tsx,js,jsx}` 또는 `*.py`) |
| 매핑 영역 | `files/ast-grep/no-mutation.yml` (신규), inline hook command |

**룰 예시**:
```yaml
rule:
  any:
    - pattern: $A.push($$$)
    - pattern: $A.sort()
    - pattern: Object.assign($X, $$$)
```

**기사와의 연결**: "structural lints, not prose" — regex로 못 잡는 패턴을 AST가 잡음.

---

## Guardrail 7 — Context Hygiene Injector (UserPromptSubmit)

| 항목 | 내용 |
|---|---|
| 필요성 | 매 prompt에 현재 branch/last test status/permission mode 자동 주입 (prompt injection 회피 위해 명령형 아닌 사실형) |
| 도구 | `git`, `gh`, bash |
| 참조 | [disler/claude-code-hooks-mastery `user_prompt_submit.py`](https://github.com/disler/claude-code-hooks-mastery/tree/main/.claude/hooks) |
| 매칭 | `UserPromptSubmit` (모든 prompt) |
| 매핑 영역 | `files/scripts/inject-context.sh` (신규) |

**스크립트 동작**: stdout으로 `"Branch: $(git branch --show-current). Last test: $(cat .last-test 2>/dev/null). Mode: $CLAUDE_PERMISSION_MODE."` 출력 → 추가 컨텍스트로 포함.

**기사와의 연결**: "상태는 prompt에 두고 모델 머릿속에 두지 마라" — hook이 매 턴 ground truth 소유.

**토큰 최적화 commit (`1a9bc74`)와 trade-off**: 매 prompt에 토큰을 추가하는 hook이므로, 60% 자동 컴팩트 정책과 충돌 가능. 적용 전 `.claudeignore`로 큰 파일은 이미 차단했는지 먼저 확인. injector 출력은 80자 이내로 빡빡하게 유지 권장.

---

## Guardrail 8 — `.claudeignore` 누락 감지 (PostToolUse — 신규 추천)

| 항목 | 내용 |
|---|---|
| 필요성 | commit `1a9bc74`에서 추가한 `files/.claudeignore.template`가 새 프로젝트에 안 깔리면 효과 0. cwd에 `.claudeignore` 없고 `node_modules/` 있으면 경고 |
| 도구 | bash + `test -f` |
| 참조 | 자체 작성 (commit `1a9bc74` 후속) |
| 매칭 | `UserPromptSubmit` (세션 시작 시 1회만, flag 파일로 dedup) |
| 매핑 영역 | `files/scripts/claudeignore-check.sh` (신규) |

**스크립트 동작**:
```bash
if [ -d "node_modules" ] && [ ! -f ".claudeignore" ]; then
  echo "WARN: .claudeignore missing — copy from ~/claude-code-setup/files/.claudeignore.template"
fi
```

**기사와의 연결**: "휴먼 컨텍스트가 희소" — `.claudeignore` 누락 시 매 Glob/Grep마다 수천 토큰이 노이즈로 새는데 사람은 모름. hook이 1회 경고.

---

## settings.json 통합 예시 (변경 후)

기존 `Stop` 하나에서, 새 hooks를 합친 형태:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [
        { "type": "command", "command": "bash $CLAUDE_PROJECT_DIR/files/scripts/inject-context.sh" }
      ]}
    ],
    "PreToolUse": [
      { "matcher": "Edit|Write|MultiEdit|Bash",
        "hooks": [
          { "type": "command", "command": "bash ~/.claude/scripts/secret-scan.sh", "timeout": 10 }
        ]},
      { "matcher": "Edit|Write|Bash",
        "hooks": [
          { "type": "command", "command": "node ~/.claude/scripts/padded-room.js", "timeout": 10 }
        ]}
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command",
            "command": "bash -c 'F=$(jq -r .tool_input.file_path); [[ $F == *.py ]] && { ruff check --fix \"$F\" >/dev/null 2>/dev/null; mypy --no-error-summary \"$F\" 2>&1 | head -20 >&2; }; exit 0'" }
        ]},
      { "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "bash ~/.claude/scripts/file-size-check.sh", "timeout": 3000 }
        ]},
      { "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command",
            "command": "bash -c 'F=$(jq -r .tool_input.file_path); [[ $F =~ \\.(ts|tsx|js|jsx|py)$ ]] && ast-grep scan --rule ~/.claude/ast-grep/no-mutation.yml \"$F\" >&2; exit 0'" }
        ]}
    ],
    "Stop": [
      { "hooks": [
        { "type": "command", "command": "bash ~/.claude/scripts/check-context.sh" },
        { "type": "command", "command": "bash ~/.claude/scripts/verify-on-stop.sh" }
      ]}
    ]
  }
}
```

---

## 적용 우선순위

블랜드 적용보다 단계적 도입 권장 (각 단계 후 1주 사용 안정성 검증):

1. **Secret scanner** (Guardrail 1) — 위험도 가장 높고 false positive 적음
2. **File size limit** (Guardrail 3) — 단순 bash, 검증 명확
3. **`.claudeignore` 누락 감지** (Guardrail 8) — commit `1a9bc74` 효과 보장, 5줄 스크립트
4. **ruff auto-pass** (Guardrail 2) — Python 코드 즉시 정규화 효과
5. **Verification gate on Stop** (Guardrail 5) — "done" 거짓 주장 방지
6. **Padded room path guard** (Guardrail 4) — false positive 조정 필요
7. **Context injector** (Guardrail 7) — 토큰 추가 비용 — 60% autocompact와 trade-off 고려
8. **ast-grep immutability** (Guardrail 6) — 룰 튜닝 비용 큼

---

## 카노니컬 참조

본 setup 확장 시 추가 마이닝할 곳:

- **[disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery)** — 13개 hook event 전체, UV single-file Python 스크립트, `$CLAUDE_PROJECT_DIR` 패턴
- **[Claude Code Hooks 공식 문서](https://code.claude.com/docs/en/hooks)** — exit code / matcher 시맨틱
- **[Pixelmojo "6 Production Patterns"](https://www.pixelmojo.io/blogs/claude-code-hooks-production-quality-ci-cd-patterns)**
- **[Boucle "PreToolUse from Scratch"](https://blog.boucle.sh/posts/how-to-write-a-claude-code-pretooluse-hook/)**

---

## 핵심 gotcha (실제 적용 시 주의)

1. **exit code 1은 경고만**. 차단하려면 무조건 **exit 2**
2. **Stop hook 무한 루프** — `stop_hook_active` 가드 필수
3. **Bash matcher 누락 시 우회 가능** — Claude가 `cat .env` 같은 식으로 file-path-only 체크 회피
4. **경로는 `$CLAUDE_PROJECT_DIR` 사용** — `~`는 cwd 변경 시 깨짐
5. **timeout 설정** — 무거운 hook이 매 edit를 막으면 워크플로 마비
6. **모든 hook은 stdin JSON 처리 필요** — `jq` 의존 (Mac에선 `brew install jq` 사전 필요)
