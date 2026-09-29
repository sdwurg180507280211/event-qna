import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { normalizeCwid } from "@/lib/normalize";

const entriesSchema = z.object({
  eventCode: z.string().trim().min(1).max(100),
  entries: z
    .array(
      z.object({
        cwid: z.string().trim().min(1).max(100),
        name: z.string().trim().max(200).optional(),
      }),
    )
    .min(1)
    .max(5000),
});

const deleteSchema = z.object({
  eventCode: z.string().trim().min(1).max(100),
  cwid: z.string().trim().min(1).max(100),
});

export async function GET(request: Request) {
  if (!(await isAdmin())) return apiError("Unauthorized", 401);

  const eventCode = new URL(request.url).searchParams.get("eventCode");
  if (!eventCode) return apiError("eventCode is required");

  const event = await db.event.findUnique({ where: { code: eventCode } });
  if (!event) return apiError("Event not found", 404);

  const entries = await db.whitelistEntry.findMany({
    where: { eventId: event.id },
    orderBy: { cwid: "asc" },
    take: 10000,
    select: {
      cwid: true,
      name: true,
      enabled: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return apiError("Unauthorized", 401);

  try {
    const input = entriesSchema.parse(await request.json());
    const event = await db.event.findUnique({
      where: { code: input.eventCode },
    });
    if (!event) return apiError("Event not found", 404);

    const entries = input.entries.map((entry) => ({
      cwid: normalizeCwid(entry.cwid),
      name: entry.name?.trim() || null,
    }));

    await db.$transaction(
      entries.map((entry) =>
        db.whitelistEntry.upsert({
          where: {
            eventId_cwid: {
              eventId: event.id,
              cwid: entry.cwid,
            },
          },
          update: {
            name: entry.name,
            enabled: true,
          },
          create: {
            eventId: event.id,
            cwid: entry.cwid,
            name: entry.name,
            enabled: true,
          },
        }),
      ),
    );

    return NextResponse.json({ ok: true, count: entries.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid whitelist payload");
    }
    console.error("Whitelist update failed", error);
    return apiError("Unable to update whitelist", 500);
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return apiError("Unauthorized", 401);

  try {
    const input = deleteSchema.parse(await request.json());
    const event = await db.event.findUnique({
      where: { code: input.eventCode },
    });
    if (!event) return apiError("Event not found", 404);

    const cwid = normalizeCwid(input.cwid);
    await db.whitelistEntry.update({
      where: {
        eventId_cwid: {
          eventId: event.id,
          cwid,
        },
      },
      data: { enabled: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid whitelist request");
    }
    console.error("Whitelist disable failed", error);
    return apiError("Unable to disable whitelist entry", 500);
  }
}
