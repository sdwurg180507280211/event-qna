import { readParticipantSession } from "@/lib/auth";
import { db } from "@/lib/db";

/** Re-check eligibility so disabling a whitelist entry also revokes old sessions. */
export async function participantFor(eventCode: string) {
  const session = await readParticipantSession();
  if (!session || session.eventCode !== eventCode) return null;
  const event = await db.event.findUnique({ where: { code: eventCode } });
  if (!event?.active) return null;
  if (
    session.source === "whitelist" ||
    process.env.STREAM_REQUIRE_WHITELIST === "true"
  ) {
    const entry = await db.whitelistEntry.findUnique({
      where: { eventId_cwid: { eventId: event.id, cwid: session.cwid } },
    });
    if (!entry?.enabled) return null;
  }
  return { session, event };
}
