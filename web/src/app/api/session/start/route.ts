import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users, sessions } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { AccessToken } from "livekit-server-sdk";

// 하루의 기준: 익일 02:00 (KST)
// 현재 시각이 02:00 이전이면 전날 02:00부터, 02:00 이후면 오늘 02:00부터
function getTodayBoundary(): Date {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const boundary = new Date(kst);
  boundary.setHours(2, 0, 0, 0);

  if (kst < boundary) {
    boundary.setDate(boundary.getDate() - 1);
  }

  // KST → UTC 변환 (KST = UTC+9)
  return new Date(boundary.getTime() - 9 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  const { deviceId } = await req.json();

  if (!deviceId || typeof deviceId !== "string") {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  // upsert user by deviceId
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.deviceId, deviceId))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({ deviceId })
      .returning();
  } else {
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, user.id));
  }

  // 하루 1회 제한: 오늘 기준 시간(02:00 KST) 이후 세션이 있는지 확인
  const todayBoundary = getTodayBoundary();
  const [existingSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, user.id),
        gte(sessions.startedAt, todayBoundary),
      ),
    )
    .limit(1);

  if (existingSession) {
    return NextResponse.json(
      { error: "already_used_today", message: "오늘은 이미 대화했어. 내일 다시 만나자." },
      { status: 429 },
    );
  }

  // create session
  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      status: "started",
    })
    .returning();

  // generate LiveKit token
  const roomName = `session-${session.id}`;
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: `user-${user.id}`,
      name: "User",
      ttl: "15m",
    },
  );
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });
  const token = await at.toJwt();

  return NextResponse.json({
    sessionId: session.id,
    token,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    roomName,
  });
}
