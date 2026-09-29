import { createHash } from "node:crypto";

export function normalizeCwid(value: string) {
  return value.trim().toUpperCase();
}

export function voterKey(eventCode: string, cwid: string) {
  return createHash("sha256")
    .update(`${eventCode}:${normalizeCwid(cwid)}`)
    .digest("hex");
}
