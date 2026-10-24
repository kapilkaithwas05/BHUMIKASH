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
    console.log("Seeding LabNEXUS with MITS-DU Institutional Data...");

    // 1. Departments
    const deptCSBS = await prisma.department.upsert({
      where: { code: "CSBS" },
      update: { name: "Computer Science and Business Systems" },
      create: {
        name: "Computer Science and Business Systems",
        code: "CSBS",
        description: "Department specializing in Computer Science core with business computing and systems",
      },
    });

    const deptAIDS = await prisma.department.upsert({
      where: { code: "AIDS" },
      update: { name: "Artificial Intelligence & Data Science" },
      create: {
        name: "Artificial Intelligence & Data Science",
        code: "AIDS",
        description: "Specialized department for AI, Machine Learning, and Big Data Analytics",
      },
    });

    const deptCSE = await prisma.department.upsert({
      where: { code: "CSE" },
      update: { name: "Computer Science and Engineering" },
      create: {
        name: "Computer Science and Engineering",
        code: "CSE",
        description: "Core computing, software engineering, and systems architectures",
      },
    });

    console.log("Departments created:", [deptCSBS.code, deptAIDS.code, deptCSE.code]);

    // 2. Users & Roles
    const defaultPasswordHash = await bcrypt.hash("NexusPass123!", 12);
    const studentPasswordHash = await bcrypt.hash("StudentPass123!", 12);
    const facultyPasswordHash = await bcrypt.hash("FacultyPass123!", 12);

    // VC / Institutional Administrator
    const vcUser = await prisma.user.upsert({
      where: { email: "vc@mitsgwalior.in" },
      update: {
        name: "Prof. R. K. Pandit",
        role: "VICE_CHANCELLOR",
      },
      create: {
        name: "Prof. R. K. Pandit",
        email: "vc@mitsgwalior.in",
        passwordHash: defaultPasswordHash,
        role: "VICE_CHANCELLOR",
      },
    });

    // HOD AIDS
    const hodUser = await prisma.user.upsert({
      where: { email: "hod.aids@mitsgwalior.in" },
      update: {
        name: "Dr. Rajni Ranjan Singh Makwana",
        role: "HOD",
        departmentId: deptAIDS.id,
      },
      create: {
        name: "Dr. Rajni Ranjan Singh Makwana",
        email: "hod.aids@mitsgwalior.in",
        passwordHash: defaultPasswordHash,
        role: "HOD",
        departmentId: deptAIDS.id,
      },
    });

    // Faculty CSBS (Multiple Faculty from reference)
    const facultyJK = await prisma.user.upsert({
      where: { email: "jk.muthele@mitsgwalior.in" },
      update: { name: "Prof. J.K. MUTHELE", role: "FACULTY", departmentId: deptCSBS.id },
      create: {
        name: "Prof. J.K. MUTHELE",
        email: "jk.muthele@mitsgwalior.in",
        passwordHash: facultyPasswordHash,
        role: "FACULTY",
        departmentId: deptCSBS.id,
      },
    });

    const facultyAditi = await prisma.user.upsert({
      where: { email: "aditi.samadhiya@mitsgwalior.in" },
      update: { name: "Ms. Aditi Samadhiya", role: "FACULTY", departmentId: deptCSBS.id },
      create: {
        name: "Ms. Aditi Samadhiya",
        email: "aditi.samadhiya@mitsgwalior.in",
        passwordHash: facultyPasswordHash,
        role: "FACULTY",
        departmentId: deptCSBS.id,
      },
    });

    // Primary Demo Student (Bhumika Pawar)
    const studentBhumika = await prisma.user.upsert({
      where: { email: "bhumika.pawar@mitsgwalior.in" },
      update: {
        name: "BHUMIKA PAWAR",
        role: "STUDENT",
        rollNumber: "0901AD231069",
        departmentId: deptCSBS.id,
      },
      create: {
        name: "BHUMIKA PAWAR",
        email: "bhumika.pawar@mitsgwalior.in",
        passwordHash: studentPasswordHash,
        role: "STUDENT",
        rollNumber: "0901AD231069",
        departmentId: deptCSBS.id,
      },
    });

    // Developer (Vaibhav Sharma)
    const devVaibhav = await prisma.user.upsert({
      where: { email: "vaibhav.sharma@mitsgwalior.in" },
      update: {
        name: "Vaibhav Sharma",
        role: "STUDENT",
        rollNumber: "0901AD231000",
        departmentId: deptAIDS.id,
      },
      create: {
        name: "Vaibhav Sharma",
        email: "vaibhav.sharma@mitsgwalior.in",
        passwordHash: studentPasswordHash,
        role: "STUDENT",
        rollNumber: "0901AD231000",
        departmentId: deptAIDS.id,
      },
    });

    console.log("Core users provisioned (VC, HOD, Faculty, Students)");

    // 3. Labs (Courses from reference)
    const dsaLab = await prisma.lab.upsert({
      where: { enrollmentKey: "DAA2026" },
      update: {
        title: "DESIGN AND ANALYSIS OF ALGORITHMS",
        code: "30252102",
        description: "Practical implementations of linear & non-linear data structures, trees, graphs, and algorithmic complexity analysis.",
        language: "C",
        isPublished: true,
        departmentId: deptCSBS.id,
        createdById: facultyAditi.id,
      },
      create: {
        title: "DESIGN AND ANALYSIS OF ALGORITHMS",
        code: "30252102",
        description: "Practical implementations of linear & non-linear data structures, trees, graphs, and algorithmic complexity analysis.",
        language: "C",
        enrollmentKey: "DAA2026",
        isPublished: true,
        departmentId: deptCSBS.id,
        createdById: facultyAditi.id,
      },
    });

    const pythonLab = await prisma.lab.upsert({
      where: { enrollmentKey: "PYTHON2026" },
      update: {
        title: "PROBLEM SOLVING THROUGH PYTHON",
        code: "30252108",
        description: "Object-oriented scripting, algorithmic design, data parsing, and automated evaluation.",
        language: "PYTHON",
        isPublished: true,
        departmentId: deptCSBS.id,
        createdById: facultyJK.id,
      },
      create: {
        title: "PROBLEM SOLVING THROUGH PYTHON",
        code: "30252108",
        description: "Object-oriented scripting, algorithmic design, data parsing, and automated evaluation.",
        language: "PYTHON",
        enrollmentKey: "PYTHON2026",
        isPublished: true,
        departmentId: deptCSBS.id,
        createdById: facultyJK.id,
      },
    });

    const networkLab = await prisma.lab.upsert({
      where: { enrollmentKey: "NETWORKS2026" },
      update: {
        title: "COMPUTER NETWORKS",
        code: "30252103",
        description: "Network protocols, socket programming, and network simulations.",
        language: "CPP",
        isPublished: true,
        departmentId: deptCSBS.id,
        createdById: facultyJK.id,
      },
      create: {
        title: "COMPUTER NETWORKS",
        code: "30252103",
        description: "Network protocols, socket programming, and network simulations.",
        language: "CPP",
        enrollmentKey: "NETWORKS2026",
        isPublished: true,
        departmentId: deptCSBS.id,
        createdById: facultyJK.id,
      },
    });

    // 4. Enroll Bhumika into labs
    const studentLabs = [dsaLab.id, pythonLab.id, networkLab.id];
    for (const labId of studentLabs) {
      await prisma.enrollment.upsert({
        where: { studentId_labId: { studentId: studentBhumika.id, labId } },
        update: {},
        create: { studentId: studentBhumika.id, labId },
      });
    }

    // 5. Questions & Exams
    // (Keeping existing question/exam logic but updating titles/refs)
    const dsaQ1 = await prisma.question.create({
      data: {
        labId: dsaLab.id,
        title: "Quicksort Implementation",
        description: "Implement the Quicksort algorithm to sort an array of N integers in ascending order.\n\n### Input Format\n- N (number of elements)\n- N integers\n\n### Output Format\n- Sorted N integers",
        difficulty: "MEDIUM",
        marks: 20,
        testCases: {
          create: [
            { input: "5\n5 4 3 2 1", expectedOutput: "1 2 3 4 5", isHidden: false },
            { input: "6\n10 7 8 9 1 5", expectedOutput: "1 5 7 8 9 10", isHidden: true },
          ]
        }
      }
    });

    const now = new Date();
    const examStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 mins ago
    const examEnd = new Date(now.getTime() + 55 * 60 * 1000); // 55 mins left

    await prisma.examination.create({
      data: {
        labId: dsaLab.id,
        title: "Quiz- VI ( CSBS- A ) III sem.",
        description: "Numerical Techniques & Algorithmic Analysis Quiz.",
        startTime: examStart,
        endTime: examEnd,
        durationMinutes: 10,
        totalMarks: 10,
        isPublished: true,
        questions: { create: [{ questionId: dsaQ1.id, orderIndex: 0 }] }
      }
    });

    // 6. Audit Log
    await prisma.auditLog.create({
      data: {
        userId: vcUser.id,
        action: "INSTITUTION_INITIALIZATION",
        entity: "MITS_DU",
        details: "MITS-DU Academics Management System portal initialized for CSBS & AIDS departments.",
        ipAddress: "127.0.0.1",
      },
    });

    console.log("MITS-DU Seeding complete successfully!");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Seeding error:", e);
  process.exit(1);
});