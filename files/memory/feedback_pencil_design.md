---
name: Pencil MCP로 디자인 작업
description: 디자인 작업 시 Pencil MCP 도구를 사용하여 .pen 파일로 디자인할 것
type: feedback
---

디자인 작업이 필요할 때 Pencil MCP 도구를 적극 활용할 것.

**Why:** 사용자가 CLI 기반 워크플로우를 선호하며, Pencil MCP가 연결되어 있으므로 디자인도 CLI에서 처리하길 원함.

**How to apply:**
- UI/UX 디자인, 화면 설계, 목업 작업 시 → Pencil MCP 도구 사용
- get_editor_state → open_document → get_guidelines/get_style_guide → batch_design 순서로 작업
- .pen 파일은 반드시 Pencil MCP 도구로만 읽고 수정 (Read/Grep 사용 금지)
- 디자인 후 get_screenshot으로 시각적 검증
