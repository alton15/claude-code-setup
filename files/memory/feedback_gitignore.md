---
name: gitignore-cleanup
description: Always add build artifacts, internal docs, and non-essential files to .gitignore proactively
type: feedback
---

빌드 바이너리, 내부 작업 문서 등 작업에 불필요한 파일은 항상 .gitignore에 추가할 것.

**Why:** 유저가 레포를 깔끔하게 유지하길 원함. untracked 파일이 git status에 노이즈로 남는 것을 싫어함.

**How to apply:** 새 프로젝트 셋업이나 빌드 후 untracked 파일이 보이면, 작업 결과물이 아닌 파일(바이너리, 캐시, 내부 문서 등)은 .gitignore에 추가하고 알려줄 것. 커밋 전 git status에서 불필요한 파일이 없는지 확인.
