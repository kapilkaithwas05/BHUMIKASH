import { Router, Response } from "express";
import prisma from "../lib/prisma";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import { getParam } from "../lib/params";
import { canManageLab, findManageableLab } from "../lib/access";

const router = Router({ mergeParams: true });

/**
 * Notifies every student enrolled in a lab that an assessment has been scheduled.
 * Draft (unpublished) assessments are intentionally never announced.
 */
async function notifyEnrolledStudents(
  labId: string,
  labTitle: string,
  examination: { title: string; startTime: Date; endTime: Date }
) {
  const enrollments = await prisma.enrollment.findMany({
    where: { labId },
    select: { studentId: true },
  });

  if (enrollments.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: enrollments.map((enrollment) => ({
      userId: enrollment.studentId,
      title: "New assessment scheduled",
      message: `"${examination.title}" has been scheduled in ${labTitle}, running from ${examination.startTime.toISOString()} to ${examination.endTime.toISOString()}.`,
      type: "EXAMINATION",
    })),
  });
}

/* GET /api/labs/:labId/examinations */
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const labId = getParam(req.params.labId);
    const { userId, role } = req.user!;

    if (role !== "STUDENT" && labId && !await canManageLab(labId, req.user!)) {
      return res.status(403).json({ message: "You do not have permission to view assessments in this laboratory" });
    }

    if (role === "STUDENT" && labId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_labId: {
            studentId: userId,
            labId,
          },
        },
      });

      if (!enrollment) {
        return res.status(403).json({ message: "You are not enrolled in this lab" });
      }
    }

    const where: any = { labId: labId || undefined };
    if (role === "STUDENT") {
      where.isPublished = true;
      where.lab = {
        isPublished: true,
        enrollments: { some: { studentId: userId } },
      };
    } else if (!labId && role === "FACULTY") {
      where.lab = { createdById: userId };
    } else if (!labId && role === "HOD") {
      const hod = await prisma.user.findUnique({ where: { id: userId }, select: { departmentId: true } });
      where.lab = hod?.departmentId
        ? { OR: [{ departmentId: hod.departmentId }, { createdBy: { departmentId: hod.departmentId } }] }
        : { createdById: userId };
    }

    const examinations = await prisma.examination.findMany({
      where,
      orderBy: { startTime: "desc" },
      include: {
        questions: {
          include: {
            question: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                marks: true,
              },
            },
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    return res.status(200).json({
      examinations,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Fetch examinations error:", error);
    return res.status(500).json({ message: "Could not fetch examinations" });
  }
});

/* GET /api/examinations/:examinationId */
router.get("/:examinationId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const examinationId = getParam(req.params.examinationId);
    const { userId, role } = req.user!;

    if (!examinationId) {
      return res.status(400).json({ message: "Examination ID is required" });
    }

    const examination = await prisma.examination.findUnique({
      where: { id: examinationId },
      include: {
        lab: {
          select: {
            id: true,
            title: true,
            language: true,
            createdById: true,
            isPublished: true,
          },
        },
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            question: {
              include: {
                testCases: {
                  where: role === "STUDENT" ? { isHidden: false } : undefined,
                  select: {
                    id: true,
                    input: true,
                    expectedOutput: true,
                    isHidden: true,
                    explanation: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!examination) {
      return res.status(404).json({ message: "Examination not found" });
    }

    if (role !== "STUDENT" && !await canManageLab(examination.labId, req.user!)) {
      return res.status(403).json({ message: "You do not have permission to view this assessment" });
    }

    if (role === "STUDENT") {
      if (!examination.lab.isPublished) {
        return res.status(403).json({ message: "This laboratory is not published" });
      }
      if (!examination.isPublished) {
        return res.status(403).json({ message: "This examination is not published yet" });
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_labId: {
            studentId: userId,
            labId: examination.labId,
          },
        },
      });

      if (!enrollment) {
        return res.status(403).json({ message: "You are not enrolled in this lab" });
      }
    }

    return res.status(200).json({
      examination,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Fetch examination details error:", error);
    return res.status(500).json({ message: "Could not fetch examination details" });
  }
});

/* POST /api/labs/:labId/examinations */
router.post(
  "/",
  authenticateToken,
  authorizeRoles("FACULTY"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);
      const { userId, role } = req.user!;
      const {
        title,
        description,
        startTime,
        endTime,
        durationMinutes,
        totalMarks,
        disableCopyPaste,
        isPublished,
        questionIds,
      } = req.body;

      if (!labId) {
        return res.status(400).json({ message: "Lab ID is required" });
      }

      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ message: "Examination title is required" });
      }

      if (!startTime || !endTime) {
        return res.status(400).json({ message: "Start time and end time are required" });
      }

      const parsedStart = new Date(startTime);
      const parsedEnd = new Date(endTime);

      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
        return res.status(400).json({ message: "Invalid date format for start or end time" });
      }

      if (parsedEnd <= parsedStart) {
        return res.status(400).json({ message: "End time must be after start time" });
      }

      const lab = await findManageableLab(labId, req.user!);

      if (!lab) {
        return res.status(404).json({ message: "Lab not found or you lack permission to manage it" });
      }

      const examination = await prisma.examination.create({
        data: {
          labId,
          title: title.trim(),
          description: description?.trim() || null,
          startTime: parsedStart,
          endTime: parsedEnd,
          durationMinutes: Number(durationMinutes) || 60,
          totalMarks: Number(totalMarks) || 100,
          disableCopyPaste: Boolean(disableCopyPaste),
          isPublished: Boolean(isPublished),
          questions: Array.isArray(questionIds) && questionIds.length > 0
            ? {
                create: questionIds.map((qId: string, index: number) => ({
                  questionId: qId,
                  orderIndex: index,
                })),
              }
            : undefined,
        },
        include: {
          questions: {
            include: { question: true },
          },
        },
      });

      if (examination.isPublished) {
        try {
          await notifyEnrolledStudents(labId, lab.title, examination);
        } catch (notifyError) {
          console.error("Examination notification failed:", notifyError);
        }
      }

      return res.status(201).json({
        message: "Examination created successfully",
        examination,
      });
    } catch (error) {
      console.error("Create examination error:", error);
      return res.status(500).json({ message: "Could not create examination" });
    }
  }
);

