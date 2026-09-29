import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const event = await prisma.event.upsert({
    where: { code: "demo" },
    update: {
      title: "Event Q&A Demo",
      active: true,
    },
    create: {
      code: "demo",
      title: "Event Q&A Demo",
      active: true,
      returnUrl: "https://example.com/live",
    },
  });

  for (const [cwid, name] of [
    ["C10001", "Demo User 1"],
    ["C10002", "Demo User 2"],
    ["C10003", "Demo User 3"],
  ] as const) {
    await prisma.whitelistEntry.upsert({
      where: {
        eventId_cwid: {
          eventId: event.id,
          cwid,
        },
      },
      update: { name, enabled: true },
      create: {
        eventId: event.id,
        cwid,
        name,
      },
    });
  }

  console.log("Seeded event code: demo");
  console.log("Demo CWIDs: C10001, C10002, C10003");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
