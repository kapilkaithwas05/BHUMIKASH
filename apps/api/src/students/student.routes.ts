import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import { getParam } from "../lib/params";

const router = Router();

async function visibleStudentWhere(actor: AuthenticatedRequest["user"], id?: string) {
  if (!actor) return null;
  if (actor.role === "VICE_CHANCELLOR") return { role: "STUDENT" as const, ...(id ? { id } : {}) };
  const hod = await prisma.user.findUnique({ where: { id: actor.userId }, select: { departmentId: true, facultyProfile: { select: { departmentId: true } } } });
  const departmentId = hod?.facultyProfile?.departmentId ?? hod?.departmentId;
  if (!departmentId) return null;
  return {
    role: "STUDENT" as const,
    ...(id ? { id } : {}),
    OR: [
      { departmentId },
      { studentProfile: { program: { departmentId } } },
      { studentProfile: { cohort: { program: { departmentId } } } },
    ],
  };
}

router.get("/", authenticateToken, authorizeRoles("HOD", "VICE_CHANCELLOR"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 25);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return res.status(400).json({ message: "Page must be positive and pageSize must be between 1 and 100" });
    }
    const scope = await visibleStudentWhere(req.user);
    if (!scope) return res.status(403).json({ message: "Your account is not assigned to a department" });
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const cohortId = typeof req.query.cohortId === "string" ? req.query.cohortId.trim() : "";
    const programId = typeof req.query.programId === "string" ? req.query.programId.trim() : "";
    const where = {
      ...scope,
      ...(cohortId ? { studentProfile: { cohortId } } : programId ? { studentProfile: { programId } } : {}),
      ...(q ? { AND: [{ OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { rollNumber: { contains: q, mode: "insensitive" as const } },
        { studentProfile: { enrollmentNumber: { contains: q, mode: "insensitive" as const } } },
      ] }] } : {}),
      ...(req.query.departmentId && req.user?.role === "VICE_CHANCELLOR" ? { departmentId: String(req.query.departmentId) } : {}),
    };
    const [total, students] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: {
          id: true, name: true, email: true, rollNumber: true, isActive: true, departmentId: true,
          department: { select: { id: true, name: true, code: true } },
          studentProfile: { select: { enrollmentNumber: true, instituteId: true, isActive: true, program: { select: { id: true, code: true, name: true } }, cohort: { select: { id: true, semester: true, section: true, academicYear: { select: { label: true } } } } } },
        },
      }),
    ]);
    return res.json({ students, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
  } catch (error) {
    console.error("Student directory error:", error);
    return res.status(500).json({ message: "Could not load student directory" });
  }
});

router.get("/:studentId", authenticateToken, authorizeRoles("HOD", "VICE_CHANCELLOR"), async (req: AuthenticatedRequest, res: Response) => {
  const id = getParam(req.params.studentId);
  if (!id) return res.status(400).json({ message: "Student ID is required" });
  const scope = await visibleStudentWhere(req.user, id);
  if (!scope) return res.status(403).json({ message: "Your account is not assigned to a department" });
  const student = await prisma.user.findFirst({ where: scope, select: { id: true, name: true, email: true, rollNumber: true, isActive: true, department: { select: { id: true, name: true, code: true } }, studentProfile: { select: { enrollmentNumber: true, instituteId: true, isActive: true, program: true, cohort: { include: { academicYear: true } } } } } });
  if (!student) return res.status(404).json({ message: "Student not found" });
  return res.json({ student });
});

router.patch("/:studentId/status", authenticateToken, authorizeRoles("VICE_CHANCELLOR"), async (req: AuthenticatedRequest, res: Response) => {
  const id = getParam(req.params.studentId);
  if (!id || typeof req.body?.isActive !== "boolean") return res.status(400).json({ message: "Student ID and boolean isActive are required" });
  const scope = await visibleStudentWhere(req.user, id);
  if (!scope) return res.status(403).json({ message: "Your account is not assigned to a department" });
  const student = await prisma.user.findFirst({ where: scope, select: { id: true, studentProfile: { select: { id: true } } } });
  if (!student) return res.status(404).json({ message: "Student not found" });
  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id }, data: { isActive: req.body.isActive }, select: { id: true, isActive: true } });
    if (student.studentProfile) await tx.studentProfile.update({ where: { userId: id }, data: { isActive: req.body.isActive } });
    return user;
  });
  return res.json({ student: updated });
});

export default router;
