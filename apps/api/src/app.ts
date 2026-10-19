
import labRoutes from "./labs/lab.routes";
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

app.use("/api/labs", labRoutes);

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


import multer from "multer";

// Handle file-upload errors
app.use(
  (
    error: Error,
    _req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction
  ) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: "File is too large. Maximum allowed size is 2 MB.",
        });
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          message: "Upload only one file at a time.",
        });
      }

      return res.status(400).json({
        message: "File upload failed.",
        detail: error.message,
      });
    }

    if (error.message === "Only CSV and XLSX files are allowed") {
      return res.status(400).json({
        message: "Unsupported file type. Upload a CSV or XLSX file.",
      });
    }

    return next(error);
  }
);

export default app;
