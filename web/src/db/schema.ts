import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  locale: text("locale").notNull().default("ko-KR"),
  timezone: text("timezone").notNull().default("Asia/Seoul"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promptVersions = pgTable("prompt_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSec: integer("duration_sec"),
    turnCount: integer("turn_count").notNull().default(0),
    firstResponseLatencyMs: integer("first_response_latency_ms"),
    avgResponseLatencyMs: integer("avg_response_latency_ms"),
    endReason: text("end_reason"),
    promptVersionId: uuid("prompt_version_id").references(() => promptVersions.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_sessions_user_started_at").on(table.userId, table.startedAt),
    check(
      "sessions_status_check",
      sql`${table.status} in ('started', 'completed', 'aborted', 'safety')`,
    ),
  ],
);

export const memorySummaries = pgTable(
  "memory_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    sessionId: uuid("session_id").notNull().unique().references(() => sessions.id),
    summaryText: text("summary_text").notNull(),
    emotionTags: text("emotion_tags").array().notNull().default(sql`'{}'::text[]`),
    topicTags: text("topic_tags").array().notNull().default(sql`'{}'::text[]`),
    recallPriority: smallint("recall_priority").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [index("idx_memory_summaries_user_created_at").on(table.userId, table.createdAt)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    plan: text("plan").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    provider: text("provider"),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_subscriptions_user_id").on(table.userId),
    check("subscriptions_plan_check", sql`${table.plan} in ('free', 'premium')`),
    check(
      "subscriptions_status_check",
      sql`${table.status} in ('active', 'canceled', 'past_due', 'trial')`,
    ),
  ],
);

export const safetyEvents = pgTable(
  "safety_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull().references(() => sessions.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    category: text("category").notNull(),
    severity: text("severity").notNull(),
    actionTaken: text("action_taken").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_safety_events_session_id").on(table.sessionId),
    check(
      "safety_events_category_check",
      sql`${table.category} in ('self_harm', 'panic', 'medical', 'other')`,
    ),
    check(
      "safety_events_severity_check",
      sql`${table.severity} in ('low', 'medium', 'high')`,
    ),
  ],
);
