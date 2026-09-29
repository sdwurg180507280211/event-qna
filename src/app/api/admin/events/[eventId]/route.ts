import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

type Context = {
  params: Promise<{ eventId: string }>;
};

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  returnUrl: z
    .union([
      z
        .string()
        .trim()
        .url()
        .refine(
          (value) => /^https?:\/\//i.test(value),
          "仅支持 HTTP/HTTPS 地址",
        ),
      z.literal(""),
    ])
    .optional(),
  logoUrl: z
    .union([
      z
        .string()
        .trim()
        .url()
        .refine(
          (value) => /^https?:\/\//i.test(value),
          "仅支持 HTTP/HTTPS 地址",
        ),
      z.literal(""),
    ])
    .optional(),
  active: z.boolean(),
});

export async function GET(_request: Request, context: Context) {
  if (!(await isAdmin())) return apiError("Unauthorized", 401);

  const { eventId } = await context.params;
  const event = await db.event.findUnique({
    where: { code: eventId },
    select: {
      code: true,
      title: true,
      active: true,
      returnUrl: true,
      logoUrl: true,
    },
  });

  if (!event) return apiError("Event not found", 404);
  return NextResponse.json({ event });
}

export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return apiError("Unauthorized", 401);

  try {
    const { eventId } = await context.params;
    const input = updateSchema.parse(await request.json());

    const event = await db.event.update({
      where: { code: eventId },
      data: {
        title: input.title,
        active: input.active,
        returnUrl: input.returnUrl || null,
        logoUrl: input.logoUrl || null,
      },
      select: {
        code: true,
        title: true,
        active: true,
        returnUrl: true,
        logoUrl: true,
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid event settings");
    }
    console.error("Event settings update failed", error);
    return apiError("Unable to update event settings", 500);
  }
}
