import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

type Context = {
  params: Promise<{ eventId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { eventId } = await context.params;

  const event = await db.event.findUnique({
    where: { code: eventId },
    select: {
      code: true,
      title: true,
      active: true,
      returnUrl: true,
      logoUrl: true,
    },
  });

  if (!event || !event.active) {
    return apiError("Event not found or inactive", 404);
  }

  return NextResponse.json({ event });
}