/* PUT /api/examinations/:examinationId/publish */
router.put(
  "/:examinationId/publish",
  authenticateToken,
  authorizeRoles("FACULTY"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const examinationId = getParam(req.params.examinationId);
      const { isPublished } = req.body;

      if (!examinationId) {
        return res.status(400).json({ message: "Examination ID is required" });
      }

      const existing = await prisma.examination.findUnique({
        where: { id: examinationId },
      });

      if (!existing) {
        return res.status(404).json({ message: "Examination not found" });
      }

      if (!await canManageLab(existing.labId, req.user!)) {
        return res.status(403).json({ message: "You do not have permission to manage this assessment" });
      }

      const exam = await prisma.examination.update({
        where: { id: examinationId },
        data: {
          isPublished: typeof isPublished === "boolean" ? isPublished : true,
        },
      });

      // Announce the assessment the moment it first becomes visible to students.
      if (exam.isPublished && !existing.isPublished) {
        try {
          const lab = await prisma.lab.findUnique({
            where: { id: exam.labId },
            select: { title: true },
          });

          await notifyEnrolledStudents(exam.labId, lab?.title ?? "your lab", exam);
        } catch (notifyError) {
          console.error("Examination notification failed:", notifyError);
        }
      }

      return res.status(200).json({
        message: `Examination ${exam.isPublished ? "published" : "unpublished"} successfully`,
        examination: exam,
      });
    } catch (error) {
      console.error("Publish examination error:", error);
      return res.status(500).json({ message: "Could not update examination publish state" });
    }
  }
);

/* GET /api/examinations/:examinationId/results */
router.get(
  "/:examinationId/results",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const examinationId = getParam(req.params.examinationId);

      if (!examinationId) {
        return res.status(400).json({ message: "Examination ID is required" });
      }

      const exam = await prisma.examination.findUnique({
        where: { id: examinationId },
        include: {
          lab: {
            include: {
              enrollments: {
                include: {
                  student: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      rollNumber: true,
                    },
                  },
                },
              },
            },
          },
          submissions: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  rollNumber: true,
                },
              },
              question: {
                select: {
                  id: true,
                  title: true,
                  marks: true,
                },
              },
            },
          },
        },
      });

      if (!exam) {
        return res.status(404).json({ message: "Examination not found" });
      }

      if (!await canManageLab(exam.labId, req.user!)) {
        return res.status(403).json({ message: "You do not have permission to review this assessment" });
      }

      // Group submissions by student
      const studentMap = new Map<string, any>();
      for (const enrollment of exam.lab.enrollments) {
        studentMap.set(enrollment.student.id, {
          student: enrollment.student,
          totalScore: 0,
          submissions: [],
          status: "NOT_ATTEMPTED",
        });
      }

      for (const sub of exam.submissions) {
        const studentData = studentMap.get(sub.studentId) || {
          student: sub.student,
          totalScore: 0,
          submissions: [],
          status: "SUBMITTED",
        };

        studentData.submissions.push({
          id: sub.id,
          questionId: sub.questionId,
          questionTitle: sub.question.title,
          status: sub.status,
          score: sub.score,
          submittedAt: sub.submittedAt,
        });

        studentData.totalScore += sub.score;
        studentData.status = sub.status === "PENDING" && studentData.status !== "SUBMITTED"
          ? "PENDING"
          : "SUBMITTED";
        studentMap.set(sub.studentId, studentData);
      }

      return res.status(200).json({
        examination: {
          id: exam.id,
          title: exam.title,
          totalMarks: exam.totalMarks,
          startTime: exam.startTime,
          endTime: exam.endTime,
        },
        results: Array.from(studentMap.values()),
      });
    } catch (error) {
      console.error("Fetch exam results error:", error);
      return res.status(500).json({ message: "Could not fetch examination results" });
    }
  }
);

export default router;
