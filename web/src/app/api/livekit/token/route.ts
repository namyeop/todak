import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: NextRequest) {
  const { identity, roomName } = await req.json();

  if (!identity || !roomName) {
    return NextResponse.json(
      { error: "identity and roomName are required" },
      { status: 400 },
    );
  }

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity,
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

  return NextResponse.json({ token });
}
