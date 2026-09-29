import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import {
  setParticipantCookie,
  signParticipantSession,
  verifyStreamTicket,
} from "@/lib/auth";

const schema = z.object({
  eventCode: z.string().trim().min(1).max(100),
  ticket: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const identity = await verifyStreamTicket(input.ticket, input.eventCode);

    const event = await db.event.findUnique({ where: { code: input.eventCode } });
    if (!event || !event.active) {
      return apiError("Event not found or inactive", 404);
    }

    if (process.env.STREAM_REQUIRE_WHITELIST === "true") {
      const entry = await db.whitelistEntry.findUnique({
        where: {
          eventId_cwid: {
            eventId: event.id,
            cwid: identity.cwid,
          },
        },
      });

      if (!entry?.enabled) {
        return apiError("CWID is not authorized for this event", 403);
      }
    }

    const token = await signParticipantSession(identity);
    const response = NextResponse.json({ ok: true });
    setParticipantCookie(response, token);
    return response;
  } catch (error) {
    console.error("Ticket exchange failed", error);
    return apiError("Invalid or expired livestream ticket", 401);
  }
}
