import { Router, Response } from "express";
import prisma from "../lib/prisma";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import { getParam } from "../lib/params";

const router = Router({ mergeParams: true });

/* GET /api/labs/:labId/questions */
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const labId = getParam(req.params.labId);
    const { userId, role } = req.user!;

    if (!labId) {
      return res.status(400).json({ message: "Lab ID is required" });
    }

    // Verify access
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

    const questions = await prisma.question.findMany({
      where: { labId },
      orderBy: { orderIndex: "asc" },
      include: {
        testCases: {
          where: role === "STUDENT" ? { isHidden: false } : undefined,
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            isHidden: true,
            explanation: true,
            orderIndex: true,
          },
        },
        _count: {
          select: { testCases: true },
        },
      },
    });

    return res.status(200).json({
      questions: questions.map((q) => ({
        ...q,
        totalTestCasesCount: q._count.testCases,
      })),
    });
  } catch (error) {
    console.error("Fetch questions error:", error);
    return res.status(500).json({ message: "Could not fetch lab questions" });
  }
});

/* GET /api/questions/:questionId */
router.get("/:questionId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const questionId = getParam(req.params.questionId);
    const { userId, role } = req.user!;

    if (!questionId) {
      return res.status(400).json({ message: "Question ID is required" });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        lab: {
          select: {
            id: true,
            title: true,
            language: true,
            createdById: true,
          },
        },
        testCases: {
          where: role === "STUDENT" ? { isHidden: false } : undefined,
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            isHidden: true,
            explanation: true,
            orderIndex: true,
          },
        },
        _count: {
          select: { testCases: true },
        },
      },
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Verify student is enrolled
    if (role === "STUDENT") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_labId: {
            studentId: userId,
            labId: question.labId,
          },
        },
      });

      if (!enrollment) {
        return res.status(403).json({ message: "You are not enrolled in this lab" });
      }
    }

    return res.status(200).json({
      question: {
        ...question,
        totalTestCasesCount: question._count.testCases,
      },
    });
  } catch (error) {
    console.error("Fetch question error:", error);
    return res.status(500).json({ message: "Could not fetch question" });
  }
});

/* POST /api/labs/:labId/questions */
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
        inputFormat,
        outputFormat,
        constraints,
        difficulty,
        marks,
        timeLimitMs,
        memoryLimitMb,
        starterCode,
        testCases,
      } = req.body;

      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ message: "Question title is required" });
      }

      if (!description || typeof description !== "string") {
        return res.status(400).json({ message: "Problem description is required" });
      }

      // Check lab permission
      const lab = await prisma.lab.findFirst({
        where: {
          id: labId,
          ...(role === "FACULTY" ? { createdById: userId } : {}),
        },
      });

      if (!lab) {
        return res.status(404).json({ message: "Lab not found or you lack permission to manage it" });
      }

      const count = await prisma.question.count({ where: { labId } });

      const newQuestion = await prisma.question.create({
        data: {
          labId,
          title: title.trim(),
          description: description.trim(),
          inputFormat: inputFormat?.trim() || null,
          outputFormat: outputFormat?.trim() || null,
          constraints: constraints?.trim() || null,
          difficulty: difficulty || "MEDIUM",
          marks: Number(marks) || 10,
          timeLimitMs: Number(timeLimitMs) || 2000,
          memoryLimitMb: Number(memoryLimitMb) || 128,
          starterCode: starterCode || null,
          orderIndex: count,
          testCases: Array.isArray(testCases) && testCases.length > 0
            ? {
                create: testCases.map((tc: any, index: number) => ({
                  input: typeof tc.input === "string" ? tc.input : "",
                  expectedOutput: typeof tc.expectedOutput === "string" ? tc.expectedOutput : "",
                  isHidden: Boolean(tc.isHidden),
                  explanation: tc.explanation || null,
                  orderIndex: index,
                })),
              }
            : undefined,
        },
        include: {
          testCases: true,
        },
      });

      return res.status(201).json({
        message: "Question created successfully",
        question: newQuestion,
      });
    } catch (error) {
      console.error("Create question error:", error);
      return res.status(500).json({ message: "Could not create question" });
    }
  }
);

/* PUT /api/questions/:questionId */
router.put(
  "/:questionId",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const questionId = getParam(req.params.questionId);
      const { userId, role } = req.user!;
      const {
        title,
        description,
        inputFormat,
        outputFormat,
        constraints,
        difficulty,
        marks,
        timeLimitMs,
        memoryLimitMb,
        starterCode,
        testCases,
      } = req.body;

      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { lab: true },
      });

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      if (role === "FACULTY" && question.lab.createdById !== userId) {
        return res.status(403).json({ message: "You do not have permission to modify this question" });
      }

      // Update question and optionally replace test cases
      const updated = await prisma.$transaction(async (tx) => {
        if (Array.isArray(testCases)) {
          await tx.testCase.deleteMany({ where: { questionId } });
          await tx.testCase.createMany({
            data: testCases.map((tc: any, idx: number) => ({
              questionId,
              input: tc.input || "",
              expectedOutput: tc.expectedOutput || "",
              isHidden: Boolean(tc.isHidden),
              explanation: tc.explanation || null,
              orderIndex: idx,
            })),
          });
        }

        return tx.question.update({
          where: { id: questionId },
          data: {
            title: title !== undefined ? title.trim() : undefined,
            description: description !== undefined ? description.trim() : undefined,
            inputFormat: inputFormat !== undefined ? inputFormat?.trim() : undefined,
            outputFormat: outputFormat !== undefined ? outputFormat?.trim() : undefined,
            constraints: constraints !== undefined ? constraints?.trim() : undefined,
            difficulty: difficulty !== undefined ? difficulty : undefined,
            marks: marks !== undefined ? Number(marks) : undefined,
            timeLimitMs: timeLimitMs !== undefined ? Number(timeLimitMs) : undefined,
            memoryLimitMb: memoryLimitMb !== undefined ? Number(memoryLimitMb) : undefined,
            starterCode: starterCode !== undefined ? starterCode : undefined,
          },
          include: { testCases: true },
        });
      });

      return res.status(200).json({
        message: "Question updated successfully",
        question: updated,
      });
    } catch (error) {
      console.error("Update question error:", error);
      return res.status(500).json({ message: "Could not update question" });
    }
  }
);

/* DELETE /api/questions/:questionId */
router.delete(
  "/:questionId",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const questionId = getParam(req.params.questionId);
      const { userId, role } = req.user!;

      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { lab: true },
      });

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      if (role === "FACULTY" && question.lab.createdById !== userId) {
        return res.status(403).json({ message: "You do not have permission to delete this question" });
      }

      await prisma.question.delete({ where: { id: questionId } });

      return res.status(200).json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Delete question error:", error);
      return res.status(500).json({ message: "Could not delete question" });
    }
  }
);

export default router;
