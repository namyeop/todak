# Handoff — 2026-03-22

## 오늘 완료한 작업

### 디자인
- DESIGN.md 기반 디자인 리뷰 완료 (C → B+)
- Pretendard 폰트 추가, 타이틀 32px 수정, 중앙 정렬, focus-visible, max-width 720px
- 첫 방문 vs 재방문 UI 구분 (D1)
- 마이크 권한 거부 UX (D2)
- 세션 종료 페이드아웃 전환 (D3)
- MVP 기본 접근성 — aria-live, aria-label, aria-hidden (D5)
- 에이전트 대기 상태 UI — 5초 호흡 오브 + 대기 메시지 (D6)

### 엔지니어링
- 신규 API 엔드포인트 4개 구현 (INTERNAL_API_KEY 인증)
  - `GET /api/memory` — 최근 3개 summary 조회
  - `POST /api/memory` — summary 저장
  - `POST /api/session/end` — 세션 상태 업데이트
  - `POST /api/safety-event` — safety 이벤트 저장
- Agent worker.py 전면 업데이트
  - httpx 기반 Web API 호출 (supabase-py 제거)
  - Memory 로드 → 시스템 프롬프트 주입
  - Safety 키워드 감지 → 고정 응답 + 이벤트 저장 + 세션 종료
  - 세션 종료 시 LLM 요약 생성 → Web API로 저장
  - 세션 상태 업데이트 (status, duration, turnCount)
  - 재방문 인사 분기 (메모리 기반)
- 하루 1회 세션 제한 (02:00 KST 기준)
- 타이머 관리를 Agent 단일 소스로 통합 (웹 측 elapsed >= 55 제거)

### 시스템 프롬프트 재설계 (CEO 리뷰)
- 사주적 경험 4가지 반영:
  1. 메모리 퍼스트 인사 — LLM이 메모리 기반 인사 생성
  2. 감정 진단 강화 — 표면 감정 뒤 진짜 감정 짚기
  3. 허락의 언어 — 질문형 → 선언형 전환
  4. 수면 전환 톤 — 후반부 말 짧아짐, ASMR 느낌
- 첫 방문 인사도 LLM 프롬프트 기반으로 생성

### 인프라 & 배포
- Supabase Postgres 세팅 완료 (6테이블 + 4인덱스 + FK)
- DB URL: pooler 방식 (`aws-1-ap-south-1.pooler.supabase.com:6543`)
- GitHub 모노레포 push (`github.com/namyeop/todak`)
- Vercel 배포 완료 (`todak-sandy.vercel.app`)
- DB client lazy init (Vercel 빌드 타임 에러 해결)
- uv.lock 갱신 (supabase 제거, httpx 추가)
- LiveKit Cloud agent 배포 진행 중

## 현재 상태

```
Vercel (Web)         → todak-sandy.vercel.app  ✅ 배포 완료
Supabase (DB)        → 6테이블 적용 완료       ✅
LiveKit Cloud (Agent) → 배포 진행 중            🔄
```

## 다음 세션에서 할 일

### P0 — 배포 마무리
- [ ] LiveKit Cloud agent 배포 완료 (`lk agent deploy`)
- [ ] Vercel 환경변수 확인 (DATABASE_URL, LIVEKIT_*, INTERNAL_API_KEY)
- [ ] INTERNAL_API_KEY를 프로덕션용 강한 키로 교체 (`openssl rand -hex 32`)
- [ ] 엔드투엔드 테스트: 브라우저 → 세션 시작 → 음성 대화 → 종료 → 요약 저장 확인

### P1 — 기능 검증
- [ ] Memory 로드/저장 동작 확인 (재방문 시 메모리 기반 인사)
- [ ] Safety 감지 동작 확인
- [ ] 하루 1회 제한 동작 확인
- [ ] 세션 종료 페이드아웃 전환 확인

### P2 — 안정화
- [ ] 에러 시 fallback 응답 구현
- [ ] Sentry 연동
- [ ] 어드민 콘솔 (세션/요약 조회)
- [ ] SESSION_DURATION 60초 → 5분으로 변경 (이미 코드에 반영됨, 실제 테스트 후 조정)

## 아키텍처 결정 사항

| 결정 | 선택 | 이유 |
|------|------|------|
| LangGraph | 최소 3노드 (MVP 후 확장) | boring technology 원칙 |
| Agent→DB | Web API 경유 | DB 로직 한 곳 집중 |
| Transcript | LLM context 활용 | 별도 저장 불필요 |
| Agent→Web 인증 | INTERNAL_API_KEY (shared secret) | MVP에 충분 |
| 타이머 관리 | Agent 단일 소스 | DRY 원칙 |
| Git | 모노레포 | 솔로프리너에 최적 |

## 환경변수 체크리스트

### Vercel
- [x] DATABASE_URL
- [x] LIVEKIT_API_KEY
- [x] LIVEKIT_API_SECRET
- [x] NEXT_PUBLIC_LIVEKIT_URL
- [ ] INTERNAL_API_KEY ← 프로덕션 키로 교체 필요

### LiveKit Cloud (Agent secrets)
- [x] OPENAI_API_KEY
- [x] ELEVEN_API_KEY
- [x] GOOGLE_API_KEY
- [x] WEB_API_URL (todak-sandy.vercel.app)
- [ ] INTERNAL_API_KEY ← Vercel과 동일한 키로 교체 필요
