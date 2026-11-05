import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: "Logged out" });
  clearSessionCookie(res);
  return res;
}
