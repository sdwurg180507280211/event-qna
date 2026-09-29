import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

type Context = {
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: Context) {
  const { eventId } = await context.params;

  const event = await db.event.findUnique({
    where: { code: eventId },
    select: { id: true, active: true },
  });

  if (!event?.active) {
    return apiError("活动不存在或已结束", 404);
  }

  const where = {
    eventId: event.id,
    status: "APPROVED" as const,
  };

  const [total, questions] = await Promise.all([
    db.question.count({ where }),
    db.question.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 500,
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json(
    { total, questions },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
