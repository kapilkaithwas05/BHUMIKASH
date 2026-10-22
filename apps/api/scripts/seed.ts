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
    console.log("Seeding LabNEXUS institutional data...");

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

    const deptCSE = await prisma.department.upsert({
      where: { code: "CSE" },
      update: { name: "Computer Science and Engineering" },
      create: {
        name: "Computer Science and Engineering",
        code: "CSE",
        description: "Core computing, software engineering, and systems architectures",
      },
    });

    const deptIT = await prisma.department.upsert({
      where: { code: "IT" },
      update: { name: "Information Technology" },
      create: {
        name: "Information Technology",
        code: "IT",
        description: "Network systems, cloud engineering, and web applications",
      },
    });

    console.log("Departments created:", [deptCSBS.code, deptCSE.code, deptIT.code]);

    // 2. Users
    const defaultPasswordHash = await bcrypt.hash("NexusPass123!", 12);
    const studentPasswordHash = await bcrypt.hash("StudentPass123!", 12);
    const facultyPasswordHash = await bcrypt.hash("FacultyPass123!", 12);

    // VC / Institutional Administrator
    const vcUser = await prisma.user.upsert({
      where: { email: "vc@labnexus.edu" },
      update: {
        name: "Prof. R. K. Saxena",
        role: "VICE_CHANCELLOR",
      },
      create: {
        name: "Prof. R. K. Saxena",
        email: "vc@labnexus.edu",
        passwordHash: defaultPasswordHash,
        role: "VICE_CHANCELLOR",
      },
    });

    // HOD CSBS
    const hodUser = await prisma.user.upsert({
      where: { email: "hod.csbs@labnexus.edu" },
      update: {
        name: "Dr. Sunita Sharma",
        role: "HOD",
        departmentId: deptCSBS.id,
      },
      create: {
        name: "Dr. Sunita Sharma",
        email: "hod.csbs@labnexus.edu",
        passwordHash: defaultPasswordHash,
        role: "HOD",
        departmentId: deptCSBS.id,
      },
    });

    // Faculty CSBS (Demo Faculty)
    const facultyUser = await prisma.user.upsert({
      where: { email: "demo.faculty@labnexus.test" },
      update: {
        name: "Prof. Vikram Malhotra",
        role: "FACULTY",
        departmentId: deptCSBS.id,
        passwordHash: facultyPasswordHash,
      },
      create: {
        name: "Prof. Vikram Malhotra",
        email: "demo.faculty@labnexus.test",
        passwordHash: facultyPasswordHash,
        role: "FACULTY",
        departmentId: deptCSBS.id,
      },
    });

    // Primary Demo Student
    const primaryStudent = await prisma.user.upsert({
      where: { email: "demo.student@labnexus.test" },
      update: {
        name: "Aarav Sharma",
        role: "STUDENT",
        rollNumber: "0901CB221001",
        departmentId: deptCSBS.id,
        passwordHash: studentPasswordHash,
      },
      create: {
        name: "Aarav Sharma",
        email: "demo.student@labnexus.test",
        passwordHash: studentPasswordHash,
        role: "STUDENT",
        rollNumber: "0901CB221001",
        departmentId: deptCSBS.id,
      },
    });

    console.log("Core users provisioned (VC, HOD, Faculty, Student)");

    // 3. Labs
    const dsaLab = await prisma.lab.upsert({
      where: { enrollmentKey: "DSALAB2026" },
      update: {
        title: "Data Structures & Algorithms Laboratory",
        code: "CSBS-202",
        description: "Practical implementations of linear & non-linear data structures, trees, graphs, and algorithmic complexity analysis.",
        language: "C",
        isPublished: true,
        departmentId: deptCSBS.id,
        createdById: facultyUser.id,
      },
      create: {
        title: "Data Structures & Algorithms Laboratory",
        code: "CSBS-202",
        description: "Practical implementations of linear & non-linear data structures, trees, graphs, and algorithmic complexity analysis.",
        language: "C",
        enrollmentKey: "DSALAB2026",
        isPublished: true,
        departmentId: deptCSBS.id,
        createdById: facultyUser.id,
      },
    });

    const pythonLab = await prisma.lab.upsert({
      where: { enrollmentKey: "PYLAB2026" },
      update: {
        title: "Advanced Python & Scientific Computing",
        code: "CSBS-301",
        description: "Object-oriented scripting, algorithmic design, data parsing, and automated evaluation.",
        language: "PYTHON",
        isPublished: true,
        departmentId: deptCSBS.id,
        createdById: facultyUser.id,
      },
      create: {
        title: "Advanced Python & Scientific Computing",
        code: "CSBS-301",
        description: "Object-oriented scripting, algorithmic design, data parsing, and automated evaluation.",
        language: "PYTHON",
        enrollmentKey: "PYLAB2026",
        isPublished: true,
        departmentId: deptCSBS.id,
        createdById: facultyUser.id,
      },
    });

    // 4. Enroll demo student into both labs
    await prisma.enrollment.upsert({
      where: {
        studentId_labId: {
          studentId: primaryStudent.id,
          labId: dsaLab.id,
        },
      },
      update: {},
      create: {
        studentId: primaryStudent.id,
        labId: dsaLab.id,
      },
    });

    await prisma.enrollment.upsert({
      where: {
        studentId_labId: {
          studentId: primaryStudent.id,
          labId: pythonLab.id,
        },
      },
      update: {},
      create: {
        studentId: primaryStudent.id,
        labId: pythonLab.id,
      },
    });

    // 5. Questions in DSA Lab
    const existingQ1 = await prisma.question.findFirst({
      where: { labId: dsaLab.id, title: "Array Element Search & Index" },
    });

    const dsaQ1 = existingQ1
      ? existingQ1
      : await prisma.question.create({
          data: {
            labId: dsaLab.id,
            title: "Array Element Search & Index",
            description: "Given an array of integers and a target value, find the 0-based index of the target in the array. If the element is not found, output `-1`.\n\n### Input Format\n- First line contains integer `N` (number of elements)\n- Second line contains `N` space-separated integers\n- Third line contains integer `target`\n\n### Output Format\n- Print the 0-based index or `-1`\n\n### Constraints\n- `1 <= N <= 1000`\n- `-10^5 <= arr[i] <= 10^5`",
            inputFormat: "N\\nN integers\\ntarget",
            outputFormat: "Index or -1",
            constraints: "1 <= N <= 1000",
            difficulty: "EASY",
            marks: 10,
            timeLimitMs: 2000,
            memoryLimitMb: 128,
            starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    int target;
    scanf("%d", &target);
    
    // Write your search logic here:
    
    return 0;
}`,
            orderIndex: 0,
            testCases: {
              create: [
                {
                  input: "5\n10 20 30 40 50\n30",
                  expectedOutput: "2",
                  isHidden: false,
                  explanation: "30 is located at index 2",
                  orderIndex: 0,
                },
                {
                  input: "4\n5 12 18 25\n99",
                  expectedOutput: "-1",
                  isHidden: false,
                  explanation: "99 is not in the array",
                  orderIndex: 1,
                },
                {
                  input: "6\n-5 0 8 15 22 35\n-5",
                  expectedOutput: "0",
                  isHidden: true,
                  explanation: "First element check",
                  orderIndex: 2,
                },
                {
                  input: "7\n1 3 5 7 9 11 13\n13",
                  expectedOutput: "6",
                  isHidden: true,
                  explanation: "Last element check",
                  orderIndex: 3,
                },
              ],
            },
          },
        });

    // Python Question
    const existingPyQ = await prisma.question.findFirst({
      where: { labId: pythonLab.id, title: "Palindromic Word Filter" },
    });

    const pyQ1 = existingPyQ
      ? existingPyQ
      : await prisma.question.create({
          data: {
            labId: pythonLab.id,
            title: "Palindromic Word Filter",
            description: "Read a sentence from standard input and print all case-insensitive palindromic words separated by a single space. If no palindromic words exist, print `NONE`.\n\n### Input Format\n- A single string sentence.\n\n### Output Format\n- Palindromic words separated by space, or `NONE`.\n\n### Example\n`racecar mom drove fast` -> `racecar mom`",
            inputFormat: "A single string sentence",
            outputFormat: "Palindromes separated by space or NONE",
            constraints: "Sentence length <= 1000 characters",
            difficulty: "EASY",
            marks: 10,
            timeLimitMs: 2000,
            memoryLimitMb: 128,
            starterCode: `import sys

def solve():
    line = sys.stdin.read().strip()
    if not line:
        print("NONE")
        return
    # Your logic here:

if __name__ == "__main__":
    solve()
`,
            orderIndex: 0,
            testCases: {
              create: [
                {
                  input: "racecar mom drove fast",
                  expectedOutput: "racecar mom",
                  isHidden: false,
                  explanation: "racecar and mom are palindromes",
                  orderIndex: 0,
                },
                {
                  input: "hello world python",
                  expectedOutput: "NONE",
                  isHidden: false,
                  explanation: "No palindromes present",
                  orderIndex: 1,
                },
                {
                  input: "Madam Arora went to noon radar",
                  expectedOutput: "Madam Arora noon radar",
                  isHidden: true,
                  explanation: "Case insensitivity check",
                  orderIndex: 2,
                },
              ],
            },
          },
        });

    // 6. Examination
    const now = new Date();
    const examStart = new Date(now.getTime() - 10 * 60 * 1000); // started 10 mins ago
    const examEnd = new Date(now.getTime() + 120 * 60 * 1000); // ends in 2 hours

    const existingExam = await prisma.examination.findFirst({
      where: { labId: dsaLab.id, title: "Mid-Term Programming Assessment" },
    });

    if (!existingExam) {
      const exam = await prisma.examination.create({
        data: {
          labId: dsaLab.id,
          title: "Mid-Term Programming Assessment",
          description: "Formal practical examination covering searching, algorithmic logic, and time complexity.",
          startTime: examStart,
          endTime: examEnd,
          durationMinutes: 60,
          totalMarks: 50,
          isPublished: true,
          disableCopyPaste: true,
          questions: {
            create: [
              {
                questionId: dsaQ1.id,
                orderIndex: 0,
              },
            ],
          },
        },
      });
      console.log("Mid-Term Examination created and published:", exam.title);
    }

    // 7. Audit Log
    await prisma.auditLog.create({
      data: {
        userId: vcUser.id,
        action: "SYSTEM_INITIALIZATION",
        entity: "INSTITUTION",
        details: "Academic portal initialized with departments CSBS, CSE, IT and base curriculum.",
        ipAddress: "127.0.0.1",
      },
    });

    console.log("Seeding complete successfully!");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Seeding error:", e);
  process.exit(1);
});
