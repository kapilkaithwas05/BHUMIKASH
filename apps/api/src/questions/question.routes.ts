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

/* GET /api/labs/:labId/questions */
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const labId = getParam(req.params.labId);
    const { userId, role } = req.user!;

    if (!labId) {
      return res.status(400).json({ message: "Lab ID is required" });
    }

    if (role === "STUDENT") {
      const lab = await prisma.lab.findUnique({ where: { id: labId }, select: { isPublished: true } });
      if (!lab?.isPublished) return res.status(403).json({ message: "This laboratory is not published" });
    }

    if (req.user!.role !== "STUDENT" && !await canManageLab(labId, req.user!)) {
      return res.status(403).json({ message: "You do not have permission to view questions in this laboratory" });
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

    const now = new Date();
    const publicationWindow = role === "STUDENT" ? {
      isPublished: true,
      AND: [
        { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
        { OR: [{ availableUntil: null }, { availableUntil: { gte: now } }] },
      ],
    } : {};

    const questions = await prisma.question.findMany({
      where: { labId, ...publicationWindow },
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
            isPublished: true,
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

    if (role !== "STUDENT" && !await canManageLab(question.labId, req.user!)) {
      return res.status(403).json({ message: "You do not have permission to view this question" });
    }

    // Verify student is enrolled
    if (role === "STUDENT") {
      if (!question.lab.isPublished) {
        return res.status(403).json({ message: "This laboratory is not published" });
      }
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
      const now = new Date();
      const isCurrentlyAvailable = question.isPublished &&
        (!question.availableFrom || now >= question.availableFrom) &&
        (!question.availableUntil || now <= question.availableUntil);
      // Let enrolled students reopen a question they already attempted after its window
      // closes. Submission routes continue to enforce the original availability window.
      const previousAttempt = !isCurrentlyAvailable
        ? await prisma.submission.findFirst({
            where: { questionId, studentId: userId },
            select: { id: true },
          })
        : null;
      if (!isCurrentlyAvailable && !previousAttempt) {
        return res.status(404).json({ message: "Question is not currently available" });
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
  "/sample-set",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);
      const lab = labId ? await findManageableLab(labId, req.user!) : null;
      if (!lab) return res.status(404).json({ message: "Lab not found or you lack permission to manage it" });

      const samples = [
        {
          title: "Add Two Integers",
          description: "Read two integers from standard input and print their sum.",
          inputFormat: "Two space-separated integers.",
          outputFormat: "Print their sum.",
          difficulty: "EASY",
          cases: [{ input: "5 7", output: "12", hidden: false }, { input: "-3 8", output: "5", hidden: true }],
        },
        {
          title: "Reverse a Word",
          description: "Read one word and print its characters in reverse order.",
          inputFormat: "A single word.",
          outputFormat: "The word reversed.",
          difficulty: "EASY",
          cases: [{ input: "labnexus", output: "suxenbal", hidden: false }, { input: "MITS", output: "STIM", hidden: true }],
        },
        {
          title: "Find the Largest Number",
          description: "Read an integer N followed by N integers. Print the largest value.",
          inputFormat: "N on the first line, followed by N space-separated integers.",
          outputFormat: "Print the largest integer.",
          difficulty: "MEDIUM",
          cases: [{ input: "5\n3 9 2 11 4", output: "11", hidden: false }, { input: "4\n-8 -2 -10 -5", output: "-2", hidden: true }],
        },
      ];
      const sampleTitles = samples.map(({ title }) => title);
      const existing = await prisma.question.findMany({
        where: { labId, title: { in: sampleTitles } },
        select: { title: true },
      });
      const existingTitles = new Set(existing.map(({ title }) => title));
      const missingSamples = samples.filter(({ title }) => !existingTitles.has(title));

      const created = await prisma.$transaction(async (tx) => {
        const orderIndexStart = await tx.question.count({ where: { labId } });
        return Promise.all(missingSamples.map((sample, index) => tx.question.create({
          data: {
            labId,
            contentType: "PRACTICE",
            isPublished: true,
            title: sample.title,
            description: sample.description,
            inputFormat: sample.inputFormat,
            outputFormat: sample.outputFormat,
            difficulty: sample.difficulty,
            marks: 10,
            orderIndex: orderIndexStart + index,
            testCases: {
              create: sample.cases.map((testCase, orderIndex) => ({
                input: testCase.input,
                expectedOutput: testCase.output,
                isHidden: testCase.hidden,
                orderIndex,
              })),
            },
          },
        })));
      });

      return res.status(201).json({
        message: missingSamples.length ? "Starter practice questions added" : "Starter practice questions are already present",
        createdCount: created.length,
        questions: created,
      });
    } catch (error) {
      console.error("Create sample questions error:", error);
      return res.status(500).json({ message: "Could not add starter practice questions" });
    }
  }
);

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
        attemptsAllowed,
        contentType,
        isPublished,
        availableFrom,
        availableUntil,
      } = req.body;

      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ message: "Question title is required" });
      }

      if (!description || typeof description !== "string") {
        return res.status(400).json({ message: "Problem description is required" });
      }

      // Check lab permission
      const lab = labId ? await findManageableLab(labId, req.user!) : null;

      if (!lab) {
        return res.status(404).json({ message: "Lab not found or you lack permission to manage it" });
      }

      const parsedAvailableFrom = availableFrom ? new Date(availableFrom) : null;
      const parsedAvailableUntil = availableUntil ? new Date(availableUntil) : null;
      if (contentType !== undefined && !["DAILY", "PRACTICE"].includes(contentType)) {
        return res.status(400).json({ message: "Question type must be DAILY or PRACTICE" });
      }
      if (isPublished !== undefined && typeof isPublished !== "boolean") {
        return res.status(400).json({ message: "isPublished must be a boolean" });
      }
      if ((parsedAvailableFrom && Number.isNaN(parsedAvailableFrom.getTime())) || (parsedAvailableUntil && Number.isNaN(parsedAvailableUntil.getTime()))) {
        return res.status(400).json({ message: "Question availability dates are invalid" });
      }
      if (parsedAvailableFrom && parsedAvailableUntil && parsedAvailableUntil <= parsedAvailableFrom) {
        return res.status(400).json({ message: "Availability end must be after its start" });
      }

      const count = await prisma.question.count({ where: { labId } });

      const newQuestion = await prisma.question.create({
        data: {
          labId,
          contentType: contentType || "PRACTICE",
          isPublished: isPublished === undefined ? true : isPublished,
          availableFrom: parsedAvailableFrom,
          availableUntil: parsedAvailableUntil,
          title: title.trim(),
          description: description.trim(),
          inputFormat: inputFormat?.trim() || null,
          outputFormat: outputFormat?.trim() || null,
          constraints: constraints?.trim() || null,
          difficulty: difficulty || "MEDIUM",
          marks: Number(marks) || 10,
          timeLimitMs: Number(timeLimitMs) || 2000,
          memoryLimitMb: Number(memoryLimitMb) || 128,
          attemptsAllowed: Number(attemptsAllowed) > 0 ? Number(attemptsAllowed) : null,
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
  authorizeRoles("FACULTY"),
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
        attemptsAllowed,
        contentType,
        isPublished,
        availableFrom,
        availableUntil,
      } = req.body;

      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { lab: true },
      });

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      if (!await canManageLab(question.labId, req.user!)) {
        return res.status(403).json({ message: "You do not have permission to modify this question" });
      }

      const parsedAvailableFrom = availableFrom === undefined ? undefined : availableFrom ? new Date(availableFrom) : null;
      const parsedAvailableUntil = availableUntil === undefined ? undefined : availableUntil ? new Date(availableUntil) : null;
      if (contentType !== undefined && !["DAILY", "PRACTICE"].includes(contentType)) return res.status(400).json({ message: "Question type must be DAILY or PRACTICE" });
      if (isPublished !== undefined && typeof isPublished !== "boolean") return res.status(400).json({ message: "isPublished must be a boolean" });
      if ((parsedAvailableFrom instanceof Date && Number.isNaN(parsedAvailableFrom.getTime())) || (parsedAvailableUntil instanceof Date && Number.isNaN(parsedAvailableUntil.getTime()))) return res.status(400).json({ message: "Question availability dates are invalid" });
      const effectiveFrom = parsedAvailableFrom === undefined ? question.availableFrom : parsedAvailableFrom;
      const effectiveUntil = parsedAvailableUntil === undefined ? question.availableUntil : parsedAvailableUntil;
      if (effectiveFrom && effectiveUntil && effectiveUntil <= effectiveFrom) return res.status(400).json({ message: "Availability end must be after its start" });

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
            attemptsAllowed:
              attemptsAllowed !== undefined
                ? Number(attemptsAllowed) > 0
                  ? Number(attemptsAllowed)
                  : null
                : undefined,
            starterCode: starterCode !== undefined ? starterCode : undefined,
            contentType: contentType !== undefined ? contentType : undefined,
            isPublished: isPublished !== undefined ? isPublished : undefined,
            availableFrom: parsedAvailableFrom,
            availableUntil: parsedAvailableUntil,
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
  authorizeRoles("FACULTY"),
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

      if (!await canManageLab(question.labId, req.user!)) {
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
