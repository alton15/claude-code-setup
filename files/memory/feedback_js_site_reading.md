---
name: JS 렌더링 사이트 자동 읽기
description: JS/SPA 사이트를 읽어야 할 때 Jina Reader(r.jina.ai/) 프리픽스를 자동으로 사용하고, Firecrawl MCP가 설정되면 그것도 활용
type: feedback
---

JS로 렌더링되는 사이트(React, Vue, Next.js CSR 등)를 읽어야 할 때 자동으로 적절한 도구를 사용할 것.

**Why:** 일반 WebFetch로는 CSR 사이트의 빈 `<div id="root"></div>`만 보임. 사용자가 필요할 때 알아서 쓰라고 지시함 (2026-04-01).

**How to apply:**
1. **Jina Reader** (즉시 사용 가능): `WebFetch`로 `https://r.jina.ai/{target_url}` 호출 — 설치 불필요
2. **Firecrawl MCP** (설정 후 사용): MCP 도구로 직접 호출 — API 키 설정 필요
3. JS 사이트인지 판단이 어려우면 일단 일반 WebFetch 시도 후, 내용이 비어있으면 Jina Reader로 재시도
4. 사용자에게 매번 묻지 말고 자동으로 판단해서 사용
