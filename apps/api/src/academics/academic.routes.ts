import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

router.get(
  "/options",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, role } = req.user!;
      let departmentId: string | undefined;
      if (role === "HOD" || role === "FACULTY") {
        const hod = await prisma.user.findUnique({
          where: { id: userId },
          select: { departmentId: true, facultyProfile: { select: { departmentId: true } } },
        });
        departmentId = hod?.facultyProfile?.departmentId ?? hod?.departmentId ?? undefined;
        if (role === "HOD" && !departmentId) return res.status(403).json({ message: "Your account is not assigned to a department" });
      }

      const departments = await prisma.department.findMany({
        where: departmentId ? { id: departmentId } : undefined,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          programs: {
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              code: true,
              cohorts: {
                orderBy: [{ semester: "asc" }, { section: "asc" }],
                select: { id: true, semester: true, section: true, academicYear: { select: { label: true } } },
              },
            },
          },
          courses: { orderBy: { title: "asc" }, select: { id: true, code: true, title: true } },
        },
      });
      return res.json({ departments, homeDepartmentId: departmentId ?? null });
    } catch (error) {
      console.error("Academic options error:", error);
      return res.status(500).json({ message: "Could not load academic structure" });
    }
  }
);

export default router;
