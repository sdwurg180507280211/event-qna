import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { participantFor } from "@/lib/participant";
import { voterKey } from "@/lib/normalize";

type Context = { params: Promise<{ eventId: string }> };
const submitSchema = z.object({ content: z.string().trim().min(2).max(1000) });
const paging = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(6),
});

export async function GET(request: Request, context: Context) {
  const { eventId } = await context.params;
  const access = await participantFor(eventId);
  if (!access) return apiError("登录已失效或活动已结束，请重新验证", 401);
  const { session, event } = access;
  const url = new URL(request.url);
  const parsed = paging.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return apiError("分页参数无效");
  const { pageSize } = parsed.data;
  const key = voterKey(event.code, session.cwid);
  const where = { eventId: event.id, status: "APPROVED" as const };
  const total = await db.question.count({ where });
  const page = Math.min(
    parsed.data.page,
    Math.max(1, Math.ceil(total / pageSize)),
  );
  const questions = await db.question.findMany({
    where,
    orderBy:
      url.searchParams.get("sort") === "hot"
        ? [{ votes: { _count: "desc" } }, { createdAt: "desc" }, { id: "desc" }]
        : [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      content: true,
      createdAt: true,
      _count: { select: { votes: true } },
      votes: { where: { voterKey: key }, select: { id: true }, take: 1 },
    },
  });
  return NextResponse.json({
    page,
    pageSize,
    total,
    questions: questions.map((q) => ({
      id: q.id,
      content: q.content,
      createdAt: q.createdAt,
      voteCount: q._count.votes,
      hasVoted: q.votes.length > 0,
    })),
  });
}

export async function POST(request: Request, context: Context) {
  const { eventId } = await context.params;
  const access = await participantFor(eventId);
  if (!access) return apiError("登录已失效或活动已结束，请重新验证", 401);
  try {
    const input = submitSchema.parse(await request.json());
    const question = await db.question.create({
      data: {
        eventId: access.event.id,
        cwid: access.session.cwid,
        content: input.content,
        status: "PENDING",
      },
      select: { id: true, status: true, createdAt: true },
    });
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return apiError("问题请输入 2–1000 个字符");
    console.error("Question submission failed", error);
    return apiError("暂时无法提交，请稍后重试", 500);
  }
}
