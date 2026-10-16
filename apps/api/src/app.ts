
import prisma from "./lib/prisma";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

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

export default app;
