import { db } from "@/lib/db";

/** Public participation: only the activity's open/closed state controls access. */
export async function participantFor(eventCode: string) {
  const event = await db.event.findUnique({ where: { code: eventCode } });
  if (!event?.active) return null;
  return { event, session: { cwid: "匿名访客" } };
}
