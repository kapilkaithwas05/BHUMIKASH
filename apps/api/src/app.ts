
import { authorizeRoles } from "./middleware/role.middleware";
import { AuthenticatedRequest, authenticateToken } from "./middleware/auth.middleware";
import prisma from "./lib/prisma";
import express from "express";
import cors from "cors";
import authRoutes from "./auth/auth.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to LabNEXUS API!"
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    message: "LabNEXUS backend is running"
  });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "OK",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      status: "ERROR",
      database: "disconnected",
    });
  }
});

app.get(
  "/api/auth/me",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    res.json({
      message: "Authentication successful",
      user: req.user,
    });
  }
);

app.get(
  "/api/auth/faculty-test",
  authenticateToken,
  authorizeRoles("FACULTY", "HOD"),
  (_req, res) => {
    res.json({
      message: "Access granted",
      allowedRoles: ["FACULTY", "HOD"],
    });
  }
);

export default app;
