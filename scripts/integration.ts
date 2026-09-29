import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { createHmac } from "node:crypto";
const db = new PrismaClient();
const origin = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3036";
const code = `check-${Date.now()}`;
let adminCookie = "";
let userCookie = "";
let checks = 0;
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "",
) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  return {
    status: response.status,
    json,
    cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
  };
}
function check(condition: unknown, label: string) {
  assert.ok(condition, label);
  checks++;
  console.log(`PASS ${label}`);
}
async function ticket(
  overrides: {
    eventCode?: string;
    exp?: string;
    omitExp?: boolean;
    omitIat?: boolean;
  } = {},
) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    eventCode: overrides.eventCode ?? code,
    sub: "C-STREAM",
    iss: process.env.STREAM_TICKET_ISSUER ?? "livestream",
    aud: process.env.STREAM_TICKET_AUDIENCE ?? "event-qna",
    ...(!overrides.omitIat ? { iat: now } : {}),
    ...(!overrides.omitExp
      ? {
          exp:
            now +
            (overrides.exp === "-1m"
              ? -60
              : overrides.exp === "1h"
                ? 3600
                : 300),
        }
      : {}),
  };
  const message =
    Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url") +
    "." +
    Buffer.from(JSON.stringify(payload)).toString("base64url");
  return (
    message +
    "." +
    createHmac("sha256", process.env.STREAM_SSO_SECRET!)
      .update(message)
      .digest("base64url")
  );
}
async function main() {
  try {
    const event = await db.event.create({
      data: {
        code,
        title: "Integration test",
        whitelistEntries: {
          create: { cwid: "C-TEST", name: "Private identity" },
        },
      },
    });
    const path = `/api/events/${code}/questions`;
    check(
      (await request(path)).status === 200,
      "public pool accessible without login",
    );
    check(
      (await request("/api/admin/questions?eventCode=" + code)).status === 401,
      "admin requires session",
    );
    check(
      (
        await request("/api/auth/cwid", "POST", {
          eventCode: code,
          cwid: "NOT-IN-LIST",
        })
      ).status === 403,
      "unknown CWID denied",
    );
    const user = await request("/api/auth/cwid", "POST", {
      eventCode: code,
      cwid: " c-test ",
    });
    userCookie = user.cookie;
    check(user.status === 200 && !!userCookie, "CWID normalization and login");
    const admin = await request("/api/admin/login", "POST", {
      password: process.env.ADMIN_PASSWORD,
    });
    adminCookie = admin.cookie;
    check(admin.status === 200, "admin login");
    const submission = await request(path, "POST", {
      content: "测试问题：审核后才可见。",
    });
    const id = submission.json.question.id;
    check(
      submission.status === 201 &&
        submission.json.question.status === "PENDING",
      "submission without login defaults pending",
    );
    check(
      (await request(path, "GET", undefined, userCookie)).json.total === 0,
      "pending excluded from pool",
    );
    check(
      (await request(path + "/" + id + "/vote", "PUT", undefined, userCookie))
        .status === 410,
      "legacy voting endpoint removed",
    );
    check(
      (await db.question.findUnique({ where: { id } }))?.cwid === "匿名访客",
      "public submission records anonymous guest instead of identity",
    );
    const moderate = (status: string) =>
      request(`/api/admin/questions/${id}`, "PATCH", { status }, adminCookie);
    check(
      (await moderate("HIDDEN")).status === 409,
      "invalid transition rejected",
    );
    check(
      (await moderate("APPROVED")).status === 200,
      "admin approves question",
    );
    const pool = await request(path, "GET", undefined, userCookie);
    check(
      pool.json.total === 1 && pool.json.questions[0].id === id,
      "approved question visible",
    );
    check(
      !JSON.stringify(pool.json).includes("C-TEST") &&
        !JSON.stringify(pool.json).includes("cwid") &&
        !JSON.stringify(pool.json).includes("Private identity"),
      "participant response anonymous",
    );
    const votePath = `${path}/${id}/vote`;
    check(
      (await request(votePath, "PUT", undefined, userCookie)).status === 410 &&
        (await request(votePath, "DELETE", undefined, userCookie)).status ===
          410 &&
        (await db.vote.count({ where: { questionId: id } })) === 0,
      "removed vote endpoints cannot change data",
    );
    check(
      !("voteCount" in pool.json.questions[0]) &&
        !("hasVoted" in pool.json.questions[0]),
      "question response excludes removed vote fields",
    );
    await moderate("HIDDEN");
    check(
      (await request(path, "GET", undefined, userCookie)).json.total === 0,
      "hidden removed from pool",
    );
    await moderate("PENDING");
    await moderate("REJECTED");
    check(
      (await request(path, "GET", undefined, userCookie)).json.total === 0,
      "rejected excluded from pool",
    );
    await db.question.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({
        eventId: event.id,
        cwid: "C-TEST",
        content: `Approved pagination ${i}`,
        createdAt: new Date(Date.now() - (8 - i) * 60000),
        status: "APPROVED" as const,
      })),
    });
    const page1 = (await request(path, "GET", undefined, userCookie)).json;
    const legacyHot = (
      await request(path + "?sort=hot", "GET", undefined, userCookie)
    ).json;
    check(
      page1.questions[0].content === "Approved pagination 7" &&
        page1.questions.every(
          (q: { createdAt: string }, i: number, all: { createdAt: string }[]) =>
            i === 0 ||
            new Date(all[i - 1].createdAt).getTime() >=
              new Date(q.createdAt).getTime(),
        ) &&
        JSON.stringify(legacyHot.questions) === JSON.stringify(page1.questions),
      "latest questions first even with legacy hot parameter",
    );
    const page2 = (
      await request(path + "?page=2", "GET", undefined, userCookie)
    ).json;
    check(
      page1.total === 8 &&
        page1.questions.length === 6 &&
        page2.questions.length === 2 &&
        !page2.questions.some((q: { id: string }) =>
          page1.questions.some((r: { id: string }) => r.id === q.id),
        ),
      "stable pagination and real total",
    );
    check(
      (await request(path + "?page=-1", "GET", undefined, userCookie))
        .status === 400,
      "invalid pagination rejected",
    );
    check(
      (
        await request(
          "/api/admin/whitelist",
          "DELETE",
          { eventCode: code, cwid: "C-TEST" },
          adminCookie,
        )
      ).status === 200,
      "whitelist disable",
    );
    check(
      (await request(path)).status === 200 &&
        (await request(path, "POST", { content: "Public guest question" }))
          .status === 201 &&
        (await request(path, "GET", undefined, userCookie)).status === 200,
      "public access no longer depends on whitelist or previous sessions",
    );
    for (const [label, options] of [
      ["missing exp", { omitExp: true }],
      ["missing iat", { omitIat: true }],
      ["expired", { exp: "-1m" }],
      ["overlong", { exp: "1h" }],
      ["wrong event", { eventCode: "other" }],
    ] as const) {
      const result = await request("/api/auth/ticket", "POST", {
        eventCode: code,
        ticket: await ticket(options),
      });
      check(result.status === 401, `ticket ${label} denied`);
    }
    if (process.env.STREAM_REQUIRE_WHITELIST === "true")
      await db.whitelistEntry.create({
        data: { eventId: event.id, cwid: "C-STREAM" },
      });
    const valid = await request("/api/auth/ticket", "POST", {
      eventCode: code,
      ticket: await ticket(),
    });
    check(
      valid.status === 200 &&
        (await request(path, "GET", undefined, valid.cookie)).status === 200,
      "valid ticket establishes usable session",
    );
    const unsafeUrl = await request(
      `/api/admin/events/${code}`,
      "PATCH",
      { title: "Test", active: true, returnUrl: "javascript:alert(1)" },
      adminCookie,
    );
    check(unsafeUrl.status === 400, "non-HTTP return links rejected");
    await db.event.update({ where: { id: event.id }, data: { active: false } });
    check(
      (await request(path, "GET", undefined, valid.cookie)).status === 404,
      "closed event blocks public access",
    );
    console.log(`\n${checks} integration checks passed against ${origin}`);
  } finally {
    await db.event.deleteMany({ where: { code } });
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
