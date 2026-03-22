import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyInternalAuth } from "@/lib/internal-auth";

// POST /api/session/end — 세션 상태 업데이트
export async function POST(req: NextRequest) {
  const authError = verifyInternalAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const { sessionId, status, endReason, durationSec, turnCount } = body;

  if (!sessionId || !status) {
    return NextResponse.json(
      { error: "sessionId and status are required" },
      { status: 400 },
    );
  }

  await db
    .update(sessions)
    .set({
      status,
      endReason: endReason || null,
      endedAt: new Date(),
      durationSec: durationSec || null,
      turnCount: turnCount || 0,
    })
    .where(eq(sessions.id, sessionId));

  return NextResponse.json({ ok: true });
}
