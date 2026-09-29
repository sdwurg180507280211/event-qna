import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

export async function GET(request: Request) {
  if (!(await isAdmin())) return apiError("Unauthorized", 401);

  const eventCode = new URL(request.url).searchParams.get("eventCode");
  if (!eventCode) return apiError("eventCode is required");

  const event = await db.event.findUnique({ where: { code: eventCode } });
  if (!event) return apiError("Event not found", 404);

  const questions = await db.question.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      cwid: true,
      content: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      reviewedBy: true,
      _count: { select: { votes: true } },
    },
  });

  return NextResponse.json({
    questions: questions.map((question) => ({
      ...question,
      voteCount: question._count.votes,
      _count: undefined,
    })),
  });
}
