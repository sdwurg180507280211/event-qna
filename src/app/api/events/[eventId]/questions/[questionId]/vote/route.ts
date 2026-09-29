import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { participantFor } from "@/lib/participant";
import { voterKey } from "@/lib/normalize";

type Context = { params: Promise<{ eventId: string; questionId: string }> };
async function setVote(context: Context, voted: boolean) {
  const { eventId, questionId } = await context.params;
  const access = await participantFor(eventId);
  if (!access) return apiError("登录已失效，请重新验证", 401);
  const key = voterKey(eventId, access.session.cwid);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const result = await db.$transaction(
        async (tx) => {
          const question = await tx.question.findFirst({
            where: {
              id: questionId,
              eventId: access.event.id,
              status: "APPROVED",
            },
          });
          if (!question) return null;
          if (voted) {
            await tx.vote.upsert({
              where: { questionId_voterKey: { questionId, voterKey: key } },
              update: {},
              create: { questionId, voterKey: key },
            });
          } else {
            await tx.vote.deleteMany({ where: { questionId, voterKey: key } });
          }
          return {
            voted,
            voteCount: await tx.vote.count({ where: { questionId } }),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return result
        ? NextResponse.json(result)
        : apiError("该问题已下架或不存在", 404);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code) &&
        attempt < 3
      )
        continue;
      console.error("Vote failed", error);
      return apiError("点赞未完成，请重试", 503);
    }
  }
}
export async function PUT(_request: Request, context: Context) {
  return setVote(context, true);
}
export async function DELETE(_request: Request, context: Context) {
  return setVote(context, false);
}
