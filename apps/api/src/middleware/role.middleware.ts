
import { Response, NextFunction } from "express";
import {
  AuthenticatedRequest,
} from "./auth.middleware";

export type UserRole =
  | "VICE_CHANCELLOR"
  | "HOD"
  | "FACULTY"
  | "STUDENT";

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    // Authentication must run before authorization.
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Check whether the user's role is permitted.
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
}
