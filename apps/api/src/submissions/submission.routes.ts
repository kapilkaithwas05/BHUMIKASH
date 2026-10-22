import { Router, Response } from "express";
import prisma from "../lib/prisma";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { ExecutionService, SupportedLanguage } from "../services/execution.service";
import { EvaluationService } from "../services/evaluation.service";
import { getParam } from "../lib/params";

const router = Router({ mergeParams: true });

/* POST /api/questions/:questionId/run */
router.post("/:questionId/run", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const questionId = getParam(req.params.questionId);
    const { sourceCode, language: reqLang, customInput } = req.body;

    if (!questionId) {
      return res.status(400).json({ message: "Question ID is required" });
    }

    if (!sourceCode || typeof sourceCode !== "string") {
      return res.status(400).json({ message: "Source code is required" });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        lab: true,
        testCases: {
          where: { isHidden: false },
          take: 1,
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const language: SupportedLanguage = (reqLang || question.lab.language) as SupportedLanguage;
    const stdin = typeof customInput === "string"
      ? customInput
      : question.testCases[0]?.input || "";

    const result = await ExecutionService.execute({
      language,
      sourceCode,
      stdin,
      timeLimitMs: question.timeLimitMs || 2000,
      memoryLimitMb: question.memoryLimitMb || 128,
    });

    return res.status(200).json({
      language,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      executionTimeMs: result.executionTimeMs,
      usedInput: stdin,
    });
  } catch (error: any) {
    console.error("Code run error:", error);
    return res.status(500).json({ message: "Could not execute code: " + error.message });
  }
});

/* POST /api/questions/:questionId/submit */
router.post("/:questionId/submit", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const questionId = getParam(req.params.questionId);
    const { userId, role } = req.user!;
    const { sourceCode, language: reqLang, examinationId } = req.body;

    if (!questionId) {
      return res.status(400).json({ message: "Question ID is required" });
    }

    if (!sourceCode || typeof sourceCode !== "string") {
      return res.status(400).json({ message: "Source code is required" });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        lab: true,
        testCases: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Verify enrollment
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

    // Examination rules verification
    if (examinationId && typeof examinationId === "string") {
      const examination = await prisma.examination.findUnique({
        where: { id: examinationId },
      });

      if (!examination) {
        return res.status(404).json({ message: "Examination not found" });
      }

      if (!examination.isPublished) {
        return res.status(403).json({ message: "Examination is not published" });
      }

      const now = new Date();
      if (now < examination.startTime) {
        return res.status(403).json({ message: "Examination has not started yet" });
      }

      // Add a 30-second network buffer to endTime
      const maxEndTime = new Date(examination.endTime.getTime() + 30 * 1000);
      if (now > maxEndTime) {
        return res.status(403).json({
          message: "Assessment deadline has passed. Submissions are no longer accepted.",
        });
      }
    }

    const language: SupportedLanguage = (reqLang || question.lab.language) as SupportedLanguage;

    // Run evaluation against all test cases
    const evaluation = await EvaluationService.evaluate(
      language,
      sourceCode,
      question.testCases,
      {
        timeLimitMs: question.timeLimitMs || 2000,
        memoryLimitMb: question.memoryLimitMb || 128,
        maxMarks: question.marks || 10,
        maskHiddenTests: role === "STUDENT",
      }
    );

    // Save submission to database
    const submission = await prisma.submission.create({
      data: {
        studentId: userId,
        labId: question.labId,
        questionId: question.id,
        examinationId: examinationId || null,
        language: language as any,
        sourceCode,
        status: evaluation.status as any,
        compileOutput: evaluation.compileOutput || null,
        score: evaluation.score,
        totalTests: evaluation.totalTests,
        passedTests: evaluation.passedTests,
        executionTimeMs: evaluation.executionTimeMs,
        testResults: {
          create: evaluation.testResults.map((tr) => ({
            testCaseId: tr.testCaseId,
            passed: tr.passed,
            status: tr.status as any,
            actualOutput: tr.actualOutput || null,
            executionTimeMs: tr.executionTimeMs,
          })),
        },
      },
      include: {
        testResults: {
          include: {
            testCase: {
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
    });

    // Mask hidden test cases from student response
    const sanitizedTestResults = submission.testResults.map((tr) => {
      if (role === "STUDENT" && tr.testCase.isHidden) {
        return {
          id: tr.id,
          passed: tr.passed,
          status: tr.status,
          executionTimeMs: tr.executionTimeMs,
          testCase: {
            id: tr.testCase.id,
            isHidden: true,
            explanation: tr.testCase.explanation,
          },
        };
      }
      return tr;
    });

    return res.status(201).json({
      message: "Submission evaluated successfully",
      submission: {
        ...submission,
        testResults: sanitizedTestResults,
      },
    });
  } catch (error: any) {
    console.error("Submission evaluation error:", error);
    return res.status(500).json({ message: "Could not evaluate submission: " + error.message });
  }
});

/* GET /api/questions/:questionId/submissions */
router.get("/:questionId/submissions", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const questionId = getParam(req.params.questionId);
    const { userId, role } = req.user!;

    if (!questionId) {
      return res.status(400).json({ message: "Question ID is required" });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { lab: true },
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        questionId,
        ...(role === "STUDENT" ? { studentId: userId } : {}),
      },
      orderBy: { submittedAt: "desc" },
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
    });

    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("Fetch submissions error:", error);
    return res.status(500).json({ message: "Could not fetch submissions" });
  }
});

export default router;
