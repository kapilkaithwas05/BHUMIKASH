import crypto from "crypto";
import { uploadStudentList } from "../middleware/upload.middleware";
import { parseStudentList } from "./student-list.parser";
import { Router, Response } from "express";
import prisma from "../lib/prisma";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import { getParam } from "../lib/params";
import { findManageableLab } from "../lib/access";

const router = Router();

// POST /api/labs - Create lab
router.post(
  "/",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, code, description, language, departmentId } = req.body;
      const actor = req.user!;

      let assignedDepartmentId = departmentId || null;
      if (actor.role !== "VICE_CHANCELLOR") {
        const creator = await prisma.user.findUnique({
          where: { id: actor.userId },
          select: { departmentId: true },
        });
        if (departmentId && departmentId !== creator?.departmentId) {
          return res.status(403).json({ message: "You may only create labs in your department" });
        }
        assignedDepartmentId = creator?.departmentId || null;
      }

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

      // Generate a default unique enrollment key
      const generatedKey = (code ? code.toUpperCase().replace(/\s+/g, "-") + "-" : "LAB-") +
        crypto.randomBytes(3).toString("hex").toUpperCase();

      const lab = await prisma.lab.create({
        data: {
          title: title.trim(),
          code: code && typeof code === "string" ? code.trim() : null,
          description:
            typeof description === "string" && description.trim()
              ? description.trim()
              : null,
          language: language as "C" | "CPP" | "JAVA" | "PYTHON",
          enrollmentKey: generatedKey,
          departmentId: assignedDepartmentId,
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

// GET /api/labs - List labs
router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, role } = req.user!;

      if (role === "VICE_CHANCELLOR") {
        const labs = await prisma.lab.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true, code: true } },
            _count: { select: { enrollments: true, questions: true, examinations: true } },
          },
        });
        return res.status(200).json({ labs });
      }

      if (role === "FACULTY" || role === "HOD") {
        // A HOD governs only their own department: labs assigned to that department, plus
        // labs created by faculty who belong to it. Faculty see only the labs they created.
        const hod = role === "HOD"
          ? await prisma.user.findUnique({
              where: { id: userId },
              select: { departmentId: true },
            })
          : null;

        const labs = await prisma.lab.findMany({
          where:
            hod?.departmentId
              ? {
                  OR: [
                    { departmentId: hod.departmentId },
                    { createdBy: { departmentId: hod.departmentId } },
                  ],
                }
              : { createdById: userId },
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true, code: true } },
            _count: { select: { enrollments: true, questions: true, examinations: true } },
          },
        });

        return res.status(200).json({ labs });
      }

      if (role === "STUDENT") {
        const labs = await prisma.lab.findMany({
          where: {
            isPublished: true,
            enrollments: {
              some: {
                studentId: userId,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            createdBy: { select: { id: true, name: true } },
            department: { select: { id: true, name: true, code: true } },
            _count: { select: { questions: true, examinations: true } },
          },
        });

        return res.status(200).json({
          labs: labs.map(({ enrollmentKey: _enrollmentKey, ...lab }) => lab),
        });
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

// POST /api/labs/join-by-key - Student joins lab using key
router.post(
  "/join-by-key",
  authenticateToken,
  authorizeRoles("STUDENT"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { enrollmentKey } = req.body;
      const { userId } = req.user!;

      if (!enrollmentKey || typeof enrollmentKey !== "string" || !enrollmentKey.trim()) {
        return res.status(400).json({ message: "Enrollment key is required" });
      }

      const cleanKey = enrollmentKey.trim().toUpperCase();

      const lab = await prisma.lab.findFirst({
        where: {
          enrollmentKey: cleanKey,
          isPublished: true,
        },
      });

      if (!lab) {
        return res.status(404).json({ message: "Invalid or inactive enrollment key" });
      }

      // Check if already enrolled
      const existing = await prisma.enrollment.findUnique({
        where: {
          studentId_labId: {
            studentId: userId,
            labId: lab.id,
          },
        },
      });

      if (existing) {
        return res.status(409).json({ message: "You are already enrolled in this laboratory" });
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: userId,
          labId: lab.id,
        },
      });

      try {
        await prisma.notification.create({
          data: {
            userId,
            title: "Enrolled in laboratory",
            message: `You have been enrolled in "${lab.title}". Open the lab to view its assignments.`,
            type: "ENROLLMENT",
          },
        });
      } catch (notifyError) {
        console.error("Enrollment notification failed:", notifyError);
      }

      return res.status(201).json({
        message: "Successfully enrolled in " + lab.title,
        lab,
        enrollment,
      });
    } catch (error) {
      console.error("Join by key error:", error);
      return res.status(500).json({ message: "Could not join laboratory" });
    }
  }
);

// GET /api/labs/:labId - Lab detail
router.get(
  "/:labId",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);
      const { userId, role } = req.user!;

      if (!labId) {
        return res.status(400).json({ message: "Lab ID is required" });
      }

      const lab = await prisma.lab.findUnique({
        where: { id: labId },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true, code: true } },
          _count: {
            select: { enrollments: true, questions: true, examinations: true },
          },
        },
      });

      if (!lab) {
        return res.status(404).json({ message: "Laboratory not found" });
      }

      if (role !== "STUDENT" && !await findManageableLab(labId, req.user!)) {
        return res.status(403).json({ message: "You do not have permission to access this laboratory" });
      }

      if (role === "STUDENT") {
        if (!lab.isPublished) {
          return res.status(403).json({ message: "This laboratory is not published" });
        }
        const isEnrolled = await prisma.enrollment.findUnique({
          where: {
            studentId_labId: {
              studentId: userId,
              labId,
            },
          },
        });

        if (!isEnrolled) {
          return res.status(403).json({ message: "You are not enrolled in this lab" });
        }
        const { enrollmentKey: _enrollmentKey, ...studentLab } = lab;
        return res.status(200).json({ lab: studentLab });
      }

      return res.status(200).json({ lab });
    } catch (error) {
      console.error("Fetch lab detail error:", error);
      return res.status(500).json({ message: "Could not fetch laboratory details" });
    }
  }
);

