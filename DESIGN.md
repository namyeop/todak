# Design System — 토닥

## Product Context
- **What this is:** 수면 전 감정 위로 음성 대화 서비스. 사주에서 영감받은 "설명 없이 나를 알아주는 느낌."
- **Who it's for:** 20~30대 혼자 사는 직장인/프리랜서. 밤에 감정이 몰려오는 사람.
- **Space/industry:** 수면/명상/위로. 인접 경쟁: Calm, Headspace, ASMR, ChatGPT 음성 모드.
- **Project type:** PWA 웹앱 (모바일 퍼스트)

## Aesthetic Direction
- **Direction:** Luxury/Refined + Organic — 밤늦은 시간, 은은한 조명의 따뜻한 방.
- **Decoration level:** Intentional — 호흡하는 오브가 유일한 시각적 장식. 미세한 배경 그레인 허용.
- **Mood:** 따뜻하고 조용한 친밀감. 임상적 상담실이 아니라 소설 속 대화 같은 느낌. 차갑지도, 과하게 밝지도 않은 — 램프 하나 켜놓은 방.
- **Key risk — why Todak looks different:** 세리프 폰트 + 앰버 액센트 + 단일 오브 비주얼. 웰니스 앱의 블루/산세리프/자연이미지 공식을 의도적으로 깨뜨림.

## Typography
- **Display/Hero:** Noto Serif KR (weight 300) — 문학적 친밀감. 이 공간에서 세리프는 토닥의 가장 큰 시각적 차별점.
- **Body:** Noto Serif KR (weight 300~400) — display와 body를 같은 폰트로 유지하여 톤 일관성 확보.
- **UI/Labels:** Pretendard (weight 300~400) — 상태 텍스트, 버튼, 메타데이터에 사용. 깨끗한 가독성.
- **Data/Tables:** Pretendard (tabular-nums) — 시간 표시, 세션 번호 등.
- **Code:** 해당 없음 (사용자 대면 코드 없음).
- **Loading:**
  - Noto Serif KR: `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500&display=swap`
  - Pretendard: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`
- **Scale:**
  - 2XL: 32px / 2rem — 제품명 (토닥)
  - XL: 24px / 1.5rem — 주요 질문 ("오늘 하루 어땠어?")
  - LG: 18px / 1.125rem — 서브타이틀
  - MD: 15px / 0.95rem — 본문, 에이전트 응답
  - SM: 12px / 0.75rem — UI 레이블, 상태 텍스트
  - XS: 10px / 0.625rem — 타임스탬프, 메타데이터

## Color
- **Approach:** Restrained — 워밍 액센트 1개 + 뉴트럴. 색상은 드물고 의미 있게.
- **Background:** #111010 (deep warm black)
- **Background Elevated:** #1a1918 (카드, 모달)
- **Background Surface:** #201f1d (인풋, 영역 구분)
- **Foreground:** #d4cdc4 (warm cream — 본문 텍스트)
- **Foreground Dim:** #6b6560 (보조 텍스트, 상태)
- **Foreground Muted:** #4a4540 (비활성, 힌트)
- **Accent:** #c8a882 (warm amber/gold — 프라이머리 액션, 오브 테두리, 강조)
- **Accent Dim:** rgba(200, 168, 130, 0.08) (오브 배경, 호버 상태)
- **Accent Border:** rgba(200, 168, 130, 0.12) (카드/섹션 경계)
- **Semantic:**
  - Success: #7a9e8a (muted sage green)
  - Error: #b07070 (muted rose)
  - Warning: #c4a050 (muted gold)
  - Info: #8a9ab0 (muted steel blue)
- **Dark mode:** 기본값. 이 팔레트 자체가 다크 모드.
- **Light mode (선택적):**
  - Background: #f5f2ee
  - Elevated: #fffdf9
  - Surface: #eae6e0
  - Foreground: #2a2522
  - Dim: #8a8480
  - Muted: #b0a8a0
  - Accent: #a08060
  - 채도 10~15% 감소, 표면 따뜻한 크림 톤 유지.

## Spacing
- **Base unit:** 8px
- **Density:** Spacious — 수면 전 앱은 숨 쉴 공간이 필요.
- **Scale:**
  - 2xs: 2px
  - xs: 4px
  - sm: 8px
  - md: 16px
  - lg: 24px
  - xl: 32px
  - 2xl: 48px
  - 3xl: 64px

## Layout
- **Approach:** Grid-disciplined, 극도로 sparse
- **Grid:** 단일 칼럼 (모바일 퍼스트 PWA — 복잡한 그리드 불필요)
- **Max content width:** 720px (데스크톱 브라우저 사용 시)
- **Border radius:**
  - sm: 4px (인풋, 알럿)
  - md: 8px (카드, 스와치)
  - lg: 12px (모달, 목업)
  - full: 9999px (버튼, 오브, 뱃지)
- **Key layout principle:** 화면에 요소 3~4개 이하. 네거티브 스페이스가 디자인의 핵심.

## Motion
- **Approach:** Intentional — 모든 애니메이션은 호흡 리듬을 따름. 빠른 움직임 금지.
- **Core animation:** `breathe` — 4~5초 주기, ease-in-out, opacity 0.3↔1, scale 1↔1.06~1.08
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:**
  - micro: 100ms (호버 피드백)
  - short: 250ms (토글, 상태 전환)
  - medium: 400ms (fade-up 등장)
  - long: 700ms (페이지 전환)
  - breath: 3000~5000ms (오브 호흡 — 에이전트 상태에 따라 가변)
- **에이전트 상태별 오브 모션:**
  - idle: 정적, 미약한 border
  - listening: breathe 4s — 느린 호흡
  - thinking: breathe 2s — 빠른 호흡, opacity 0.7
  - speaking: 정적이지만 border-color 강화 + box-shadow glow
- **규칙:** 200ms 이하의 애니메이션은 호버/탭 피드백에만. 콘텐츠 애니메이션은 최소 400ms.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-21 | Initial design system created | Created by /design-consultation. Based on existing code design language + competitive research (Calm, Headspace, Korean saju apps). |
| 2026-03-21 | Noto Serif KR as primary font | Intentional risk — serif is rare in wellness space. Creates literary intimacy vs. clinical sans-serif. |
| 2026-03-21 | Pretendard added for UI labels | Noto Serif KR alone is too heavy for small UI text. Pretendard provides clean Korean sans-serif for status/buttons. |
| 2026-03-21 | Amber/gold accent over blue | Warm lamp light metaphor. Blue is default in sleep apps — amber differentiates. |
| 2026-03-21 | Single orb as visual identity | No illustrations, no nature photos, no icon grids. One abstract breathing shape. Maximum minimalism. |
| 2026-03-21 | Spacious density | Sleep context = fewer elements, more breathing room. Constraint worship: if you can only show 3 things, show 3. |
