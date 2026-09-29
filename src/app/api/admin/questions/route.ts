import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

const querySchema = z.object({
  eventCode: z.string().min(1),
  status: z
    .enum(["ALL", "PENDING", "APPROVED", "REJECTED", "HIDDEN"])
    .default("ALL"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  search: z.string().max(200).default(""),
});

const publishSchema = z.object({
  eventCode: z.string().trim().min(1).max(100),
  content: z.string().trim().min(2).max(1000),
});

export async function GET(request: Request) {
  if (!(await isAdmin())) return apiError("请先登录管理员账号", 401);

  const query = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) return apiError("查询参数无效");

  const { eventCode, status, search } = query.data;
  const event = await db.event.findUnique({ where: { code: eventCode } });
  if (!event) return apiError("活动不存在，请检查活动代码", 404);

  const where = {
    eventId: event.id,
    ...(status !== "ALL" ? { status } : {}),
    ...(search
      ? {
          OR: [
            { content: { contains: search, mode: "insensitive" as const } },
            { cwid: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, grouped] = await Promise.all([
    db.question.count({ where }),
    db.question.groupBy({
      by: ["status"],
      where: { eventId: event.id },
      _count: true,
    }),
  ]);

  const pageSize = 12;
  const page = Math.min(
    query.data.page,
    Math.max(1, Math.ceil(total / pageSize)),
  );

  const questions = await db.question.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      cwid: true,
      content: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      reviewedBy: true,
    },
  });

  return NextResponse.json({
    total,
    page,
    pageSize,
    counts: Object.fromEntries(grouped.map((group) => [group.status, group._count])),
    questions,
  });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return apiError("请先登录管理员账号", 401);

  try {
    const input = publishSchema.parse(await request.json());
    const event = await db.event.findUnique({ where: { code: input.eventCode } });

    if (!event?.active) {
      return apiError("活动不存在或已结束", 404);
    }

    const question = await db.question.create({
      data: {
        eventId: event.id,
        cwid: "后台发布",
        content: input.content,
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: "admin",
      },
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return apiError("问题请输入 2–1000 个字符");
    }

    console.error("Admin question publish failed", error);
    return apiError("问题发布失败，请稍后重试", 500);
  }
}
