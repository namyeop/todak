# 진행 현황

기준: 2026-03-22

---

## 완료된 작업

### 웹 (Next.js)
- 홈 화면 — 첫 방문/재방문 분기, 마이크 권한 거부 UX, 세션 종료 페이드아웃
- 세션 뷰 — breathing orb 상태 시스템, 에이전트 대기 상태, aria-live 접근성
- API: `/api/session/start` (하루 1회 제한 포함)
- API: `/api/memory` (GET/POST)
- API: `/api/session/end` (POST)
- API: `/api/safety-event` (POST)
- API: `/api/livekit/token` (POST)
- 내부 API 인증 (`INTERNAL_API_KEY`)
- DESIGN.md 기반 CSS — Noto Serif KR + Pretendard, 디자인 토큰
- DB schema 6테이블 (Drizzle ORM)
- Vercel 배포 완료

### 에이전트 (Python)
- LiveKit voice worker — STT(OpenAI) + LLM(Gemini) + TTS(ElevenLabs)
- 사주 영감 시스템 프롬프트 (3단계: 알아주기→감정 진단→허락)
- Memory 로드/저장 (Web API 경유)
- Safety 키워드 감지 + 고정 응답
- 세션 요약 생성 (LLM context 활용)
- 세션 상태 업데이트
- 5분 세션 타이머 + farewell 발화
- 첫 방문/재방문 인사 (LLM 프롬프트 기반)

### 인프라
- Supabase Postgres — 6테이블 마이그레이션 완료
- GitHub 모노레포 (`github.com/namyeop/todak`)
- Vercel 배포 (`todak-sandy.vercel.app`)
- LiveKit Cloud agent 배포 진행 중
- Docker Compose 로컬 개발 환경

### 문서
- MVP 계획, 기술 아키텍처, LangGraph 설계, DB 스키마, 마이그레이션 워크플로우
- DESIGN.md (디자인 시스템)
- TODOS.md (디자인 TODO — 전체 완료)
- handoff.md (인수인계 문서)

---

## 미완료

- LiveKit Cloud agent 배포 완료
- 엔드투엔드 테스트
- INTERNAL_API_KEY 프로덕션 키 교체
- 어드민 콘솔
- Sentry 연동
- 에러 fallback 응답
