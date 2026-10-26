---
name: no-docs-in-repo
description: Never create docs/ directory in repos - always gitignore it
type: feedback
---

자동 생성되는 문서(플랜, superpowers 등)는 repo에 커밋하지 않는다. docs/ 디렉토리는 항상 .gitignore에 포함.

**Why:** 사용자가 불필요한 docs 파일이 repo에 들어가는 것을 싫어함. 플랜 문서는 소스 오브 트루스가 아님.

**How to apply:** 새 프로젝트나 플랜 작성 시 docs/ 폴더 생성하지 말 것. 이미 있으면 gitignore에 추가하고 삭제.
