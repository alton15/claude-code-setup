# LLM 시대의 엔지니어 — 키워야 할 4가지 능력과 적용 도구

> 출처 영감: [Reindeer — LLM 시대의 엔지니어링](https://news.hada.io/topic?id=30060)
> 핵심: 휴먼 컨텍스트가 가장 희소한 자원. 모델링·API 설계·아키텍처는 사람, 나머지는 LLM + 자동 검증 레이어.

이 문서는 각 능력 카테고리에 대해 **실제로 Claude Code 워크플로에 통합 가능한** 오픈소스 도구·repo·skill만 정리한다.
이미 본 setup에 들어있는 항목과 중복되지 않게 dedup함:
- 플러그인: superpowers, dx, cli-anything
- 커스텀 커맨드 5개: /review, /quick-commit, /verify, /handoff, /parallel-plan
- wshobson 커맨드 4개: /slo-implement, /sql-migrations, /incident-response, /security-sast
- wshobson 에이전트 4개: observability, database-admin, mlops, threat-modeling
- 토큰 최적화 (commit `1a9bc74`): `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=60`, `.claudeignore.template`, 모델 믹스 룰 (Haiku 4.5 / Sonnet 4.6 / Opus 4.8)

---

## 1. Domain Modeling & API Design

LLM이 가장 잘 표류하는 영역. "스키마 먼저, 코드는 생성물" 원칙을 강제하는 도구들.

| 도구 | 역할 | Claude Code 통합 방법 |
|---|---|---|
| **[ariga/atlas](https://github.com/ariga/atlas)** | 선언적 DB 스키마 마이그레이션 (Postgres/MySQL), 50+ destructive-change 린터. 자체 Claude Code Agent Skill 제공 | skill 설치 → `atlas schema apply --dry-run`을 pre-merge 게이트로. 기존 `database-admin` 에이전트와 짝지어 사용 |
| **[koxudaxi/datamodel-code-generator](https://github.com/koxudaxi/datamodel-code-generator)** | OpenAPI / JSON Schema / GraphQL → Pydantic v2 / msgspec / dataclasses 자동 생성. LLM이 필드를 지어내지 못하게 계약에 lock | CLAUDE.md 룰: "`models/generated/*.py`는 손으로 수정 금지. `datamodel-codegen --input openapi.yaml` 실행" |
| **[koxudaxi/fastapi-code-generator](https://github.com/koxudaxi/fastapi-code-generator)** | Spec-first FastAPI 스켈레톤 생성기 | `/regen-api` 슬래시 커맨드 추가 — codegen 재실행 후 handler diff 표시 |
| **[ast-grep/ast-grep](https://github.com/ast-grep/ast-grep)** + **[ast-grep-mcp](https://github.com/ast-grep/ast-grep-mcp)** | Tree-sitter 기반 구조적 search/rewrite, MCP 서버로 노출 | MCP 서버 등록 — Claude가 regex 대신 AST 패턴으로 외과적 리팩터 가능 |

**왜 중요한가**: 기사의 "tech debt 경제학 역전" — 재작성 비용은 0에 수렴하지만, 모델링 실수는 기하급수로 복잡해진다. 스키마를 코드의 source of truth로 만들어야 LLM이 매번 일관된 출력을 낸다.

---

## 2. Eval/Test Design — LLM 워크플로의 보상함수

"좋은 테스트가 LLM 에이전트를 제어하는 보상 함수다." 단순 unit test가 아니라 동작·정확도·회귀를 측정하는 eval framework.

| 도구 | 역할 | Claude Code 통합 방법 |
|---|---|---|
| **[UKGovernmentBEIS/inspect_ai](https://github.com/UKGovernmentBEIS/inspect_ai)** | UK AISI eval 프레임워크. Dataset/Solver/Scorer 추상화 — 에이전트·툴 사용까지 평가 | skill로 `evals/<feature>/task.py` 스캐폴드. Scorer 함수가 곧 reward function |
| **[promptfoo/promptfoo](https://github.com/promptfoo/promptfoo)** | YAML 선언형 eval, 50+ assertion, red-team 플러그인, CI 실행 | `PostToolUse` 훅 — `prompts/` 하위 편집 시 `promptfoo eval --filter-pattern` 자동 실행 |
| **[confident-ai/deepeval](https://github.com/confident-ai/deepeval)** | pytest-native LLM 테스트 (`assert_test`, G-Eval, Faithfulness). 기존 pytest CI에 그대로 얹힘 | `/verify` 확장 — unit test + `pytest tests/llm/` 같이 실행 |
| **[explodinggradients/ragas](https://github.com/explodinggradients/ragas)** | RAG 전용 metric (context precision, faithfulness, answer relevancy) + synthetic testset 생성 | `/eval-rag` 커맨드 — 골든셋 로드 후 마지막 커밋 대비 metric delta 출력 |

**왜 중요한가**: 오버나잇 변경에서 시스템 동작이 무너졌는지 확인하는 유일한 방법. 백엔드 SRE 백그라운드와 직결되는 영역(observability + eval pipeline = SRE 사고방식의 LLM 버전).

---

## 3. Context Management — 인간/LLM 양쪽의 컨텍스트 윈도우 관리

기사의 "휴먼 컨텍스트가 가장 희소한 자원" 명제에 대한 직접적 대응.

| 도구 | 역할 | Claude Code 통합 방법 |
|---|---|---|
| **[yamadashy/repomix](https://github.com/yamadashy/repomix)** | 전체 repo를 XML/MD 한 파일로 패킹, 파일별 토큰 카운트, `.gitignore` 준수 | `/pack` 커맨드 — `repomix --compress --include "src/**/*.py"`로 fresh subagent seed |
| **[Aider — repomap](https://aider.chat/docs/repomap.html)** | Tree-sitter + PageRank로 가장 참조 많은 심볼을 토큰 예산 안에 선택 | skill에서 `aider --show-repo-map` 호출, 큰 작업 초기 컨텍스트로 paste |
| **[mufeedvh/code2prompt](https://github.com/mufeedvh/code2prompt)** | Handlebars 템플릿, glob 필터, git-diff 포함, MCP 서버 제공 | MCP 서버 등록 — Claude가 필요할 때 scoped context 요청 가능 |
| **[simonw/files-to-prompt](https://github.com/simonw/files-to-prompt)** | 최소 concat 도구, `--cxml`/`--ignore` 플래그, `llm` CLI와 페어링 | CLAUDE.md 룰: cross-cutting 질문은 `files-to-prompt path/ -e py --cxml` 실행 후 paste |

**보조 (이미 갖춘 것 — commit `1a9bc74` 반영 후)**:
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=60` — 60%에서 자동 컴팩트, prompt cache 유지
- `files/.claudeignore.template` — 프로젝트 단위로 `node_modules/dist/lock/__pycache__` 차단 (repomix와 상호 보완: claudeignore는 "Claude가 못 보게", repomix는 "Claude에게 압축해서 보여주게")
- `dx:half-clone` — 50%+ 컨텍스트에서 후반부만 클론
- `Explore` subagent — 메인 컨텍스트 보호용 read-only 검색
- CLAUDE.md 룰: 한 대화 한 주제 (캐시 유지), 페이즈 중 모델 스위치 금지, 모델 믹스(Haiku 4.5/Sonnet 4.6/Opus 4.8)

**왜 중요한가**: 토큰을 더 안 쓰는 게 아니라 "올바른 토큰만 쓰는" 능력이 곧 throughput. 글로벌 CLAUDE.md의 "Context Management & Token Optimization" 섹션과 `.claudeignore`가 이미 토대를 깔았음 — repomix/code2prompt 같은 도구가 이를 능동적 패킹 전략으로 확장.

---

## 4. Code Review — LLM 산출물을 빠르게 판독하는 능력

생산은 LLM, 판독은 사람. 읽는 속도가 곧 처리량. diff noise를 줄이고 진짜 변경만 보이게 하는 도구들.

| 도구 | 역할 | Claude Code 통합 방법 |
|---|---|---|
| **[Wilfred/difftastic](https://github.com/Wilfred/difftastic)** | Tree-sitter 구조 diff. LLM의 whitespace/import churn을 trivial diff로 변환 | `GIT_EXTERNAL_DIFF=difft git diff` 별칭 + CLAUDE.md 룰: "LLM PR review는 difft로" |
| **[semgrep/semgrep-rules](https://github.com/semgrep/semgrep-rules)** + **[semgrep/skills](https://github.com/semgrep/skills)** | 4000+ OWASP-mapped 룰, 공식 Claude Code Skill 팩 | skill 설치 + pre-commit (`semgrep --config p/python --config p/owasp-top-ten --error`) |
| **[Astral ruff Claude Code plugin](https://docs.astral.sh/ruff/integrations/)** + **[ruff-pre-commit](https://github.com/astral-sh/ruff-pre-commit)** | `/astral:ruff`, `/astral:uv`, `/astral:ty` 슬래시 커맨드 + `PostToolUse` 자동 포맷 | 플러그인 설치 + `*.py` PostToolUse에서 `ruff check --fix && ruff format` |
| **[VoltAgent/awesome-claude-code-subagents — code-reviewer](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/04-quality-security/code-reviewer.md)** | Severity-tagged review subagent. 기존 4 에이전트와 안 겹침 | `.claude/agents/`에 drop, `/quick-commit` 후 push 전 invoke |

**왜 중요한가**: 기사의 "양극화 경고" — LLM 잘 쓰는 사람은 초생산적이 되지만 못 쓰는 사람은 팀에 순마이너스가 된다. 판독 능력이 곧 LLM 활용 능력.

---

## 우선순위 적용 가이드

본 setup에 즉시 추가하기 권장하는 순서 (ROI 기준):

1. **datamodel-code-generator + CLAUDE.md 룰** — 0분 셋업, 모델링 표류 즉시 방지
2. **ruff Claude Code 플러그인** — 플러그인 install 1줄, Python edit마다 자동 lint
3. **repomix `/pack` 커맨드** — npm 한 줄, subagent dispatch 효율 즉시 향상
4. **deepeval — `/verify` 확장** — 기존 pytest CI에 그대로 얹힘
5. **difftastic + git alias** — review 속도 즉시 향상
6. **semgrep skill 설치** — 보안 검증 자동화
7. **inspect_ai** — 본격 eval 작업 시작할 때

이 중 hook으로 강제할 항목은 [guardrails.md](./guardrails.md)에서 다룸.

---

## 변경 요약

- 신규 파일: `docs/skills-to-develop.md` (이 문서)
- 기존 설정 변경: 없음 (참고/계획 문서)
- 토큰 최적화 commit (`1a9bc74`) 기반 보강 반영 — `.claudeignore` 와 60% autocompact 와 모델 믹스를 보조 항목으로 명시
- 후속 적용 시 변경될 영역:
  - `files/CLAUDE.md` — 모델링/codegen 룰 추가
  - `files/commands/` — `/pack`, `/regen-api`, `/eval-rag` 신규
  - `files/skills/` — atlas / semgrep / ast-grep / inspect_ai skill 설치
  - `files/settings.json` — ruff plugin 활성화 + 신규 hooks (guardrails.md 참조)
  - `files/.claudeignore.template` — eval/test/fixture 디렉토리는 명시적으로 unblock (Claude가 eval 결과를 읽어야 하므로)
