
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const students = [
  { name: "Aarav Sharma", email: "csbs.student01@mitsgwl.ac.in" },
  { name: "Ananya Verma", email: "csbs.student02@mitsgwl.ac.in" },
  { name: "Rohan Gupta", email: "csbs.student03@mitsgwl.ac.in" },
  { name: "Priya Singh", email: "csbs.student04@mitsgwl.ac.in" },
  { name: "Aditya Jain", email: "csbs.student05@mitsgwl.ac.in" },
  { name: "Isha Patel", email: "csbs.student06@mitsgwl.ac.in" },
  { name: "Kabir Mehta", email: "csbs.student07@mitsgwl.ac.in" },
  { name: "Sneha Yadav", email: "csbs.student08@mitsgwl.ac.in" },
  { name: "Arjun Rao", email: "csbs.student09@mitsgwl.ac.in" },
  { name: "Kavya Mishra", email: "csbs.student10@mitsgwl.ac.in" },
  { name: "Dev Malhotra", email: "csbs.student11@mitsgwl.ac.in" },
  { name: "Meera Joshi", email: "csbs.student12@mitsgwl.ac.in" },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const passwordHash = await bcrypt.hash("StudentDemo123!", 12);

    for (const student of students) {
      const user = await prisma.user.upsert({
        where: { email: student.email },
        update: {
          name: student.name,
          role: "STUDENT",
        },
        create: {
          name: student.name,
          email: student.email,
          passwordHash,
          role: "STUDENT",
        },
        select: {
          name: true,
          email: true,
          role: true,
        },
      });

      console.log(`Ready: ${user.email} (${user.role})`);
    }

    console.log(`\nFinished. Processed ${students.length} student accounts.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Student seeding failed:", error);
  process.exitCode = 1;
});
