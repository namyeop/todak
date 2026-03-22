# 진행 현황

## 개요

이 문서는 현재 저장소에 반영된 구조, 기술 결정, 완료된 작업을 빠르게 확인하기 위한 상태 문서다.

기준 시점:

- `web`는 Next.js 기반
- `agent`는 Python + `uv` 기반
- DB schema와 migration source of truth는 `web`의 Drizzle

---

## 현재 구조

```text
todak/
  web/
  agent/
  docs/
  docker-compose.yml
  .env.example
  .gitignore
```

---

## 완료된 결정

### 애플리케이션 구조

- `web`와 `agent`는 분리한다
- `web`는 Next.js 앱, API, 운영 콘솔 역할을 담당한다
- `agent`는 LiveKit voice worker와 LangGraph 실행을 담당한다

### 데이터 계층

- `agent`는 DB 접근이 가능하다
- migration은 `agent`나 `web` 런타임에서 자동 실행하지 않는다
- schema source of truth는 `web/src/db/schema.ts`다
- 로컬은 `docker-compose.yml`의 `postgres`를 사용한다
- 원격은 Supabase Postgres를 사용한다

### 패키지/런타임

- `web` 패키지 매니저는 `pnpm`
- `agent` 패키지 매니저는 `uv`
- `web` 도커 런타임도 `pnpm`
- `agent` 도커 런타임도 `uv`

### 저장소 규칙

- 버전관리는 루트 기준으로 한다
- 루트 `.gitignore`만 사용한다
- 중첩 `.git`과 임시 bootstrap 구조는 제거했다

---

## 완료된 작업

### 문서

- MVP 계획 문서 작성
- 기술 아키텍처 문서 작성
- LangGraph 설계 문서 작성
- DB 스키마 문서 작성
- Drizzle migration 워크플로우 문서 작성

### 웹

- `web/`에 Next.js 앱 생성
- `web/package.json`을 `pnpm` 기준으로 정리
- Drizzle 관련 스크립트 추가
- `web/src/db/schema.ts` 추가
- `web/src/db/client.ts` 추가
- `web/drizzle.config.ts` 추가

### 에이전트

- `agent/`를 `uv` 프로젝트로 초기화
- 기본 의존성 추가
- 최소 엔트리포인트 `agent.main:main` 추가
- 도커 런타임을 `uv sync`, `uv run` 기준으로 정리

### 도커

- 실행용 `docker-compose.yml` 정리
- `web`, `agent`, `postgres` 서비스 유지
- bootstrap용 init 서비스 제거
- 불필요한 `docker/` 디렉터리 제거

### 정리 작업

- 루트 `.gitignore` 추가
- `web/.gitignore`, `agent/.gitignore` 제거
- `package-lock.json`, `node_modules`, `.venv`, 임시 캐시 제거
- deprecated Compose `version` 키 제거

---

## 현재 남아 있는 제약

- 로컬에 `pnpm`이 아직 없다
- `web`의 `pnpm install`과 Drizzle 명령은 아직 실행 검증하지 않았다
- `Supabase CLI`는 아직 설치되지 않았다
- 실제 LiveKit worker 코드는 아직 없다
- 실제 Next.js UI는 기본 scaffold 상태다

---

## 현재 기준의 소스 오브 트루스

- 제품/일정: `docs/implementation-plan.md`
- 아키텍처: `docs/technical-architecture.md`
- 그래프 설계: `docs/langgraph-design.md`
- DB 구조: `docs/db-schema.md`
- migration 방식: `docs/migrations.md`
- 현재 상태: `docs/progress.md`
