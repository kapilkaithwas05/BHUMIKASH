import { Router, Response } from "express";
import prisma from "../lib/prisma";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import { getParam } from "../lib/params";

const router = Router({ mergeParams: true });

/* GET /api/labs/:labId/examinations */
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const labId = getParam(req.params.labId);
    const { userId, role } = req.user!;

    if (role === "STUDENT") {
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

    const examinations = await prisma.examination.findMany({
      where: {
        labId: labId || undefined,
        ...(role === "STUDENT" ? { isPublished: true } : {}),
      },
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

    if (role === "STUDENT") {
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
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
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

      const lab = await prisma.lab.findFirst({
        where: {
          id: labId,
          ...(role === "FACULTY" ? { createdById: userId } : {}),
        },
      });

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
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const examinationId = getParam(req.params.examinationId);
      const { isPublished } = req.body;

      if (!examinationId) {
        return res.status(400).json({ message: "Examination ID is required" });
      }

      const exam = await prisma.examination.update({
        where: { id: examinationId },
        data: {
          isPublished: typeof isPublished === "boolean" ? isPublished : true,
        },
      });

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
        studentData.status = "SUBMITTED";
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
