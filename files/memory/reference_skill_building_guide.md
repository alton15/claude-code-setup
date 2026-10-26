---
name: skill-building-guide
description: Anthropic 공식 스킬 빌딩 가이드 핵심 요약 - 커스텀 스킬 생성/테스트/배포 시 참고
type: reference
---

# The Complete Guide to Building Skills for Claude (Anthropic, 2026)

## Skill 구조
- `SKILL.md` (필수): YAML frontmatter + Markdown 본문
- `scripts/` (선택): 실행 가능 코드 (Python, Bash 등)
- `references/` (선택): 참조 문서
- `assets/` (선택): 템플릿, 폰트, 아이콘

## Progressive Disclosure (3단계)
1. **YAML frontmatter**: 항상 시스템 프롬프트에 로드. 스킬 사용 여부 판단용
2. **SKILL.md 본문**: 스킬이 관련 있다고 판단되면 로드
3. **Linked files**: 필요 시 Claude가 탐색/발견

## 네이밍 규칙 (CRITICAL)
- 폴더: kebab-case만 (`notion-project-setup`). 스페이스/언더스코어/카멜케이스 불가
- 파일: 정확히 `SKILL.md` (대소문자 구분)
- name 필드: kebab-case, 폴더명과 일치
- 스킬 폴더 안에 README.md 넣지 말 것 (모든 문서는 SKILL.md 또는 references/)

## YAML frontmatter 필수 필드
- `name`: kebab-case, 스페이스/대문자 불가
- `description`: WHAT + WHEN + Key capabilities. 1024자 이내. XML 태그 불가. 구체적 트리거 문구 포함

### description 공식
```
[What it does] + [When to use it] + [Key capabilities]
```

### 선택 필드
- `license`, `compatibility` (1-500자), `metadata` (author, version, mcp-server 등)
- `allowed-tools`: 도구 접근 제한

## 보안 제한
- frontmatter에 XML 꺽쇠(`< >`) 금지
- name에 "claude"/"anthropic" 금지

## 본문 작성 Best Practices
- 구체적이고 실행 가능하게 작성 (Bad: "데이터 검증하세요" / Good: 구체적 명령어+일반적 오류 포함)
- 에러 핸들링 포함
- progressive disclosure: 핵심만 SKILL.md에, 상세 문서는 `references/`로
- SKILL.md는 5,000 단어 이하

## 5가지 패턴
1. **Sequential Workflow**: 순차 MCP 호출. 단계별 의존성+검증+롤백
2. **Multi-MCP Coordination**: 여러 MCP 서비스 간 데이터 전달. 단계별 검증
3. **Iterative Refinement**: 품질 기준 충족까지 반복. 검증 스크립트 활용
4. **Context-Aware Tool Selection**: 컨텍스트에 따라 다른 도구 선택. 판단 기준+폴백 명시
5. **Domain-Specific Intelligence**: 도구 접근 넘어 전문 지식 임베딩. 컴플라이언스 체크 등

## 테스트 3영역
1. **Triggering**: 의도한 쿼리에 트리거되고, 무관한 쿼리에는 안 되는지
2. **Functional**: 올바른 출력, API 성공, 에지케이스 처리
3. **Performance**: 스킬 유/무 비교 (토큰 소비, 도구 호출 수, 실패율)

## 배포
- GitHub 공개 레포 + 설치 가이드
- Claude.ai: Settings > Capabilities > Skills에서 업로드
- Claude Code: skills 디렉토리에 배치
- API: `/v1/skills` 엔드포인트, `container.skills` 파라미터

## 트러블슈팅
- **트리거 안 됨**: description에 트리거 문구/파일 타입 추가
- **과다 트리거**: negative trigger 추가, 스코프 명확화
- **지시 미준수**: 지시문 간결화, 중요한 것 상단에, `## Important`/`## Critical` 헤더 사용
- **Model laziness**: Performance Notes 섹션 추가 ("품질 > 속도", "검증 생략하지 말 것")
- **컨텍스트 비대**: SKILL.md 5,000단어 이하, references/ 활용, 동시 활성 스킬 20-50개 이하

## 도구
- `skill-creator`: Claude.ai/Code 내장. 설명에서 스킬 생성, 리뷰, 트리거 제안
- 사용법: "Use the skill-creator skill to help me build a skill for [use case]"
