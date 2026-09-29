import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { readParticipantSession } from "@/lib/auth";
import { voterKey } from "@/lib/normalize";

type Context = {
  params: Promise<{ eventId: string; questionId: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { eventId, questionId } = await context.params;
  const session = await readParticipantSession();

  if (!session || session.eventCode !== eventId) {
    return apiError("Unauthorized", 401);
  }

  const event = await db.event.findUnique({ where: { code: eventId } });
  if (!event || !event.active) return apiError("Event not found", 404);

  const question = await db.question.findFirst({
    where: {
      id: questionId,
      eventId: event.id,
      status: "APPROVED",
    },
    select: { id: true },
  });

  if (!question) return apiError("Question not found", 404);

  const key = voterKey(event.code, session.cwid);
  const existing = await db.vote.findUnique({
    where: {
      questionId_voterKey: {
        questionId,
        voterKey: key,
      },
    },
  });

  if (existing) {
    await db.vote.delete({ where: { id: existing.id } });
  } else {
    await db.vote.create({
      data: {
        questionId,
        voterKey: key,
      },
    });
  }

  const voteCount = await db.vote.count({ where: { questionId } });
  return NextResponse.json({
    voted: !existing,
    voteCount,
  });
}
