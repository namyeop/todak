# Design TODOs

## ~~D1. 첫 방문 vs 재방문 UI 구분~~ ✅

~~localStorage로 이전 세션 여부 확인. 첫 방문 시 "오늘 밤, 조용히 들어줄게요" + "눌러서 시작", 재방문 시 "다시 이야기하기" 레이블.~~

Fixed by /design-review on 2026-03-22. `page.tsx`, `page.module.css`

---

## ~~D2. 마이크 권한 거부 UX~~ ✅

~~마이크 권한 거부 시 "대화하려면 마이크가 필요해요" + 설정 여는 버튼 표시. 토닥의 따뜻한 톤 유지.~~

Fixed by /design-review on 2026-03-22. `page.tsx`, `page.module.css`

---

## ~~D3. 세션 종료 페이드아웃 전환~~ ✅

~~작별 인사 후 오브 3초 페이드아웃 → 종료 메시지 fade-up → 시작 버튼 dim 상태로 전환.~~

Fixed by /design-review on 2026-03-22. `page.tsx`, `page.module.css`

---

## ~~D4. Pretendard 폰트 적용 + 타이틀 크기 수정~~ ✅

~~globals.css에 Pretendard CDN import 추가. UI 요소에 Pretendard 적용. 타이틀 크기 2rem으로 수정.~~

Fixed by /design-review on 2026-03-22. `globals.css`, `page.module.css`, `session-view.module.css`

---

## ~~D5. MVP 기본 접근성~~ ✅

~~max-width 720px, 터치 타겟 44px, aria-label, aria-live, focus-visible, 타이머 opacity 조정.~~

Fixed by /design-review on 2026-03-22. `page.module.css`, `session-view.tsx`, `session-view.module.css`

---

## ~~D6. 에이전트 대기 상태 UI~~ ✅

~~에이전트 연결 대기 중: 5초 호흡 오브 + "준비하고 있어요..." → 10초 초과 시 "조금만 기다려주세요".~~

Fixed by /design-review on 2026-03-22. `session-view.tsx`, `session-view.module.css`
