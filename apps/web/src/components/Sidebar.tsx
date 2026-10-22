import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FlaskConical,
  FileCheck2,
  Users,
  ShieldAlert,
  CalendarCheck,
  PlusCircle,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { Modal } from "./Modal";
import { api } from "../services/api";

interface SidebarProps {
  onLabCreated?: () => void;
  onLabJoined?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLabCreated, onLabJoined }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Modals state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [enrollmentKey, setEnrollmentKey] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Create Lab Form State
  const [labTitle, setLabTitle] = useState("");
  const [labCode, setLabCode] = useState("");
  const [labDesc, setLabDesc] = useState("");
  const [labLang, setLabLang] = useState("C");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleJoinLab = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinLoading(true);
    setJoinError(null);
    setJoinSuccess(null);
    try {
      const res = await api.joinLabByKey(enrollmentKey);
      setJoinSuccess(res.message);
      setEnrollmentKey("");
      if (onLabJoined) onLabJoined();
      setTimeout(() => {
        setIsJoinModalOpen(false);
        setJoinSuccess(null);
      }, 1500);
    } catch (err: any) {
      setJoinError(err.message || "Failed to join laboratory");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      await api.createLab({
        title: labTitle,
        code: labCode || undefined,
        description: labDesc || undefined,
        language: labLang,
      });
      setLabTitle("");
      setLabCode("");
      setLabDesc("");
      setIsCreateModalOpen(false);
      if (onLabCreated) onLabCreated();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create lab");
    } finally {
      setCreateLoading(false);
    }
  };

  const navItems = [];

  if (user?.role === "VICE_CHANCELLOR") {
    navItems.push(
      { label: "Institution Overview", path: "/", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "Department Metrics", path: "/#departments", icon: <FlaskConical className="w-4 h-4" /> },
      { label: "Audit Logs", path: "/#audit", icon: <ShieldAlert className="w-4 h-4" /> }
    );
  } else if (user?.role === "HOD") {
    navItems.push(
      { label: "Department Overview", path: "/", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "Department Labs", path: "/#labs", icon: <FlaskConical className="w-4 h-4" /> },
      { label: "Examinations", path: "/#exams", icon: <CalendarCheck className="w-4 h-4" /> },
      { label: "Faculty Directory", path: "/#faculty", icon: <Users className="w-4 h-4" /> }
    );
  } else if (user?.role === "FACULTY") {
    navItems.push(
      { label: "My Laboratories", path: "/", icon: <FlaskConical className="w-4 h-4" /> },
      { label: "Assessments & Exams", path: "/#exams", icon: <CalendarCheck className="w-4 h-4" /> },
      { label: "AMS Attendance Sync", path: "/#ams", icon: <FileCheck2 className="w-4 h-4" /> }
    );
  } else {
    // Student
    navItems.push(
      { label: "My Enrolled Labs", path: "/", icon: <FlaskConical className="w-4 h-4" /> },
      { label: "Active Assessments", path: "/#exams", icon: <CalendarCheck className="w-4 h-4" /> },
      { label: "Submission History", path: "/#history", icon: <FileCheck2 className="w-4 h-4" /> }
    );
  }

  return (
    <>
      <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0">
        <div>
          {/* Action Button based on Role */}
          {user?.role === "STUDENT" ? (
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.01]"
            >
              <KeyRound className="w-4 h-4" />
              <span>Join Lab with Key</span>
            </button>
          ) : user?.role === "FACULTY" || user?.role === "HOD" ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.01]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Laboratory</span>
            </button>
          ) : null}

          {/* Nav List */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path && !location.hash;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System info footer */}
        <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
          <p className="font-semibold text-slate-600">LabNEXUS v1.0</p>
          <p>Sandboxed Execution & Evaluation</p>
        </div>
      </aside>

      {/* Join Lab Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Join Laboratory via Key"
        maxWidth="md"
      >
        <form onSubmit={handleJoinLab} className="space-y-4">
          <p className="text-xs text-slate-500">
            Enter the unique enrollment key provided by your faculty instructor (e.g. `DSALAB2026`).
          </p>
          {joinError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {joinError}
            </div>
          )}
          {joinSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{joinSuccess}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enrollment Key
            </label>
            <input
              type="text"
              required
              placeholder="e.g. DSALAB2026"
              value={enrollmentKey}
              onChange={(e) => setEnrollmentKey(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsJoinModalOpen(false)}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={joinLoading}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              {joinLoading ? "Joining..." : "Enroll in Lab"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Lab Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Laboratory"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateLab} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {createError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Laboratory Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design & Analysis of Algorithms Lab"
              value={labTitle}
              onChange={(e) => setLabTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Code
              </label>
              <input
                type="text"
                placeholder="e.g. CSBS-204"
                value={labCode}
                onChange={(e) => setLabCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Language *
              </label>
              <select
                value={labLang}
                onChange={(e) => setLabLang(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="C">C</option>
                <option value="CPP">C++</option>
                <option value="JAVA">Java</option>
                <option value="PYTHON">Python</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Objectives
            </label>
            <textarea
              rows={3}
              placeholder="Course outline, syllabus coverage, and learning objectives..."
              value={labDesc}
              onChange={(e) => setLabDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              {createLoading ? "Creating..." : "Create Laboratory"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
