import { apiError } from "@/lib/http";
import { participantFor } from "@/lib/participant";

type Context = { params: Promise<{ eventId: string; questionId: string }> };

async function removed(context: Context) {
  const { eventId } = await context.params;
  if (!(await participantFor(eventId))) {
    return apiError("活动不存在或已结束", 404);
  }
  return apiError("点赞功能已移除", 410);
}

export async function PUT(_request: Request, context: Context) {
  return removed(context);
}

export async function DELETE(_request: Request, context: Context) {
  return removed(context);
}