// PUT /api/labs/:labId/publish - Publish or unpublish lab
router.put(
  "/:labId/publish",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);
      const { isPublished } = req.body;

      if (!labId) {
        return res.status(400).json({ message: "Lab ID is required" });
      }

      const existing = await findManageableLab(labId, req.user!);
      if (!existing) return res.status(404).json({ message: "Lab not found or you lack permission to manage it" });

      const lab = await prisma.lab.update({
        where: { id: labId },
        data: {
          isPublished: typeof isPublished === "boolean" ? isPublished : true,
        },
      });

      return res.status(200).json({
        message: `Laboratory ${lab.isPublished ? "published" : "unpublished"} successfully`,
        lab,
      });
    } catch (error) {
      console.error("Publish lab error:", error);
      return res.status(500).json({ message: "Could not update laboratory publish status" });
    }
  }
);

// POST /api/labs/:labId/enrollment-key - Generate/regenerate enrollment key
router.post(
  "/:labId/enrollment-key",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);

      if (!labId) {
        return res.status(400).json({ message: "Lab ID is required" });
      }

      const newKey = "LAB-" + crypto.randomBytes(4).toString("hex").toUpperCase();

      const existing = await findManageableLab(labId, req.user!);
      if (!existing) return res.status(404).json({ message: "Lab not found or you lack permission to manage it" });

      const lab = await prisma.lab.update({
        where: { id: labId },
        data: { enrollmentKey: newKey },
        select: { id: true, title: true, enrollmentKey: true },
      });

      return res.status(200).json({
        message: "Enrollment key generated successfully",
        enrollmentKey: lab.enrollmentKey,
      });
    } catch (error) {
      console.error("Generate enrollment key error:", error);
      return res.status(500).json({ message: "Could not generate enrollment key" });
    }
  }
);

// POST /api/labs/:labId/enroll - Single student enrollment by email
router.post(
  "/:labId/enroll",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);

      if (!labId) {
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

      const lab = await findManageableLab(labId, req.user!);

      if (!lab) {
        return res.status(404).json({
          message: "Lab not found or you do not have permission to manage it",
        });
      }

      const student = await prisma.user.findUnique({
        where: {
          email: email.trim().toLowerCase(),
        },
      });

      if (!student || student.role !== "STUDENT") {
        return res.status(404).json({
          message: "Student not found with this email",
        });
      }

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

      try {
        await prisma.notification.create({
          data: {
            userId: student.id,
            title: "Enrolled in laboratory",
            message: `You have been enrolled in "${lab.title}" by your faculty instructor. Open the lab to view its assignments.`,
            type: "ENROLLMENT",
          },
        });
      } catch (notifyError) {
        console.error("Enrollment notification failed:", notifyError);
      }

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

// GET /api/labs/:labId/students - List enrolled students
router.get(
  "/:labId/students",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);

      if (!labId) {
        return res.status(400).json({
          message: "Invalid lab ID",
        });
      }

      const { userId, role } = req.user!;

      const lab = await findManageableLab(labId, req.user!);
      if (!lab) {
        return res.status(404).json({ message: "Lab not found or you lack permission to manage it" });
      }
      const labSummary = await prisma.lab.findUnique({
        where: { id: lab.id },
        select: {
          id: true,
          title: true,
        },
      });

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
              rollNumber: true,
            },
          },
        },
      });

      return res.status(200).json({
        lab: labSummary,
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

// DELETE /api/labs/:labId/students/:studentId - Remove student from lab
router.delete(
  "/:labId/students/:studentId",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);
      const studentId = getParam(req.params.studentId);

      if (!labId || !studentId) {
        return res.status(400).json({ message: "Invalid lab ID or student ID" });
      }

      const lab = await findManageableLab(labId, req.user!);

      if (!lab) {
        return res.status(404).json({
          message: "Lab not found or you do not have permission to manage it",
        });
      }

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

// POST /api/labs/:labId/enroll/bulk - Bulk student roster upload
router.post(
  "/:labId/enroll/bulk",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  uploadStudentList.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);

      if (!labId) {
        return res.status(400).json({ message: "Lab ID is required" });
      }

      if (!req.file) {
        return res.status(400).json({
          message: 'Upload a CSV or XLSX file using the field name "file"',
        });
      }

      const lab = await findManageableLab(labId, req.user!);

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

      const newlyEnrolledIds: string[] = [];

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
          newlyEnrolledIds.push(student.id);
        } else {
          summary.alreadyEnrolled.push(email);
        }
      }

      if (newlyEnrolledIds.length > 0) {
        try {
          await prisma.notification.createMany({
            data: newlyEnrolledIds.map((studentId) => ({
              userId: studentId,
              title: "Enrolled in laboratory",
              message: `You have been enrolled in "${lab.title}" by your faculty instructor. Open the lab to view its assignments.`,
              type: "ENROLLMENT",
            })),
          });
        } catch (notifyError) {
          console.error("Bulk enrollment notification failed:", notifyError);
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
