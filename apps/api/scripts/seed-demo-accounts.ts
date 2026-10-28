import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Local development-only identities. These use reserved .test emails and contain no roster data.
const accounts = [
  { name: "Demo Vice Chancellor", email: "vc@labnexus.test", role: "VICE_CHANCELLOR" as const, password: "NexusPass123!", departmentId: null },
  { name: "Demo HOD", email: "hod.csbs@labnexus.test", role: "HOD" as const, password: "NexusPass123!", departmentCode: "CST" },
  { name: "Demo Faculty", email: "demo.faculty@labnexus.test", role: "FACULTY" as const, password: "FacultyPass123!", departmentCode: "CST" },
  { name: "Demo Faculty B", email: "demo.faculty.b@labnexus.test", role: "FACULTY" as const, password: "FacultyBPass123!", departmentCode: "AIDS" },
  { name: "Demo Student", email: "demo.student@labnexus.test", role: "STUDENT" as const, password: "StudentPass123!", departmentCode: "CST" },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const department = await prisma.department.upsert({
      where: { code: "CST" },
      update: {},
      create: { code: "CST", name: "Computer Science and Technology" },
      select: { id: true },
    });
    const aidsDepartment = await prisma.department.upsert({
      where: { code: "AIDS" },
      update: {},
      create: { code: "AIDS", name: "Artificial Intelligence and Data Science" },
      select: { id: true },
    });
    for (const account of accounts) {
      const departmentId = "departmentCode" in account
        ? account.departmentCode === "AIDS" ? aidsDepartment.id : department.id
        : null;
      const passwordHash = await bcrypt.hash(account.password, 12);
      await prisma.user.upsert({
        where: { email: account.email },
        update: { name: account.name, role: account.role, departmentId, isActive: true },
        create: { name: account.name, email: account.email, role: account.role, departmentId, passwordHash },
      });
    }

    // Additive, idempotent fixture for the complete HOD → faculty → student workflow.
    // The reserved .test users and DEMO-* identifiers are local demo data only.
    const academicYear = await prisma.academicYear.upsert({
      where: { label: "2026-27" },
      update: {},
      create: { label: "2026-27" },
    });
    const branchPrograms = await Promise.all([
      prisma.program.upsert({
        where: { departmentId_code: { departmentId: department.id, code: "CST" } },
        update: { name: "Computer Science and Technology" },
        create: { departmentId: department.id, code: "CST", name: "Computer Science and Technology" },
      }),
      prisma.program.upsert({
        where: { departmentId_code: { departmentId: department.id, code: "CSBS" } },
        update: { name: "Computer Science and Business Systems" },
        create: { departmentId: department.id, code: "CSBS", name: "Computer Science and Business Systems" },
      }),
    ]);
    const csbsProgram = branchPrograms.find(({ code }) => code === "CSBS")!;
    for (const program of branchPrograms) {
      for (const semester of [1, 3, 5]) {
        for (const section of ["A", "B"]) {
          await prisma.cohort.upsert({
            where: { programId_academicYearId_semester_section: { programId: program.id, academicYearId: academicYear.id, semester, section } },
            update: {},
            create: { programId: program.id, academicYearId: academicYear.id, semester, section },
          });
        }
      }
    }
    const cohort = await prisma.cohort.findUniqueOrThrow({
      where: { programId_academicYearId_semester_section: { programId: csbsProgram.id, academicYearId: academicYear.id, semester: 3, section: "A" } },
    });
    const course = await prisma.course.upsert({
      where: { departmentId_code: { departmentId: department.id, code: "DEMO-DA-3A" } },
      update: { title: "Demo Design and Analysis Lab" },
      create: { departmentId: department.id, code: "DEMO-DA-3A", title: "Demo Design and Analysis Lab" },
    });

    const demoFaculty = await prisma.user.findMany({
      where: { email: { in: ["demo.faculty@labnexus.test", "demo.faculty.b@labnexus.test"] } },
      select: { id: true, email: true },
    });
    const demoStudent = await prisma.user.findUniqueOrThrow({ where: { email: "demo.student@labnexus.test" }, select: { id: true } });
    const facultyProfiles = [];
    for (const faculty of demoFaculty) {
      facultyProfiles.push(await prisma.facultyProfile.upsert({
        where: { userId: faculty.id },
        update: { departmentId: department.id, isActive: true },
        create: { userId: faculty.id, departmentId: department.id, designation: "Demo Faculty" },
      }));
    }
    await prisma.studentProfile.upsert({
      where: { userId: demoStudent.id },
      update: { programId: csbsProgram.id, cohortId: cohort.id, isActive: true },
      create: { userId: demoStudent.id, enrollmentNumber: "DEMO-STUDENT-001", programId: csbsProgram.id, cohortId: cohort.id },
    });
    const lab = await prisma.lab.upsert({
      where: { enrollmentKey: "DEMO-CSBS-DA-3A" },
      update: { title: "Demo · Design and Analysis Lab", code: "DEMO-DA-3A", language: "CPP", isPublished: true, departmentId: department.id, courseId: course.id, cohortId: cohort.id, createdById: demoFaculty[0].id },
      create: { title: "Demo · Design and Analysis Lab", code: "DEMO-DA-3A", description: "Reserved local workflow fixture for verifying faculty, student, question, and submission connectivity.", language: "CPP", enrollmentKey: "DEMO-CSBS-DA-3A", isPublished: true, departmentId: department.id, courseId: course.id, cohortId: cohort.id, createdById: demoFaculty[0].id },
    });
    for (const profile of facultyProfiles) {
      await prisma.labFacultyAssignment.upsert({
        where: { labId_facultyId: { labId: lab.id, facultyId: profile.id } },
        update: {},
        create: { labId: lab.id, facultyId: profile.id },
      });
    }
    await prisma.enrollment.upsert({
      where: { studentId_labId: { studentId: demoStudent.id, labId: lab.id } },
      update: {},
      create: { studentId: demoStudent.id, labId: lab.id },
    });
    const existingQuestion = await prisma.question.findFirst({ where: { labId: lab.id, title: "Demo: Sum two integers" }, select: { id: true } });
    if (!existingQuestion) {
      await prisma.question.create({
        data: { labId: lab.id, title: "Demo: Sum two integers", contentType: "DAILY", isPublished: true, description: "Read two integers and print their sum.", inputFormat: "Two integers separated by a space.", outputFormat: "Print their sum.", difficulty: "EASY", marks: 10, timeLimitMs: 2000, memoryLimitMb: 128, orderIndex: 0, testCases: { create: [{ input: "2 3", expectedOutput: "5", orderIndex: 0 }] } },
      });
    }
    console.log("Local demo accounts and additive CST → CSBS Sem 3-A connectivity data are ready. Existing submissions and institutional roster records were preserved.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Could not provision local demo accounts:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
