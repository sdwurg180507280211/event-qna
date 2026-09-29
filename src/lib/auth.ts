import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { normalizeCwid } from "@/lib/normalize";

const PARTICIPANT_COOKIE = "event_qna_session";
const ADMIN_COOKIE = "event_qna_admin";

export type ParticipantSource = "whitelist" | "stream";

export type ParticipantSession = {
  eventCode: string;
  cwid: string;
  name?: string;
  source: ParticipantSource;
};

function env(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function key(value: string) {
  return new TextEncoder().encode(value);
}

export async function signParticipantSession(input: ParticipantSession) {
  return new SignJWT({
    eventCode: input.eventCode,
    cwid: normalizeCwid(input.cwid),
    name: input.name,
    source: input.source,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("event-qna")
    .setAudience("participant")
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(key(env("SESSION_SECRET")));
}

export async function readParticipantSession(): Promise<ParticipantSession | null> {
  const store = await cookies();
  const token = store.get(PARTICIPANT_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key(env("SESSION_SECRET")), {
      issuer: "event-qna",
      audience: "participant",
      algorithms: ["HS256"],
    });

    if (
      typeof payload.eventCode !== "string" ||
      typeof payload.cwid !== "string" ||
      (payload.source !== "whitelist" && payload.source !== "stream")
    ) {
      return null;
    }

    return {
      eventCode: payload.eventCode,
      cwid: payload.cwid,
      name: typeof payload.name === "string" ? payload.name : undefined,
      source: payload.source,
    };
  } catch {
    return null;
  }
}

export function setParticipantCookie(response: NextResponse, token: string) {
  response.cookies.set(PARTICIPANT_COOKIE, token, {
    httpOnly: true,
    secure:
      process.env.COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function clearParticipantCookie(response: NextResponse) {
  response.cookies.set(PARTICIPANT_COOKIE, "", {
    httpOnly: true,
    secure:
      process.env.COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function verifyStreamTicket(
  ticket: string,
  expectedEventCode: string,
) {
  const issuer = process.env.STREAM_TICKET_ISSUER ?? "livestream";
  const audience = process.env.STREAM_TICKET_AUDIENCE ?? "event-qna";

  const { payload } = await jwtVerify(ticket, key(env("STREAM_SSO_SECRET")), {
    issuer,
    audience,
    algorithms: ["HS256"],
    requiredClaims: ["sub", "iat", "exp", "eventCode"],
    maxTokenAge: "5m",
  });

  if (
    typeof payload.sub !== "string" ||
    !payload.sub.trim() ||
    payload.sub.length > 100 ||
    typeof payload.exp !== "number" ||
    typeof payload.iat !== "number" ||
    payload.exp <= payload.iat ||
    payload.exp - payload.iat > 300 ||
    typeof payload.eventCode !== "string" ||
    payload.eventCode !== expectedEventCode
  ) {
    throw new Error("Invalid ticket payload");
  }

  return {
    eventCode: payload.eventCode,
    cwid: normalizeCwid(payload.sub),
    name: typeof payload.name === "string" ? payload.name : undefined,
    source: "stream" as const,
  };
}

export async function signAdminSession() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("event-qna")
    .setAudience("admin")
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(key(env("SESSION_SECRET")));
}

export async function isAdmin() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, key(env("SESSION_SECRET")), {
      issuer: "event-qna",
      audience: "admin",
      algorithms: ["HS256"],
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export function setAdminCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure:
      process.env.COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure:
      process.env.COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
