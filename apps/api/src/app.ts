import express from "express";
import cors from "cors";
import multer from "multer";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import prisma from "./lib/prisma";
import authRoutes from "./auth/auth.routes";
import labRoutes from "./labs/lab.routes";
import questionRoutes from "./questions/question.routes";
import submissionRoutes from "./submissions/submission.routes";
import examinationRoutes from "./examinations/examination.routes";
import analyticsRoutes from "./analytics/analytics.routes";
import amsRoutes from "./ams/ams.routes";
import notificationRoutes from "./notifications/notification.routes";

import { authenticateToken, AuthenticatedRequest } from "./middleware/auth.middleware";

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : true; // allow any origin in development if CORS_ORIGIN not set

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Strict limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again in 15 minutes.",
  },
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,                 // 200 requests/minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));

// Route handlers
app.use("/api/auth", authRoutes);
app.use("/api/labs", labRoutes);

// Questions (both scoped under /api/labs/:labId/questions and top-level /api/questions)
app.use("/api/labs/:labId/questions", questionRoutes);
app.use("/api/questions", questionRoutes);

// Submissions (run & submit endpoints)
app.use("/api/questions", submissionRoutes);

// Examinations
app.use("/api/labs/:labId/examinations", examinationRoutes);
app.use("/api/examinations", examinationRoutes);

// Analytics & Reports
app.use("/api/analytics", analyticsRoutes);

// AMS Integration
app.use("/api/ams", amsRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);

// Health check endpoints
app.get("/", (_req, res) => {
  res.json({
    name: "LabNEXUS API",
    version: "1.0.0",
    status: "ONLINE",
    message: "Welcome to LabNEXUS — Integrated University Laboratory Assessment Portal",
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    service: "LabNEXUS backend",
    timestamp: new Date().toISOString(),
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
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          rollNumber: true,
          department: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "Authentication successful",
        user,
      });
    } catch (error) {
      res.status(500).json({ message: "Could not fetch user profile" });
    }
  }
);

// File-upload error handling
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
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

// ── Global error handler (must be last middleware) ────────────────────────────
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[Unhandled Error]", error);

    // Don't expose stack traces to clients
    const statusCode =
      (error as any).statusCode ||
      (error as any).status ||
      500;

    res.status(statusCode).json({
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : error.message || "Internal Server Error",
    });
  }
);

export default app;
