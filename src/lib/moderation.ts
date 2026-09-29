import type { QuestionStatus } from "@prisma/client";
export const transitions: Record<QuestionStatus, readonly QuestionStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["HIDDEN"],
  REJECTED: ["PENDING"],
  HIDDEN: ["PENDING"],
};
