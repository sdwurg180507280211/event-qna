import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { readParticipantSession } from "@/lib/auth";
import { voterKey } from "@/lib/normalize";

type Context = {
  params: Promise<{ eventId: string }>;
};

const submitSchema = z.object({
  content: z.string().trim().min(2).max(1000),
});

async function participantFor(eventCode: string) {
  const session = await readParticipantSession();
  if (!session || session.eventCode !== eventCode) return null;
  return session;
}

export async function GET(request: Request, context: Context) {
  const { eventId } = await context.params;
  const session = await participantFor(eventId);
  if (!session) return apiError("Unauthorized", 401);

  const event = await db.event.findUnique({ where: { code: eventId } });
  if (!event || !event.active) return apiError("Event not found", 404);

  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") === "hot" ? "hot" : "latest";
  const key = voterKey(event.code, session.cwid);

  const orderBy =
    sort === "hot"
      ? [
          { votes: { _count: "desc" as const } },
          { createdAt: "desc" as const },
        ]
      : [{ createdAt: "desc" as const }];

  const questions = await db.question.findMany({
    where: {
      eventId: event.id,
      status: "APPROVED",
    },
    orderBy,
    take: 100,
    select: {
      id: true,
      content: true,
      createdAt: true,
      _count: {
        select: { votes: true },
      },
      votes: {
        where: { voterKey: key },
        select: { id: true },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    questions: questions.map((question) => ({
      id: question.id,
      content: question.content,
      createdAt: question.createdAt,
      voteCount: question._count.votes,
      hasVoted: question.votes.length > 0,
    })),
  });
}

export async function POST(request: Request, context: Context) {
  const { eventId } = await context.params;
  const session = await participantFor(eventId);
  if (!session) return apiError("Unauthorized", 401);

  try {
    const input = submitSchema.parse(await request.json());
    const event = await db.event.findUnique({ where: { code: eventId } });
    if (!event || !event.active) return apiError("Event not found", 404);

    const question = await db.question.create({
      data: {
        eventId: event.id,
        cwid: session.cwid,
        content: input.content,
        status: "PENDING",
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Question must contain 2-1000 characters");
    }
    console.error("Question submission failed", error);
    return apiError("Unable to submit question", 500);
  }
}
