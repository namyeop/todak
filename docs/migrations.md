# Drizzle Migration Workflow

## 원칙

- `web`와 `agent`는 둘 다 DB를 사용한다
- migration은 어느 서비스 런타임에도 넣지 않는다
- migration의 source of truth는 `web`의 Drizzle schema다

---

## 디렉터리 구조

```text
todak/
  web/
    drizzle.config.ts
    drizzle/
    src/db/
  agent/
```

---

## 로컬 개발

로컬 Postgres는 `docker-compose.yml`의 `postgres`를 사용한다.

Drizzle migration 생성:

```bash
cd web
pnpm db:generate
```

현재 migration 적용:

```bash
cd web
DATABASE_URL=postgresql://todak:todak@localhost:5432/todak pnpm db:migrate
```

---

## 원격 Supabase 적용

```bash
cd web
DATABASE_URL=<remote-postgres-connection-string> pnpm db:migrate
```

---

## 운영 원칙

- migration 실행 주체는 개발자 로컬 또는 CI다
- `docker compose up` 시 자동 migration은 하지 않는다
- `web` 시작 시 migration 실행하지 않는다
- `agent` 시작 시 migration 실행하지 않는다

이유:

- 서비스 시작과 schema 변경을 분리해야 장애 원인 분리가 쉽다
- `web`와 `agent`가 동시에 뜨는 구조에서 자동 migration은 위험하다
- `agent`는 schema 소유자가 아니라 consumer다

---

## 소스 오브 트루스

- `web/src/db/schema.ts`
- `web/drizzle.config.ts`

생성 산출물:

- `web/drizzle/*`
