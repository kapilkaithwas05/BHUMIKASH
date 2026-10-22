import React from "react";
import { SubmissionStatus } from "../types";

interface BadgeProps {
  status?: SubmissionStatus | string;
  children?: React.ReactNode;
  variant?: "success" | "danger" | "warning" | "info" | "neutral" | "purple";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({ status, children, variant, size = "sm" }) => {
  let resolvedVariant = variant || "neutral";
  let text = children || status;

  if (status) {
    switch (status) {
      case "ACCEPTED":
        resolvedVariant = "success";
        text = "Accepted";
        break;
      case "WRONG_ANSWER":
        resolvedVariant = "danger";
        text = "Wrong Answer";
        break;
      case "COMPILATION_ERROR":
        resolvedVariant = "warning";
        text = "Compilation Error";
        break;
      case "RUNTIME_ERROR":
        resolvedVariant = "danger";
        text = "Runtime Error";
        break;
      case "TIME_LIMIT_EXCEEDED":
        resolvedVariant = "purple";
        text = "Time Limit Exceeded";
        break;
      case "RUNNING":
      case "PENDING":
        resolvedVariant = "info";
        text = status === "RUNNING" ? "Running..." : "Pending";
        break;
      default:
        break;
    }
  }

  const variantStyles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20",
    danger: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20",
    warning: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20",
    info: "bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/20",
    purple: "bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/20",
    neutral: "bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/20",
  };

  const sizeStyles = {
    sm: "text-xs px-2 py-0.5 font-medium",
    md: "text-sm px-2.5 py-1 font-medium",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ring-1 ring-inset ${variantStyles[resolvedVariant]} ${sizeStyles[size]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          resolvedVariant === "success"
            ? "bg-emerald-500"
            : resolvedVariant === "danger"
            ? "bg-rose-500"
            : resolvedVariant === "warning"
            ? "bg-amber-500"
            : resolvedVariant === "info"
            ? "bg-sky-500"
            : resolvedVariant === "purple"
            ? "bg-purple-500"
            : "bg-slate-400"
        }`}
      />
      {text}
    </span>
  );
};
