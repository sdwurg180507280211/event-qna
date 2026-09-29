import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const samples = [
  "Test question 1 - Hi XXX, which aspects have impressed you the most? How have these impressions influenced your leadership style and the future development?",
  "Test question 2 - Hello xxx, welcome to Shanghai! While implementing \"Road to Billions\" strategy, what do you think the biggest challenge? How can we collectively address it?",
  "Test question 3 - What are our main strategic goals for next year? When facing market changes, what strategies do we plan to adopt to maintain our competitiveness and leading position?",
];

async function main() {
  const event = await db.event.findUniqueOrThrow({ where: { code: "demo" } });

  await db.question.deleteMany({
    where: {
      eventId: event.id,
      id: { startsWith: "acceptance-demo-" },
    },
  });

  for (let i = 0; i < samples.length; i++) {
    await db.question.create({
      data: {
        id: `acceptance-demo-${i + 1}`,
        eventId: event.id,
        cwid: "demo",
        content: samples[i],
        status: "APPROVED",
        createdAt: new Date(Date.now() - i * 60000),
        reviewedAt: new Date(),
        reviewedBy: "demo-seed",
      },
    });
  }

  console.log("Prepared the three approved display test questions for event demo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
