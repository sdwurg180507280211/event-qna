import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

type Context = {
  params: Promise<{ questionId: string }>;
};

const schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "HIDDEN"]),
});

export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return apiError("Unauthorized", 401);

  try {
    const { questionId } = await context.params;
    const input = schema.parse(await request.json());

    const question = await db.question.update({
      where: { id: questionId },
      data: {
        status: input.status,
        reviewedAt: new Date(),
        reviewedBy: "admin",
      },
      select: {
        id: true,
        status: true,
        reviewedAt: true,
      },
    });

    return NextResponse.json({ question });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid moderation status");
    }
    console.error("Moderation update failed", error);
    return apiError("Unable to update question", 500);
  }
}
