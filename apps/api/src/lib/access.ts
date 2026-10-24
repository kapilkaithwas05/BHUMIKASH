import prisma from "./prisma";
import { UserRole } from "../middleware/auth.middleware";

export interface AccessActor {
  userId: string;
  role: UserRole;
}

/** Find a lab only when the actor may manage it. VC is institution-wide, faculty own labs,
 * and HODs are limited to their department (including faculty-created labs in that department).
 */
export async function findManageableLab(labId: string, actor: AccessActor) {
  let scope: Record<string, unknown> = {};

  if (actor.role === "FACULTY") {
    scope = { createdById: actor.userId };
  } else if (actor.role === "HOD") {
    const hod = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { departmentId: true },
    });
    scope = hod?.departmentId
      ? {
          OR: [
            { departmentId: hod.departmentId },
            { createdBy: { departmentId: hod.departmentId } },
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
