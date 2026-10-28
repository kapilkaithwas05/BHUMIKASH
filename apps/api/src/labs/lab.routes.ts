import crypto from "crypto";
import { uploadStudentList } from "../middleware/upload.middleware";
import { normalizeStudentEmail, parseStudentList } from "./student-list.parser";
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
  authorizeRoles("FACULTY", "HOD"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, code, description, language, departmentId, courseId, cohortId } = req.body;
      const actor = req.user!;

      const creator = await prisma.user.findUnique({
        where: { id: actor.userId },
        select: {
          departmentId: true,
          facultyProfile: { select: { id: true, departmentId: true } },
        },
      });
      if (!creator) {
        return res.status(404).json({ message: "User account was not found" });
      }

      // User.departmentId is the legacy assignment; FacultyProfile is the normalized
      // assignment. Prefer the normalized value while supporting existing user records.
      const creatorDepartmentId = creator.facultyProfile?.departmentId ?? creator.departmentId;
      if (departmentId && departmentId !== creatorDepartmentId) {
        return res.status(403).json({ message: "You may only create labs in your department" });
      }
      if (actor.role === "HOD" && !creatorDepartmentId) {
        return res.status(400).json({ message: "Assign this HOD to a department before creating a laboratory" });
      }
      const assignedDepartmentId = creatorDepartmentId || null;

      if (courseId != null && typeof courseId !== "string") {
        return res.status(400).json({ message: "Course selection is invalid" });
      }
      if (cohortId != null && typeof cohortId !== "string") {
        return res.status(400).json({ message: "Cohort selection is invalid" });
      }
      if ((courseId || cohortId) && !assignedDepartmentId) {
        return res.status(400).json({ message: "Assign your account to a department before linking academic structure" });
      }
      if (courseId) {
        const course = await prisma.course.findUnique({ where: { id: courseId }, select: { departmentId: true } });
        if (!course || course.departmentId !== assignedDepartmentId) {
          return res.status(400).json({ message: "The selected course must belong to your department" });
        }
      }
      if (cohortId) {
        const cohort = await prisma.cohort.findUnique({ where: { id: cohortId }, select: { program: { select: { departmentId: true } } } });
        if (!cohort || cohort.program.departmentId !== assignedDepartmentId) {
          return res.status(400).json({ message: "The selected cohort must belong to your department" });
        }
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
          courseId: courseId || null,
          cohortId: cohortId || null,
          facultyAssignments: actor.role === "FACULTY" && creator.facultyProfile?.id
            ? { create: { facultyId: creator.facultyProfile.id } }
            : undefined,
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
      const labDetails = {
        createdBy: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        course: { include: { department: { select: { id: true, name: true, code: true } } } },
        cohort: { include: {
          program: { include: { department: { select: { id: true, name: true, code: true } } } },
          academicYear: true,
        } },
        facultyAssignments: { include: { faculty: { include: { user: { select: { id: true, name: true, email: true } } } } } },
        _count: { select: { enrollments: true, questions: true, examinations: true } },
      };

      if (role === "VICE_CHANCELLOR") {
        const labs = await prisma.lab.findMany({
          orderBy: { createdAt: "desc" },
          include: labDetails,
        });
        return res.status(200).json({ labs });
      }

      if (role === "FACULTY" || role === "HOD") {
        // A HOD governs only their own department: labs assigned to that department, plus
        // labs created by faculty who belong to it. Faculty see only the labs they created.
        const hod = role === "HOD"
          ? await prisma.user.findUnique({
              where: { id: userId },
              select: {
                departmentId: true,
                facultyProfile: { select: { departmentId: true } },
              },
            })
          : null;
        const hodDepartmentId = hod?.facultyProfile?.departmentId ?? hod?.departmentId;

        const labScope = role === "FACULTY"
          ? { OR: [
              { createdById: userId },
              { facultyAssignments: { some: { faculty: { userId } } } },
            ] }
          : hodDepartmentId
            ? {
                OR: [
                  { departmentId: hodDepartmentId },
                  { createdBy: { departmentId: hodDepartmentId } },
                  { createdBy: { facultyProfile: { departmentId: hodDepartmentId } } },
                ],
              }
            : { createdById: userId };

        const labs = await prisma.lab.findMany({
          where: labScope,
          orderBy: { createdAt: "desc" },
          include: labDetails,
        });

        return res.status(200).json({ labs });
      }

      if (role === "STUDENT") {
        const labs = await prisma.lab.findMany({
          where: {
            isPublished: true,
            archivedAt: null,
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
            course: { include: { department: { select: { id: true, name: true, code: true } } } },
            cohort: { include: { program: { include: { department: { select: { id: true, name: true, code: true } } } }, academicYear: true } },
            facultyAssignments: { include: { faculty: { include: { user: { select: { id: true, name: true } } } } } },
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

      if (lab.cohortId) {
        const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { cohortId: true } });
        if (profile?.cohortId !== lab.cohortId) {
          return res.status(403).json({ message: "This laboratory is assigned to a different academic section" });
        }
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
    } catch (error: any) {
      console.error("Join by key error:", error);
      if (error?.code === "P2002") {
        return res.status(409).json({ message: "You are already enrolled in this laboratory" });
      }
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
          course: { include: { department: { select: { id: true, name: true, code: true } } } },
          cohort: { include: {
            program: { include: { department: { select: { id: true, name: true, code: true } } } },
            academicYear: true,
          } },
          facultyAssignments: { include: { faculty: { include: { user: { select: { id: true, name: true, email: true } } } } } },
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

// Archive/restore labs instead of cascading away student submissions and records.
router.patch(
  "/:labId/archive",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);
      const lab = labId ? await findManageableLab(labId, req.user!) : null;
      if (!lab) return res.status(404).json({ message: "Lab not found or you lack permission to archive it" });
      if (req.user!.role === "FACULTY" && lab.createdById !== req.user!.userId) {
        return res.status(403).json({ message: "Only the faculty member who created this lab can archive it" });
      }
      const archived = await prisma.lab.update({
        where: { id: lab.id },
        data: { archivedAt: new Date(), isPublished: false },
      });
      return res.json({ message: "Lab archived. Its submissions and records are preserved and can be restored.", lab: archived });
    } catch (error) {
      console.error("Archive lab error:", error);
      return res.status(500).json({ message: "Could not archive laboratory" });
    }
  }
);

router.patch(
  "/:labId/restore",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);
      const lab = labId ? await findManageableLab(labId, req.user!) : null;
      if (!lab) return res.status(404).json({ message: "Lab not found or you lack permission to restore it" });
      if (req.user!.role === "FACULTY" && lab.createdById !== req.user!.userId) {
        return res.status(403).json({ message: "Only the faculty member who created this lab can restore it" });
      }
      const restored = await prisma.lab.update({ where: { id: lab.id }, data: { archivedAt: null } });
      return res.json({ message: "Lab restored. Publish it when it is ready for students.", lab: restored });
    } catch (error) {
      console.error("Restore lab error:", error);
      return res.status(500).json({ message: "Could not restore laboratory" });
    }
  }
);

