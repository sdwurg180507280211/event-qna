import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { setAdminCookie, signAdminSession } from "@/lib/auth";

const schema = z.object({
  password: z.string().min(1).max(500),
});

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    const { password } = schema.parse(await request.json());
    const expected = process.env.ADMIN_PASSWORD;

    if (!expected) {
      return apiError("Admin login is not configured", 500);
    }

    if (!safeEqual(password, expected)) {
      return apiError("Invalid password", 401);
    }

    const token = await signAdminSession();
    const response = NextResponse.json({ ok: true });
    setAdminCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid login request");
    }
    console.error("Admin login failed", error);
    return apiError("Unable to sign in", 500);
  }
}
