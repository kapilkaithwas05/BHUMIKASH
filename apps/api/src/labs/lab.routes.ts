
import { uploadStudentList } from "../middleware/upload.middleware";
import { parseStudentList } from "./student-list.parser";
import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

// POST /api/labs
router.post(
  "/",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, description, language } = req.body;

      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          message: "Lab title is required",
        });
      }

      const allowedLanguages = ["C", "CPP", "JAVA", "PYTHON"];

      if (
        typeof language !== "string" ||
        !allowedLanguages.includes(language)
      ) {
        return res.status(400).json({
          message: "Language must be C, CPP, JAVA, or PYTHON",
        });
      }

      if (
        description !== undefined &&
        description !== null &&
        typeof description !== "string"
      ) {
        return res.status(400).json({
          message: "Description must be a string",
        });
      }

      const lab = await prisma.lab.create({
        data: {
          title: title.trim(),
          description:
            typeof description === "string" && description.trim()
              ? description.trim()
              : null,
          language: language as "C" | "CPP" | "JAVA" | "PYTHON",
          createdById: req.user!.userId,
        },
      });

      return res.status(201).json({
        message: "Lab created successfully",
        lab,
      });
    } catch (error) {
      console.error("Lab creation error:", error);
      return res.status(500).json({
        message: "Could not create lab",
      });
    }
  }
);


/* GET /api/labs */
router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, role } = req.user!;

      if (role === "FACULTY" || role === "HOD") {
        const labs = await prisma.lab.findMany({
          where: {
            createdById: userId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return res.status(200).json({ labs });
      }

      if (role === "STUDENT") {
        const labs = await prisma.lab.findMany({
          where: {
            enrollments: {
              some: {
                studentId: userId,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return res.status(200).json({ labs });
      }

      return res.status(403).json({
        message: "You are not allowed to view labs",
      });
    } catch (error) {
      console.error("Fetch labs error:", error);

      return res.status(500).json({
        message: "Could not fetch labs",
      });
    }
  }
);


/* POST /api/labs/:labId/enroll */
router.post(
  "/:labId/enroll",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = req.params.labId;

      if (typeof labId !== "string" || !labId.trim()) {
        return res.status(400).json({
            message: "Invalid lab ID",
            });
        }
      const { email } = req.body;

      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          message: "Student email is required",
        });
      }

      // Confirm that the lab exists and belongs to this faculty member.
      const lab = await prisma.lab.findFirst({
        where: {
          id: labId,
          createdById: req.user!.userId,
        },
      });

      if (!lab) {
        return res.status(404).json({
          message: "Lab not found or you do not have permission to manage it",
        });
      }

      // Find the student using their registered email.
      const student = await prisma.user.findUnique({
        where: {
          email: email.trim().toLowerCase(),
        },
      });

      if (!student || student.role !== "STUDENT") {
        return res.status(404).json({
          message: "Student not found",
        });
      }

      // Prevent duplicate enrollment.
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_labId: {
            studentId: student.id,
            labId: lab.id,
          },
        },
      });

      if (existingEnrollment) {
        return res.status(409).json({
          message: "Student is already enrolled in this lab",
        });
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          labId: lab.id,
        },
        select: {
          id: true,
          studentId: true,
          labId: true,
          enrolledAt: true,
        },
      });

      return res.status(201).json({
        message: "Student enrolled successfully",
        enrollment,
      });
    } catch (error) {
      console.error("Student enrollment error:", error);

      return res.status(500).json({
        message: "Could not enroll student",
      });
    }
  }
);


