# 토닥 기술 아키텍처

## 목표

토닥의 1주 MVP를 빠르게 구현하고 운영 가능한 상태로 배포하기 위한 기술 구조를 정의한다.

---

## 1. 시스템 구성

## 클라이언트

- `Next.js App Router`
- `TypeScript`
- `LiveKit Client SDK`
- `PWA`

책임:

- 세션 시작/종료 UI
- 마이크 권한 요청
- LiveKit 룸 접속
- 최소 상태 표시
- 운영 콘솔 페이지

## 실시간 음성 계층

- `LiveKit Cloud`

책임:

- WebRTC 연결
- participant/session 관리
- 실시간 오디오 스트림 전달

## 에이전트 런타임

- `Python`
- `LangGraph`
- `LiveKit Agents or custom worker`

책임:

- STT 결과 수신
- 그래프 상태 전이
- LLM 응답 생성
- TTS 출력
- 세션 메타데이터 기록
- 세션 종료 후 요약 생성

## 데이터 계층

- `Supabase Postgres`

책임:

- device/user 식별
- 세션 메타데이터
- memory summary 저장
- prompt version 관리
- subscription 상태 저장

## 관측성

- `Sentry`
- JSON structured logging

책임:

- 예외 추적
- 응답 시간 추적
- 세션 실패 원인 기록

---

## 2. 요청 흐름

1. 사용자가 웹앱에서 `시작` 버튼 클릭
2. Next.js API가 device id를 기준으로 session 생성
3. API가 LiveKit access token 발급
4. 클라이언트가 LiveKit room 접속
5. agent runtime이 동일 room에 participant로 join
6. 사용자 음성이 STT로 전달
7. LangGraph가 현재 state와 최근 memory를 바탕으로 응답 생성
8. TTS가 음성으로 응답
9. 세션 종료 시 summary 생성 후 DB 저장
10. 원문 transcript/원본 음성은 폐기

---

## 3. 런타임 분리 이유

Next.js 서버 안에 모든 실시간 음성 처리를 넣지 않는 이유는 다음과 같다.

- Python 생태계에서 LangGraph 지원이 더 자연스럽다
- 음성 파이프라인은 장시간 연결을 다루므로 웹 서버와 분리하는 편이 안정적이다
- 추후 TTS/STT/모델 교체가 쉽다
- 배포 단위를 나누면 문제를 빠르게 격리할 수 있다

---

## 4. 환경별 구성

## 로컬

- Next.js: `localhost:3000`
- agent runtime: `localhost:8000`
- Supabase: cloud or local
- LiveKit: cloud

## 프로덕션

- Next.js: `Vercel`
- agent runtime: `Railway`, `Fly.io`, 또는 `Render`
- DB/Auth: `Supabase`
- observability: `Sentry`

---

## 5. 구성 요소별 세부 책임

## Next.js

- `/` 랜딩 및 시작 화면
- `/app/session` 세션 진입 화면
- `/app/admin` 운영 콘솔
- `/api/session/start` 세션 생성
- `/api/session/end` 세션 종료 수신
- `/api/livekit/token` 토큰 발급

## Agent Runtime

- `session manager`
- `graph runner`
- `memory fetcher`
- `summary writer`
- `safety policy`
- `voice style config`

## Supabase

- `users`
- `sessions`
- `memory_summaries`
- `prompt_versions`
- `subscriptions`
- `safety_events`

---

## 6. 비기능 요구사항

### 지연 시간

- 목표: 사용자 발화 종료 후 첫 응답 시작까지 `2초 이하`

### 개인정보

- 저장: 요약, 메타데이터, 에러 로그
- 미저장: 전체 transcript, 원본 음성

### 가용성

- MVP 단계에서는 고가용성보다 빠른 복구가 우선
- 치명적 오류 발생 시 graceful fallback 음성 제공

### 보안

- 서버 측 키 보관
- 클라이언트에는 LiveKit 단기 토큰만 노출
- PII 최소 수집

---

## 7. 권장 폴더 구조

```text
todak/
  apps/
    web/
  services/
    agent/
  packages/
    shared/
  docs/
```

초기 저장소가 비어 있다면 아래 단순 구조부터 시작해도 된다.

```text
todak/
  web/
  agent/
  docs/
```

---

## 8. 운영상 중요한 로그

- session started
- session ended
- memory loaded
- summary saved
- latency over threshold
- safety trigger
- tts failure
- stt disconnect

이 로그들은 모두 `session_id`를 기준으로 추적 가능해야 한다.
