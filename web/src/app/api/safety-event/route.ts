import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { safetyEvents } from "@/db/schema";
import { verifyInternalAuth } from "@/lib/internal-auth";

// POST /api/safety-event — safety 이벤트 저장
export async function POST(req: NextRequest) {
  const authError = verifyInternalAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const { sessionId, userId, category, severity, actionTaken } = body;

  if (!sessionId || !userId || !category || !severity || !actionTaken) {
    return NextResponse.json(
      { error: "sessionId, userId, category, severity, actionTaken are required" },
      { status: 400 },
    );
  }

  const [event] = await db
    .insert(safetyEvents)
    .values({ sessionId, userId, category, severity, actionTaken })
    .returning({ id: safetyEvents.id });

  return NextResponse.json({ id: event.id });
}
