import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.id,
      username: session.username,
      role: session.role,
    },
  });
}
