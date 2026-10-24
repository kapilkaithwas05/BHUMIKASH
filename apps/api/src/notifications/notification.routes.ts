import { Router, Response } from "express";
import prisma from "../lib/prisma";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { getParam } from "../lib/params";

const router = Router();

/* GET /api/notifications — list the authenticated user's notifications */
router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.user!;

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const unreadCount = notifications.filter((n) => !n.isRead).length;

      return res.status(200).json({ notifications, unreadCount });
    } catch (error) {
      console.error("Fetch notifications error:", error);
      return res.status(500).json({ message: "Could not fetch notifications" });
    }
  }
);

/* PUT /api/notifications/:id/read — mark a notification as read */
router.put(
  "/:id/read",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = getParam(req.params.id);
      const { userId } = req.user!;

      if (!id) {
        return res.status(400).json({ message: "Notification ID is required" });
      }

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Users can only mark their own notifications as read
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      return res.status(200).json({ notification: updated });
    } catch (error) {
      console.error("Mark notification read error:", error);
      return res.status(500).json({ message: "Could not update notification" });
    }
  }
);

/* PUT /api/notifications/read-all — mark all notifications as read for the user */
router.put(
  "/read-all",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.user!;

      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      return res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all read error:", error);
      return res.status(500).json({ message: "Could not update notifications" });
    }
  }
);

/* DELETE /api/notifications/:id — delete a notification */
router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = getParam(req.params.id);
      const { userId } = req.user!;

      if (!id) {
        return res.status(400).json({ message: "Notification ID is required" });
      }

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await prisma.notification.delete({ where: { id } });

      return res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Delete notification error:", error);
      return res.status(500).json({ message: "Could not delete notification" });
    }
  }
);

export default router;
