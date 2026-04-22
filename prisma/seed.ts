import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // All players across Sunday and Wednesday leagues
  const players = [
    "Jakub",
    "Joe",
    "Jon",
    "Matt",
    "Charlie",
    "Izra",
    "Dan",
    "Caleb",
  ];

  console.log("Seeding database...");

  for (const name of players) {
    await prisma.player.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`Created player: ${name}`);
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
