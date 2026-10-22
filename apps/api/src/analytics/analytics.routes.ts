import { Router, Response } from "express";
import prisma from "../lib/prisma";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

/* GET /api/analytics/institution (VC / Institutional Admin) */
router.get(
  "/institution",
  authenticateToken,
  authorizeRoles("VICE_CHANCELLOR"),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const [
        totalDepartments,
        totalFaculty,
        totalStudents,
        totalLabs,
        totalExaminations,
        totalSubmissions,
        acceptedSubmissions,
        departments,
        recentSubmissions,
      ] = await Promise.all([
        prisma.department.count(),
        prisma.user.count({ where: { role: "FACULTY" } }),
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.lab.count(),
        prisma.examination.count(),
        prisma.submission.count(),
        prisma.submission.count({ where: { status: "ACCEPTED" } }),
        prisma.department.findMany({
          include: {
            _count: {
              select: {
                users: true,
                labs: true,
              },
            },
          },
        }),
        prisma.submission.findMany({
          take: 10,
          orderBy: { submittedAt: "desc" },
          include: {
            student: { select: { id: true, name: true, email: true, rollNumber: true } },
            lab: { select: { id: true, title: true, code: true } },
            question: { select: { id: true, title: true } },
          },
        }),
      ]);

      const passRate = totalSubmissions > 0
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
        : 0;

      // Department breakdowns
      const departmentStats = await Promise.all(
        departments.map(async (dept) => {
          const studentCount = await prisma.user.count({
            where: { departmentId: dept.id, role: "STUDENT" },
          });
          const facultyCount = await prisma.user.count({
            where: { departmentId: dept.id, role: "FACULTY" },
          });
          const labCount = await prisma.lab.count({
            where: { departmentId: dept.id },
          });
          const submissionsInDept = await prisma.submission.count({
            where: { lab: { departmentId: dept.id } },
          });

          return {
            id: dept.id,
            name: dept.name,
            code: dept.code,
            studentCount,
            facultyCount,
            labCount,
            submissionsCount: submissionsInDept,
          };
        })
      );

      return res.status(200).json({
        overview: {
          totalDepartments,
          totalFaculty,
          totalStudents,
          totalLabs,
          totalExaminations,
          totalSubmissions,
          acceptedSubmissions,
          passRate,
        },
        departmentStats,
        recentSubmissions,
      });
    } catch (error) {
      console.error("Institution analytics error:", error);
      return res.status(500).json({ message: "Could not fetch institutional analytics" });
    }
  }
);

/* GET /api/analytics/department (HOD) */
router.get(
  "/department",
  authenticateToken,
  authorizeRoles("HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, role } = req.user!;

      // Find HOD's department
      let departmentId: string | null = null;
      if (role === "HOD") {
        const hod = await prisma.user.findUnique({
          where: { id: userId },
          select: { departmentId: true },
        });
        departmentId = hod?.departmentId || null;
      } else {
        // VC can query any department via query param
        departmentId = (req.query.departmentId as string) || null;
      }

      if (!departmentId) {
        // Fallback to first department if available
        const firstDept = await prisma.department.findFirst();
        departmentId = firstDept?.id || null;
      }

      if (!departmentId) {
        return res.status(404).json({ message: "Department not found" });
      }

      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      const [
        facultyList,
        studentCount,
        labs,
        examinations,
        totalSubmissions,
        acceptedSubmissions,
      ] = await Promise.all([
        prisma.user.findMany({
          where: { departmentId, role: "FACULTY" },
          select: { id: true, name: true, email: true, createdAt: true },
        }),
        prisma.user.count({
          where: { departmentId, role: "STUDENT" },
        }),
        prisma.lab.findMany({
          where: { departmentId },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            _count: { select: { enrollments: true, questions: true, examinations: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.examination.findMany({
          where: { lab: { departmentId } },
          include: {
            lab: { select: { id: true, title: true } },
            _count: { select: { submissions: true } },
          },
          orderBy: { startTime: "desc" },
        }),
        prisma.submission.count({
          where: { lab: { departmentId } },
        }),
        prisma.submission.count({
          where: { lab: { departmentId }, status: "ACCEPTED" },
        }),
      ]);

      const passRate = totalSubmissions > 0
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
        : 0;

      return res.status(200).json({
        department,
        overview: {
          facultyCount: facultyList.length,
          studentCount,
          labCount: labs.length,
          examCount: examinations.length,
          totalSubmissions,
          acceptedSubmissions,
          passRate,
        },
        facultyList,
        labs,
        examinations,
      });
    } catch (error) {
      console.error("Department analytics error:", error);
      return res.status(500).json({ message: "Could not fetch department analytics" });
    }
  }
);

/* GET /api/analytics/audit-logs */
router.get(
  "/audit-logs",
  authenticateToken,
  authorizeRoles("VICE_CHANCELLOR"),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const logs = await prisma.auditLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      return res.status(200).json({ logs });
    } catch (error) {
      console.error("Fetch audit logs error:", error);
      return res.status(500).json({ message: "Could not fetch audit logs" });
    }
  }
);

export default router;