// PUT /api/labs/:labId/publish - Publish or unpublish lab
router.put(
  "/:labId/publish",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD"),
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
  authorizeRoles("FACULTY", "HOD"),
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
  authorizeRoles("FACULTY", "HOD"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);

      if (!labId) {
        return res.status(400).json({
          message: "Invalid lab ID",
        });
      }
      const { email } = req.body;

      const studentEmail = normalizeStudentEmail(email);
      if (!studentEmail) {
        return res.status(400).json({
          message: "Use a college email ID ending in @mitsgwl.ac.in",
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
          email: studentEmail,
        },
        select: { id: true, role: true, isActive: true, studentProfile: { select: { cohortId: true } } },
      });

      if (!student || student.role !== "STUDENT") {
        return res.status(404).json({
          message: "Student not found with this email",
        });
      }
      if (!student.isActive) return res.status(400).json({ message: "This student account is inactive" });
      if (lab.cohortId && student.studentProfile?.cohortId !== lab.cohortId) {
        return res.status(400).json({ message: "This student is not assigned to the laboratory's academic section" });
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
    } catch (error: any) {
      console.error("Student enrollment error:", error);
      if (error?.code === "P2002") {
        return res.status(409).json({ message: "Student is already enrolled in this lab" });
      }
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
          enrolledAt: "asc",
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
                studentProfile: {
                  select: {
                    program: { select: { id: true, code: true, name: true, department: { select: { id: true, name: true, code: true } } } },
                    cohort: { select: { semester: true, section: true, academicYear: { select: { label: true } } } },
                  },
                },
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

// GET /api/labs/:labId/faculty - Read the teaching team and institution faculty options
router.get(
  "/:labId/faculty",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);
      if (!labId || !await findManageableLab(labId, req.user!)) {
        return res.status(404).json({ message: "Lab not found or you lack permission to view it" });
      }
      const [assignments, faculty] = await Promise.all([
        prisma.labFacultyAssignment.findMany({
          where: { labId },
          orderBy: { assignedAt: "asc" },
          include: { faculty: { include: { user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true, code: true } } } }, department: { select: { id: true, name: true, code: true } } } } },
        }),
        prisma.facultyProfile.findMany({
          where: { isActive: true, user: { isActive: true, role: "FACULTY" } },
          orderBy: { user: { name: "asc" } },
          include: { user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true, code: true } } } }, department: { select: { id: true, name: true, code: true } } },
        }),
      ]);
      return res.json({
        assignedFaculty: assignments.map(({ faculty: profile }) => ({
          id: profile.user.id,
          name: profile.user.name,
          email: profile.user.email,
          homeDepartment: profile.department ?? profile.user.department,
        })),
        faculty: faculty.map((profile) => ({
          id: profile.user.id,
          name: profile.user.name,
          email: profile.user.email,
          homeDepartment: profile.department ?? profile.user.department,
        })),
      });
    } catch (error) {
      console.error("Fetch lab faculty error:", error);
      return res.status(500).json({ message: "Could not fetch lab faculty" });
    }
  }
);

