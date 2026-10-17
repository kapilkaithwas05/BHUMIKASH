
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

export type UserRole =
  | "VICE_CHANCELLOR"
  | "HOD"
  | "FACULTY"
  | "STUDENT";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token is required",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error("JWT_SECRET is not configured");

    return res.status(500).json({
      message: "Authentication is not configured",
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string" ||
      !decoded.userId
    ) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    // Fetch the user's current role from PostgreSQL.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    req.user = {
      userId: user.id,
      role: user.role as UserRole,
    };

    return next();
  } catch (error) {
    // Database failures must not be mistaken for invalid tokens.
    if (error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.TokenExpiredError ||
        error instanceof jwt.NotBeforeError) {
      return res.status(401).json({
        message: "Invalid or expired authentication token",
      });
    }

    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Authentication could not be completed",
    });
  }
}
