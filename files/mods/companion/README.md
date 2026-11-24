# companion

Claude Code 옆 "현황" 패널에 사용량(5시간 · 주간 · Fable 같은 모델별 주간 한도 · 추가 사용 크레딧), 지금 쓰는 모델, 진행 중인 툴, 태스크를 띄우고, 원하면 내가 뭘 할 때마다 표정이 바뀌는 데스크톱 캐릭터도 띄우는 개인용 mod.

## 패널에 나오는 것

```
── 사용량
컨텍스트 ███░░░│░░░ 32% 64k/200k
         │ 60%에서 자동 압축
5시간    ████░░░░░░ 41% ↻ 15:00
7일      ██░░░░░░░░ 20% ↻ 3일 뒤
Fable    ████░░░░░░ 37.5% ↻ 3일 뒤
         ⚠ 이 속도면 19:40 소진
추가사용 $12.40 / $50.00
비용     $3.21 · 1h05m
── 모델
Fable 5.2 · high
── 진행 중 (1)
⟳ Bash npm test 12s
── 태스크 1/3
▶ Writing tests
```

| 줄 | 어디서 오나 |
| --- | --- |
| 컨텍스트 | 엔진(`$.session.usage`). `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 가 있으면 그 지점에 `│` 눈금을 긋고, 5%p 앞에서 미리 경고한다 |
| 5시간 · 7일 | 엔진의 rate limit 값 |
| Fable · Sonnet · Opus (모델별 주간) | 계정 사용량 엔드포인트(`/usage` 가 읽는 것, `api.anthropic.com/api/oauth/usage`). 엔진이 넘겨주지 않는 값이라 mod 가 직접 읽는다. 토큰은 엔진이 쥐고 mod 는 불투명 핸들만 받는다 |
| 추가사용 | 같은 엔드포인트의 `extra_usage`. 켜져 있을 때만 |
| ⚠ 이 속도면 … 소진 | 지금까지 쓴 속도로 리셋 전에 한도가 차면 그 시각 (10% 이상 썼고 창의 10% 이상 지났을 때만) |
| 비용 | 세션 비용과 세션 경과 시간 |
| 모델 | 메인 루프의 마지막 요청 모델과 effort (서브에이전트 요청은 무시). `/model` 전환이나 fallback 이 바로 보인다 |

모델별 주간 값은 세션 시작 때, 5분마다, 턴이 끝날 때(2분에 한 번까지) 확인한다. 이 엔드포인트는 계정 단위로 rate limit 이 걸리므로 모든 세션이 `~/.claude/companion/usage.json` 하나를 같이 쓴다: 어느 세션이든 5분 안에 읽은 값이 있으면 그 값을 쓰고, 2분 안에 다른 세션이 읽으러 갔으면 기다린다. 그래서 세션이 몇 개든 계정 전체로 5분에 한 번쯤만 부른다. 429 가 오면 모든 세션이 10분 → 20분 → 30분(최대) 동안 읽지 않고, 서버가 `Retry-After` 로 더 긴 시간을 주면 그만큼 기다린다(`/hud refresh` 도 이 동안은 부르지 않는다). 구독 로그인이 아니면(API 키) 그 줄들은 조용히 빠지고, 읽기에 실패하면 `모델별 못 읽음 (HTTP 429) · 3m00s 전 값` 처럼 마지막 값을 유지한 채 이유를 보여주고, 429 대기 중이면 다음 줄에 `모든 세션이 7m00s 뒤 다시 읽음` 을 보여준다. Fable 등 모델별 주간 한도가 90%를 넘으면 한 번 토스트로 알린다.

## 데스크톱 캐릭터 (선택)

- **데스크톱 앱** (`desktop/`): `/hud desktop` 으로 켜는 투명 오버레이 앱. 세션이 시작될 때 자동으로 켜지지 않는다. 기본으로는 화면에 보이지 않으므로 메뉴바 ♪ → 화면에 띄우기를 켜야 보인다. 마우스 추적(따라다니기·쳐다보기)도 기본으로 꺼져 있다. 표정/대사는 `~/.claude/companion/state.json` 으로 받는다
- **3D 렌더러** (`desktop/web/`, `desktop/Model3D.swift`): VRM 모델이 있으면 three.js + three-vrm 3D 캐릭터로 바뀐다. 마우스 추적을 켜면 커서를 고개와 눈으로 따라보고, 기분마다 표정·자세(타이핑, 깡충, 고개 갸웃, 졸기)가 달라지고, 말풍선이 뜨는 동안 입이 움직인다

```bash
./desktop/build.sh                       # ~/.claude/companion/Companion.app 빌드 (npm 있으면 3D 렌더러 포함)
# 이미지: ~/.claude/companion/assets/<mood>/*.png
#   mood = idle curious thinking working happy error sleepy (없으면 idle 로 대체)
# 3D 모델: ~/.claude/companion/model/model.vrm (없으면 폴더의 첫 .vrm, 그것도 없으면 2D 이미지)
```

캐릭터 이미지와 3D 모델은 저장소에 넣지 않는다. BOOTH 등에서 개인 사용이 허락된 VRM(0.x/1.0 모두 가능)을 받아 `model/model.vrm` 으로 두고 앱을 다시 띄우면 된다(`/hud quit` → `/hud desktop`). 모델 로드에 실패하면 로그(`Console.app`, `Companion`)에 사유를 남기고 2D 이미지로 돌아간다.

VRM 없이 VRChat용 FBX만 주는 모델은 `desktop/tools/fbx2vrm/` 으로 VRM 1.0 으로 바꾼다. `model-map.mjs` 는 작성자가 쓰는 [ゆきはね式ミク free](https://booth.pm/ja/items/7428125)(©ゆきはね, VN3 라이선스: 개인·비영리 사용과 개조는 허용, 재배포 금지, 크레딧 표기 필요)의 본·텍스처 이름에 맞춰져 있다. 다른 모델은 `inspect.mjs` 로 본·블렌드셰이프 이름을 보고 `model-map.mjs` 를 그 모델에 맞게 고친다.

```bash
# unitypackage 를 풀어 model.fbx 와 tex/*.png 를 한 폴더에 모은 뒤
ln -s ~/.claude/companion/build/node_modules desktop/tools/fbx2vrm/node_modules
node desktop/tools/fbx2vrm/convert.mjs <그 폴더> ~/.claude/companion/model/model.vrm
```

## 설치

mod 폴더를 `~/.claude/mods/companion` 에 두고 `~/.claude/settings.json` 의 `env` 에 `"CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/mods/companion"` 를 넣는다. 세션이 시작되면 패널이 열린다(터미널이 좁으면 `/hud`).

## 사용

| 명령 | 동작 |
| --- | --- |
| `/hud` | 현황 패널 열기 |
| `/hud refresh` | 모델별 주간 · 추가사용 바로 새로 읽기 (429 대기 중에는 언제 다시 읽는지만 알려줌) |
| `/hud desktop` | 데스크톱 앱 실행 |
| `/hud quit` | 데스크톱 앱 종료 |
| `/hud reload` | 이미지 폴더 다시 읽기 |

메뉴바 ♪ 아이콘: 마우스 추적 on/off(기본 off), 화면에 띄우기 on/off(기본 off, 꺼도 패널 쪽 상태는 계속 갱신된다), 크기(작게/보통/크게), 종료. 추적이 꺼져 있으면 정면을 보고 제자리에 서 있고, 드래그로 옮기면 그 자리를 기억하며, 클릭하면 반응한다.

## 표정 규칙

| 상황 | mood |
| --- | --- |
| 프롬프트 입력 중 | curious |
| 전송 직후 / Read·Grep·Web | thinking |
| Edit·Bash·Agent 등 | working |
| 턴 완료 | happy |
| 툴 실패 · 중단 · 경고(컨텍스트 80%↑ 또는 자동 압축 5%p 전, 한도 90%↑) | error |
| 5분 무입력 | sleepy |

## 개발

```bash
claude plugin validate .
claude plugin test .
npx -y -p typescript@5 tsc -p .   # 엔진이 한 번 로드해 .claude-plugin/types/ 가 생긴 뒤
```

3D 렌더러만 고칠 때: `desktop/web/` 을 수정하고 `./desktop/build.sh`. npm 의존성(three, @pixiv/three-vrm, esbuild)은 mod 폴더가 아니라 `~/.claude/companion/build/` 에 설치된다.