// PUT /api/labs/:labId/faculty - Replace the assigned teaching team
router.put(
  "/:labId/faculty",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);
      const userIds: unknown = req.body?.facultyIds;
      if (!labId || !Array.isArray(userIds) || userIds.some((id) => typeof id !== "string")) {
        return res.status(400).json({ message: "Lab ID and an array of faculty user IDs are required" });
      }

      const lab = await findManageableLab(labId, req.user!);
      if (!lab) return res.status(404).json({ message: "Lab not found or you lack permission to manage it" });
      if (req.user!.role === "FACULTY" && lab.createdById !== req.user!.userId) {
        return res.status(403).json({ message: "Only the lab owner or an authorized HOD can change its teaching team" });
      }

      const uniqueUserIds = [...new Set(userIds as string[])];
      const profiles = uniqueUserIds.length
        ? await prisma.facultyProfile.findMany({
            where: { userId: { in: uniqueUserIds }, isActive: true, user: { role: "FACULTY", isActive: true } },
            select: { id: true, userId: true },
          })
        : [];
      if (profiles.length !== uniqueUserIds.length) {
        return res.status(400).json({ message: "One or more selected accounts are not active faculty profiles" });
      }

      await prisma.$transaction(async (tx) => {
        if (profiles.length) {
          await tx.labFacultyAssignment.deleteMany({ where: { labId, facultyId: { notIn: profiles.map(({ id }) => id) } } });
          await tx.labFacultyAssignment.createMany({ data: profiles.map(({ id }) => ({ labId, facultyId: id })), skipDuplicates: true });
        } else {
          await tx.labFacultyAssignment.deleteMany({ where: { labId } });
        }
      });

      const assignments = await prisma.labFacultyAssignment.findMany({
        where: { labId },
        orderBy: { assignedAt: "asc" },
        include: { faculty: { include: { user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true, code: true } } } }, department: { select: { id: true, name: true, code: true } } } } },
      });
      return res.json({
        message: "Teaching team updated",
        assignedFaculty: assignments.map(({ faculty: profile }) => ({
          id: profile.user.id,
          name: profile.user.name,
          email: profile.user.email,
          homeDepartment: profile.department ?? profile.user.department,
        })),
      });
    } catch (error) {
      console.error("Update lab faculty error:", error);
      return res.status(500).json({ message: "Could not update the lab teaching team" });
    }
  }
);

// DELETE /api/labs/:labId/students/:studentId - Remove student from lab
router.delete(
  "/:labId/students/:studentId",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD"),
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
  authorizeRoles("FACULTY", "HOD"),
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
        ineligibleStudents: [] as string[],
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
          isActive: true,
          studentProfile: { select: { cohortId: true } },
          },
        });

        if (!student || student.role !== "STUDENT") {
          summary.unknownStudents.push(email);
          continue;
        }
        if (!student.isActive || (lab.cohortId && student.studentProfile?.cohortId !== lab.cohortId)) {
          summary.ineligibleStudents.push(email);
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
