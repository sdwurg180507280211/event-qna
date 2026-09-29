import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { normalizeCwid } from "@/lib/normalize";
import { setParticipantCookie, signParticipantSession } from "@/lib/auth";

const schema = z.object({
  eventCode: z.string().trim().min(1).max(100),
  cwid: z.string().trim().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const cwid = normalizeCwid(input.cwid);

    const event = await db.event.findUnique({ where: { code: input.eventCode } });
    if (!event || !event.active) {
      return apiError("Event not found or inactive", 404);
    }

    const entry = await db.whitelistEntry.findUnique({
      where: {
        eventId_cwid: {
          eventId: event.id,
          cwid,
        },
      },
    });

    if (!entry?.enabled) {
      return apiError("CWID is not authorized for this event", 403);
    }

    const token = await signParticipantSession({
      eventCode: event.code,
      cwid,
      name: entry.name ?? undefined,
      source: "whitelist",
    });

    const response = NextResponse.json({ ok: true });
    setParticipantCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid login request");
    }
    console.error("CWID login failed", error);
    return apiError("Unable to sign in", 500);
  }
}
