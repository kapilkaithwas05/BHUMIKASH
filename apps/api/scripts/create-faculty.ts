
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const passwordHash = await bcrypt.hash("FacultyPass123!", 12);

    const faculty = await prisma.user.upsert({
      where: { email: "demo.faculty@labnexus.test" },
      update: {
        name: "Demo Faculty",
        passwordHash,
        role: "FACULTY",
      },
      create: {
        name: "Demo Faculty",
        email: "demo.faculty@labnexus.test",
        passwordHash,
        role: "FACULTY",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log("Faculty account ready:", faculty);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Could not create faculty account:", error);
  process.exitCode = 1;
});

