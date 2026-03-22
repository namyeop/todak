import { NextRequest, NextResponse } from "next/server";

export function verifyInternalAuth(req: NextRequest): NextResponse | null {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${key}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}
