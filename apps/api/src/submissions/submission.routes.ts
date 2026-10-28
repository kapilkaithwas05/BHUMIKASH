import { Router, Response } from "express";
import prisma from "../lib/prisma";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { getParam } from "../lib/params";
import { findManageableLab } from "../lib/access";

const router = Router({ mergeParams: true });

/* GET /api/submissions - role-scoped recent formal submissions */
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, role } = req.user!;
    let labIds: string[] | undefined;

    if (role === "FACULTY") {
      const labs = await prisma.lab.findMany({
        where: { OR: [
          { createdById: userId },
          { facultyAssignments: { some: { faculty: { userId } } } },
        ] },
        select: { id: true },
      });
      labIds = labs.map(({ id }) => id);
    } else if (role === "HOD") {
      const hod = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true, facultyProfile: { select: { departmentId: true } } },
      });
      const departmentId = hod?.facultyProfile?.departmentId ?? hod?.departmentId;
      const labs = await prisma.lab.findMany({
        where: departmentId ? { OR: [
          { departmentId },
          { createdBy: { departmentId } },
          { createdBy: { facultyProfile: { departmentId } } },
        ] } : { createdById: userId },
        select: { id: true },
      });
      labIds = labs.map(({ id }) => id);
    } else if (role !== "STUDENT") {
      return res.status(403).json({ message: "You are not allowed to view submissions" });
    }

    const submissions = await prisma.submission.findMany({
      // Student history is always constrained to the authenticated student. Faculty
      // history is constrained to labs they are allowed to manage.
      where: role === "STUDENT"
        ? { studentId: userId }
        : labIds
          ? { labId: { in: labIds } }
          : {},
      orderBy: { submittedAt: "desc" },
      take: 50,
      include: {
        student: { select: { id: true, name: true, email: true, rollNumber: true } },
        lab: { select: { id: true, title: true, code: true } },
        question: { select: { id: true, title: true, marks: true } },
      },
    });
    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("Fetch recent submissions error:", error);
    return res.status(500).json({ message: "Could not fetch submissions" });
  }
});