/* GET /api/labs/:labId/students */
router.get(
  "/:labId/students",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = req.params.labId;

      if (typeof labId !== "string" || !labId.trim()) {
        return res.status(400).json({
          message: "Invalid lab ID",
        });
      }

      // Only the faculty member who created the lab can view its students.
      const lab = await prisma.lab.findFirst({
        where: {
          id: labId,
          createdById: req.user!.userId,
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!lab) {
        return res.status(404).json({
          message: "Lab not found or you do not have permission to manage it",
        });
      }

      const enrollments = await prisma.enrollment.findMany({
        where: {
          labId: lab.id,
        },
        orderBy: {
          enrolledAt: "desc",
        },
        select: {
          id: true,
          enrolledAt: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return res.status(200).json({
        lab,
        totalStudents: enrollments.length,
        students: enrollments.map((enrollment) => ({
          enrollmentId: enrollment.id,
          enrolledAt: enrollment.enrolledAt,
          ...enrollment.student,
        })),
      });
    } catch (error) {
      console.error("Fetch enrolled students error:", error);

      return res.status(500).json({
        message: "Could not fetch enrolled students",
      });
    }
  }
);


/* DELETE /api/labs/:labId/students/:studentId */
router.delete(
  "/:labId/students/:studentId",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { labId, studentId } = req.params;

      if (
        typeof labId !== "string" ||
        !labId.trim() ||
        typeof studentId !== "string" ||
        !studentId.trim()
      ) {
        return res.status(400).json({
          message: "Invalid lab ID or student ID",
        });
      }

      // Verify that this faculty member owns the lab.
      const lab = await prisma.lab.findFirst({
        where: {
          id: labId,
          createdById: req.user!.userId,
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!lab) {
        return res.status(404).json({
          message: "Lab not found or you do not have permission to manage it",
        });
      }

      // Find the student's enrollment in this lab.
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_labId: {
            studentId,
            labId: lab.id,
          },
        },
      });

      if (!enrollment) {
        return res.status(404).json({
          message: "Student is not enrolled in this lab",
        });
      }

      await prisma.enrollment.delete({
        where: {
          studentId_labId: {
            studentId,
            labId: lab.id,
          },
        },
      });

      return res.status(200).json({
        message: "Student removed from lab successfully",
        labId: lab.id,
        studentId,
      });
    } catch (error) {
      console.error("Remove student error:", error);

      return res.status(500).json({
        message: "Could not remove student from lab",
      });
    }
  }
);


/* POST /api/labs/:labId/enroll/bulk */
router.post(
  "/:labId/enroll/bulk",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD"),
  uploadStudentList.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = req.params.labId;

      if (typeof labId !== "string" || !labId.trim()) {
        return res.status(400).json({
          message: "Invalid lab ID",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: 'Upload a CSV or XLSX file using the field name "file"',
        });
      }

      // Verify that this faculty member owns the lab.
      const lab = await prisma.lab.findFirst({
        where: {
          id: labId,
          createdById: req.user!.userId,
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!lab) {
        return res.status(404).json({
          message: "Lab not found or you do not have permission to manage it",
        });
      }

      const parsed = await parseStudentList(
        req.file.buffer,
        req.file.originalname
      );

      if (parsed.emails.length === 0) {
        return res.status(400).json({
            message: "The file contains no valid student email addresses.",
            invalidRows: parsed.invalidRows,
        });
      }

      const summary = {
        totalValidEmails: parsed.emails.length,
        enrolled: [] as string[],
        alreadyEnrolled: [] as string[],
        unknownStudents: [] as string[],
        invalidRows: parsed.invalidRows,
      };

      for (const email of parsed.emails) {
        const student = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            role: true,
          },
        });

        if (!student || student.role !== "STUDENT") {
          summary.unknownStudents.push(email);
          continue;
        }

        const result = await prisma.enrollment.createMany({
          data: [
            {
              studentId: student.id,
              labId: lab.id,
            },
          ],
          skipDuplicates: true,
        });

        if (result.count === 1) {
          summary.enrolled.push(email);
        } else {
          summary.alreadyEnrolled.push(email);
        }
      }

      return res.status(200).json({
        message: "Bulk enrollment processed",
        lab,
        summary,
      });
    } catch (error) {
      console.error("Bulk enrollment error:", error);

      return res.status(500).json({
        message: "Could not process bulk enrollment",
      });
    }
  }
);

export default router;
