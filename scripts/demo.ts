import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const samples = [
  "我们如何运用 AI 改善跨部门协作，让创新更快地转化为实际成果？",
  "What opportunities will there be for colleagues in China to participate in global projects and exchange programs?",
  "面向未来三年，公司最希望在哪些领域取得突破？我们可以从哪些具体行动开始？",
  "对于年轻同事的职业发展，管理团队有什么建议？是否会有更多跨团队学习和轮岗的机会？",
  "How can we keep the voice of our customers and patients at the center of everyday decisions, while exploring new technology and building stronger teams across regions?",
  "未来是否会增加跨部门交流的机会，让大家更好地了解彼此的工作？",
  "活动结束后，未能现场回答的问题会通过什么方式向大家反馈？",
  "感谢这次面对面交流的机会！期待未来有更多这样的开放对话。",
];
async function main() {
  const event = await db.event.findUniqueOrThrow({ where: { code: "demo" } });
  for (let i = 0; i < samples.length; i++) {
    const id = `acceptance-demo-${i}`;
    await db.question.upsert({
      where: { id },
      update: {},
      create: {
        id,
        eventId: event.id,
        cwid: "C10001",
        content: `【演示问题】${samples[i]}`,
        status: "APPROVED",
        createdAt: new Date(Date.now() - (i + 1) * 3600000),
        reviewedAt: new Date(),
        reviewedBy: "demo-seed",
      },
    });
  }
  await db.question.upsert({
    where: { id: "acceptance-demo-pending" },
    update: {},
    create: {
      id: "acceptance-demo-pending",
      eventId: event.id,
      cwid: "C10002",
      content: "【演示待审】下一次全员交流会是什么时候？",
      status: "PENDING",
    },
  });
  console.log("Demo questions prepared for event demo (explicitly labeled).");
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