/* POST /api/questions/:questionId/run */
router.post("/:questionId/run", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  return res.status(503).json({
    message: "Code execution is unavailable until an isolated execution service is configured.",
    code: "EXECUTION_SANDBOX_UNAVAILABLE",
  });
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

    if (role !== "STUDENT") {
      return res.status(403).json({ message: "Only students can submit solutions" });
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

    if (!question.lab.isPublished) {
      return res.status(403).json({ message: "This laboratory is not published" });
    }
    const questionNow = new Date();
    if (!question.isPublished || (question.availableFrom && questionNow < question.availableFrom) || (question.availableUntil && questionNow > question.availableUntil)) {
      return res.status(403).json({ message: "This question is not currently available" });
    }
    }

    // Attempt limit enforcement
    if (role === "STUDENT" && question.attemptsAllowed !== null) {
      const attemptsUsed = await prisma.submission.count({
        where: { studentId: userId, questionId: question.id },
      });

      if (attemptsUsed >= question.attemptsAllowed) {
        return res.status(403).json({
          message: `Attempt limit reached. You have used all ${question.attemptsAllowed} allowed attempt(s) for this question.`,
        });
      }
    }

    // Examination rules verification.
    // A question can belong to one or more published assessments, and those windows must be
    // enforced even when the client omits examinationId. Otherwise a closed assessment could
    // be bypassed by submitting the question as ordinary lab practice, and a submission made
    // during an open assessment would be silently left unlinked from it.
    const now = new Date();
    const EXAM_END_BUFFER_MS = 30 * 1000;

    const getWindowError = (examination: { startTime: Date; endTime: Date }) => {
      if (now < examination.startTime) {
        return "Examination has not started yet";
      }

      // Add a 30-second network buffer to endTime
      if (now > new Date(examination.endTime.getTime() + EXAM_END_BUFFER_MS)) {
        return "Assessment deadline has passed. Submissions are no longer accepted.";
      }

      return null;
    };

    let effectiveExaminationId: string | null =
      typeof examinationId === "string" ? examinationId : null;

    if (effectiveExaminationId) {
      const examination = await prisma.examination.findUnique({
        where: { id: effectiveExaminationId },
      });

      if (!examination) {
        return res.status(404).json({ message: "Examination not found" });
      }

      if (examination.labId !== question.labId) {
        return res.status(400).json({ message: "The question does not belong to this assessment's lab" });
      }

      const includedQuestion = await prisma.examinationQuestion.findFirst({
        where: { examinationId: effectiveExaminationId, questionId },
        select: { questionId: true },
      });
      if (!includedQuestion) {
        return res.status(400).json({ message: "This question is not part of the selected assessment" });
      }

      if (!examination.isPublished) {
        return res.status(403).json({ message: "Examination is not published" });
      }

      const windowError = getWindowError(examination);
      if (windowError) {
        return res.status(403).json({ message: windowError });
      }
    } else if (role === "STUDENT") {
      const publishedAssessments = await prisma.examinationQuestion.findMany({
        where: { questionId, examination: { isPublished: true } },
        include: { examination: true },
      });

      if (publishedAssessments.length > 0) {
        const openAssessment = publishedAssessments.find(
          ({ examination }) => getWindowError(examination) === null
        );

        if (!openAssessment) {
          return res.status(403).json({
            message:
              "This question belongs to an assessment that is not currently open. Submissions are only accepted during the assessment window.",
          });
        }

        effectiveExaminationId = openAssessment.examinationId;
      }
    }

    const language = (reqLang || question.lab.language) as "C" | "CPP" | "JAVA" | "PYTHON";
    if (!["C", "CPP", "JAVA", "PYTHON"].includes(language)) {
      return res.status(400).json({ message: "Unsupported programming language" });
    }

    // Preserve the student's work while evaluation remains unavailable. Never run untrusted
    // submissions in the API process or on the host without an isolated execution service.
    const submission = await prisma.submission.create({
      data: {
        studentId: userId,
        labId: question.labId,
        questionId: question.id,
        examinationId: effectiveExaminationId,
        language,
        sourceCode,
        status: "PENDING",
        score: 0,
        totalTests: question.testCases.length,
        passedTests: 0,
      },
    });

    try {
      const submitter = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const assignedFaculty = await prisma.labFacultyAssignment.findMany({
        where: { labId: question.labId },
        select: { faculty: { select: { userId: true } } },
      });
      const facultyRecipients = [...new Set([
        question.lab.createdById,
        ...assignedFaculty.map(({ faculty }) => faculty.userId),
      ])];
      const notifications = [
        {
          userId,
          title: "Submission received",
          message: `"${question.title}" was submitted and is awaiting evaluation.`,
          type: "SUBMISSION",
        },
        ...facultyRecipients.map((facultyUserId) => ({
          userId: facultyUserId,
          title: "New code submission",
          message: `${submitter?.name || "A student"} submitted "${question.title}" in ${question.lab.title}. Evaluation is pending.`,
          type: "SUBMISSION",
        })),
      ];
      await prisma.notification.createMany({ data: notifications });
    } catch (notifyError) {
      console.error("Submission notification failed:", notifyError);
    }

    return res.status(201).json({
      message: "Submission saved and is awaiting evaluation",
      submission,
    });
  } catch (error: any) {
    console.error("Submission save error:", error);
    return res.status(500).json({ message: "Could not save submission" });
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

    if (!["STUDENT", "FACULTY", "HOD"].includes(role)) {
      return res.status(403).json({ message: "You are not allowed to view submissions" });
    }

    if (role === "STUDENT") {
      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_labId: { studentId: userId, labId: question.labId } },
      });
      if (!question.lab.isPublished || !enrollment) {
        return res.status(403).json({ message: "You do not have access to this laboratory" });
      }
    }

    if (role === "FACULTY" && !await findManageableLab(question.labId, req.user!)) {
      return res.status(403).json({ message: "You may only review submissions for your own labs" });
    }
    if (role === "HOD") {
      const hod = await prisma.user.findUnique({ where: { id: userId }, select: { departmentId: true, facultyProfile: { select: { departmentId: true } } } });
      const departmentId = hod?.facultyProfile?.departmentId ?? hod?.departmentId;
      const lab = await prisma.lab.findUnique({
        where: { id: question.labId },
        select: { departmentId: true, createdBy: { select: { departmentId: true, facultyProfile: { select: { departmentId: true } } } } },
      });
      const hasDepartmentAccess = Boolean(departmentId && lab && (
        lab.departmentId === departmentId || lab.createdBy.departmentId === departmentId || lab.createdBy.facultyProfile?.departmentId === departmentId
      ));
      if (!hasDepartmentAccess) {
        return res.status(403).json({ message: "You may only review submissions in your department" });
      }
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
