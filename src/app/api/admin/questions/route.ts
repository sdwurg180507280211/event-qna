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
    counts: Object.fromEntries(grouped.map((g) => [g.status, g._count])),
    questions,
  });
}
