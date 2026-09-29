import { NextResponse } from "next/server";
import { clearParticipantCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearParticipantCookie(response);
  return response;
}
