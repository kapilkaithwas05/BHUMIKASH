import prisma from "./prisma";
import { UserRole } from "../middleware/auth.middleware";

export interface AccessActor {
  userId: string;
  role: UserRole;
}

/** Find a lab only when the actor may manage it. VC is institution-wide, faculty may manage
 * labs they created or were assigned to teach, and HODs are department-scoped.
 */
export async function findManageableLab(labId: string, actor: AccessActor) {
  let scope: Record<string, unknown> = {};

  if (actor.role === "FACULTY") {
    scope = {
      OR: [
        { createdById: actor.userId },
        { facultyAssignments: { some: { faculty: { userId: actor.userId } } } },
      ],
    };
  } else if (actor.role === "HOD") {
    const hod = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: {
        departmentId: true,
        facultyProfile: { select: { departmentId: true } },
      },
    });
    const departmentId = hod?.facultyProfile?.departmentId ?? hod?.departmentId;
    scope = departmentId
      ? {
          OR: [
            { departmentId },
            { createdBy: { departmentId } },
            { createdBy: { facultyProfile: { departmentId } } },
          ],
        }
      : { createdById: actor.userId };
  } else if (actor.role !== "VICE_CHANCELLOR") {
    return null;
  }

  return prisma.lab.findFirst({ where: { id: labId, ...scope } });
}

export async function canManageLab(labId: string, actor: AccessActor): Promise<boolean> {
  return Boolean(await findManageableLab(labId, actor));
}
