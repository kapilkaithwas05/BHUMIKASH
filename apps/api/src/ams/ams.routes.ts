import { Router, Response } from "express";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import { AMSIntegrationService } from "./ams.service";
import prisma from "../lib/prisma";
import { getParam } from "../lib/params";
import { canManageLab } from "../lib/access";

const router = Router();
const amsService = AMSIntegrationService.getInstance();

/* GET /api/ams/status */
router.get("/status", authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  return res.status(200).json({
    integration: "AMS (Attendance Management System)",
    isConfigured: amsService.isConfigured(),
    mode: amsService.isConfigured() ? "LIVE_GATEWAY" : "MOCK_DEVELOPMENT_ADAPTER",
    message: amsService.isConfigured()
      ? "Connected to University AMS Gateway"
      : "University AMS integration contract active in development mock mode. Official API credentials pending.",
  });
});

/* GET /api/ams/labs/:labId/report */
router.get(
  "/labs/:labId/report",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD", "VICE_CHANCELLOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const labId = getParam(req.params.labId);
      if (!labId) {
        return res.status(400).json({ message: "Lab ID is required" });
      }

      const lab = await prisma.lab.findUnique({ where: { id: labId } });

      if (!lab) {
        return res.status(404).json({ message: "Lab not found" });
      }

      if (!await canManageLab(labId, req.user!)) {
        return res.status(403).json({ message: "You do not have permission to view this lab report" });
      }

      const report = await amsService.getLabAttendanceSummary(lab.code || lab.title);
      return res.status(200).json({ report });
    } catch (error) {
      console.error("AMS report error:", error);
      return res.status(500).json({ message: "Could not fetch attendance report" });
    }
  }
);

export default router;
