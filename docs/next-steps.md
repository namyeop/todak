# 다음 작업

## 목표

이 문서는 현재 구조를 실제 동작하는 MVP로 연결하기 위한 다음 작업 목록을 우선순위 기준으로 정리한 것이다.

---

## P0

- `pnpm` 설치 또는 활성화
- `web`에서 `pnpm install` 실행
- `web`에서 `pnpm db:generate` 실행
- 로컬 `postgres`에 Drizzle migration 적용
- `docker compose up postgres` 기준 DB 연결 검증

---

## P0 - Web

- 기본 Next.js 화면을 토닥 랜딩/세션 시작 화면으로 교체
- `src/app/page.tsx`를 제품 컨셉에 맞게 수정
- 세션 시작 API route 추가
- LiveKit access token 발급 route 추가
- device id 기반 식별 방식 결정 및 구현

---

## P0 - Agent

- 실제 LiveKit worker 엔트리포인트 구현
- env loader와 설정 객체 정리
- memory 조회 함수 구현
- summary 저장 함수 구현
- safety event 저장 함수 구현
- 최소 LangGraph state와 node 골격 추가

---

## P0 - Voice Path

- STT provider 연결
- LLM 응답 생성 연결
- TTS provider 연결
- 사용자 발화 -> agent 응답 1턴 흐름 구현
- 응답 중첩 방지와 timeout 기본 처리

---

## P1

- 세션 종료 후 summary 생성
- 다음 세션에서 memory recall 주입
- sleep phase 전환 로직 추가
- 운영용 세션 조회 화면 추가
- prompt version 조회 및 기록

---

## P1 - 배포

- `web`를 Vercel 기준으로 배포 정리
- `agent`를 LiveKit Cloud 또는 별도 런타임 기준으로 배포 방식 고정
- 환경변수 문서화
- Sentry 또는 최소 로깅 도입

---

## P2

- 결제 모델 연결
- 무료/유료 memory 보존 기간 분기
- 관리자용 간단한 세션 리플레이 화면
- 안전 문구와 위기 상황 UX 정교화

---

## 권장 순서

1. `pnpm` 정리와 Drizzle migration 검증
2. `web` 세션 시작 API와 LiveKit token 발급
3. `agent` 최소 worker 실행
4. 음성 1턴 왕복
5. memory 저장/회상
6. 운영 화면

---

## 완료 기준

다음 조건을 만족하면 MVP 핵심 경로가 연결된 상태로 본다.

- 사용자가 웹에서 세션을 시작할 수 있다
- LiveKit room에 web와 agent가 모두 참여한다
- 사용자가 한 문장 말하면 agent가 음성으로 응답한다
- 세션 종료 후 summary가 DB에 저장된다
- 다음 세션에서 이전 summary가 반영된다
