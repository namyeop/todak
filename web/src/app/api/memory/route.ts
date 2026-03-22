import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { memorySummaries } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyInternalAuth } from "@/lib/internal-auth";

// GET /api/memory?userId=xxx — 최근 3개 summary 반환
export async function GET(req: NextRequest) {
  const authError = verifyInternalAuth(req);
  if (authError) return authError;

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const summaries = await db
    .select({
      summaryText: memorySummaries.summaryText,
      emotionTags: memorySummaries.emotionTags,
      topicTags: memorySummaries.topicTags,
      createdAt: memorySummaries.createdAt,
    })
    .from(memorySummaries)
    .where(eq(memorySummaries.userId, userId))
    .orderBy(desc(memorySummaries.createdAt))
    .limit(3);

  return NextResponse.json({ summaries });
}

// POST /api/memory — summary 저장
export async function POST(req: NextRequest) {
  const authError = verifyInternalAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const { userId, sessionId, summaryText, emotionTags, topicTags } = body;

  if (!userId || !sessionId || !summaryText) {
    return NextResponse.json(
      { error: "userId, sessionId, summaryText are required" },
      { status: 400 },
    );
  }

  const [summary] = await db
    .insert(memorySummaries)
    .values({
      userId,
      sessionId,
      summaryText,
      emotionTags: emotionTags || [],
      topicTags: topicTags || [],
    })
    .returning({ id: memorySummaries.id });

  return NextResponse.json({ id: summary.id });
}
