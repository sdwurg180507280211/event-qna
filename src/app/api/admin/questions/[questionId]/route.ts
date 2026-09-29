import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { transitions } from "@/lib/moderation";
const schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "HIDDEN"]),
});
export async function PATCH(
  request: Request,
  context: { params: Promise<{ questionId: string }> },
) {
  if (!(await isAdmin())) return apiError("请先登录管理员账号", 401);
  try {
    const { questionId } = await context.params;
    const { status } = schema.parse(await request.json());
    const current = await db.question.findUnique({ where: { id: questionId } });
    if (!current) return apiError("问题不存在", 404);
    if (!transitions[current.status].includes(status))
      return apiError("问题状态已变化，请刷新后重试", 409);
    const result = await db.question.updateMany({
      where: { id: questionId, status: current.status },
      data: { status, reviewedAt: new Date(), reviewedBy: "admin" },
    });
    if (!result.count) return apiError("问题已由其他管理员处理，请刷新", 409);
    return NextResponse.json({ question: { id: questionId, status } });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return apiError("审核请求无效");
    console.error("Moderation failed", error);
    return apiError("审核未完成，请稍后重试", 500);
  }
}
