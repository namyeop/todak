# 토닥 DB 스키마 초안

## 목표

원문 음성과 전체 transcript를 저장하지 않으면서도 다음 기능을 지원하는 최소 스키마를 정의한다.

- 디바이스 기반 사용자 식별
- 세션 기록
- 요약 메모리 저장
- 구독 상태 관리
- 프롬프트 버전 관리
- 안전 이벤트 기록

DB는 `PostgreSQL` 기준으로 작성하며, 구현의 source of truth는 `web/src/db/schema.ts`의 Drizzle schema다.

---

## 1. 설계 원칙

- 원문 텍스트 저장 금지
- 최소한의 PII만 저장
- 운영에 필요한 메타데이터는 남긴다
- 모든 핵심 이벤트는 `session_id`로 추적 가능해야 한다

---

## 2. 테이블

## users

디바이스 기반 익명 사용자 식별용 테이블.

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  locale text not null default 'ko-KR',
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
```

설명:

- `device_id`: 앱 설치 또는 브라우저 로컬 식별값
- 이메일 없이도 MVP 운영 가능

## sessions

개별 대화 세션 메타데이터 저장.

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  status text not null check (status in ('started', 'completed', 'aborted', 'safety')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_sec integer,
  turn_count integer not null default 0,
  first_response_latency_ms integer,
  avg_response_latency_ms integer,
  end_reason text,
  prompt_version_id uuid,
  created_at timestamptz not null default now()
);
```

설명:

- transcript 자체는 저장하지 않는다
- latency 메타데이터는 품질 개선에 중요하다

## memory_summaries

세션 종료 후 생성된 요약 메모리 저장.

```sql
create table memory_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  session_id uuid not null references sessions(id) unique,
  summary_text text not null,
  emotion_tags text[] not null default '{}',
  topic_tags text[] not null default '{}',
  recall_priority smallint not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
```

설명:

- `summary_text`는 200~500자 권장
- `expires_at`를 두면 무료 플랜 memory 보관 기간 제어 가능

## subscriptions

구독 상태 저장.

```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  plan text not null check (plan in ('free', 'premium')),
  status text not null check (status in ('active', 'canceled', 'past_due', 'trial')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## prompt_versions

운영 중 프롬프트 변경 추적용.

```sql
create table prompt_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,
  system_prompt text not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);
```

## safety_events

안전 관련 이벤트 기록.

```sql
create table safety_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id),
  user_id uuid not null references users(id),
  category text not null check (category in ('self_harm', 'panic', 'medical', 'other')),
  severity text not null check (severity in ('low', 'medium', 'high')),
  action_taken text not null,
  created_at timestamptz not null default now()
);
```

---

## 3. 인덱스

```sql
create index idx_sessions_user_started_at
  on sessions(user_id, started_at desc);

create index idx_memory_summaries_user_created_at
  on memory_summaries(user_id, created_at desc);

create index idx_subscriptions_user_id
  on subscriptions(user_id);

create index idx_safety_events_session_id
  on safety_events(session_id);
```

---

## 4. 메모리 조회 정책

다음 세션에서 memory를 불러올 때는 아래 순서를 권장한다.

1. 최근 3개 summary 조회
2. 최신순으로 읽되 총 길이는 제한
3. 중복 주제는 agent runtime에서 압축
4. 가장 최근 감정과 다음 대화 포인트만 주입

SQL 예시:

```sql
select summary_text, emotion_tags, topic_tags, created_at
from memory_summaries
where user_id = $1
  and (expires_at is null or expires_at > now())
order by created_at desc
limit 3;
```

---

## 5. 세션 종료 처리 규칙

세션 종료 시 서버는 아래를 수행한다.

1. `sessions` 업데이트
2. 요약 생성 성공 시 `memory_summaries` 저장
3. safety 발생 시 `safety_events` 저장
4. 임시 transcript 캐시 삭제

중요:

- DB에는 원문 transcript를 쓰지 않는다
- 로그에도 사용자 발화 원문을 남기지 않는다

---

## 6. 나중에 추가할 수 있는 테이블

MVP에는 없어도 된다.

- `voice_profiles`
- `daily_usage_counters`
- `billing_events`
- `ab_test_assignments`
- `push_notification_logs`

1주 MVP에서는 최소 스키마를 유지하는 것이 맞다.
