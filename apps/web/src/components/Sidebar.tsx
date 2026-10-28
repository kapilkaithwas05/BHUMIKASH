import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FlaskConical,
  Users,
  ShieldAlert,
  CalendarCheck,
  PlusCircle,
  KeyRound,
  CheckCircle2,
  Code2,
  GraduationCap,
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
  const [academicOptions, setAcademicOptions] = useState<Awaited<ReturnType<typeof api.getAcademicOptions>> | null>(null);
  const [academicOptionsError, setAcademicOptionsError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState("");

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    if (academicOptions || academicOptionsError) return;
    api.getAcademicOptions().then(setAcademicOptions).catch((error: Error) => setAcademicOptionsError(error.message));
  };

  const selectedDepartment = academicOptions?.departments.find((department) => department.id === academicOptions.homeDepartmentId);
  const availableCourses = selectedDepartment?.courses ?? [];
  const availableCohorts = selectedDepartment?.programs.flatMap((program) => program.cohorts.map((cohort) => ({
    ...cohort,
    programName: program.name,
    programCode: program.code,
  }))) ?? [];

  const handleJoinLab = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinLoading(true);
    setJoinError(null);
    setJoinSuccess(null);
    try {
      const res = await api.joinLabByKey(enrollmentKey);
      setJoinSuccess(res.message);
      setEnrollmentKey("");
      window.dispatchEvent(new CustomEvent("labnexus:labs-changed"));
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
        courseId: selectedCourseId || undefined,
        cohortId: selectedCohortId || undefined,
      });
      window.dispatchEvent(new CustomEvent("labnexus:labs-changed"));
      setLabTitle("");
      setLabCode("");
      setLabDesc("");
      setSelectedCourseId("");
      setSelectedCohortId("");
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
      { label: "Institution Overview", path: "/#overview", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "Department Metrics", path: "/#departments", icon: <FlaskConical className="w-4 h-4" /> },
      { label: "Laboratories", path: "/labs", icon: <FlaskConical className="w-4 h-4" /> },
      { label: "Examinations", path: "/examinations", icon: <CalendarCheck className="w-4 h-4" /> },
      { label: "Audit Logs", path: "/#audit", icon: <ShieldAlert className="w-4 h-4" /> }
      ,{ label: "Students", path: "/students", icon: <GraduationCap className="w-4 h-4" /> }
    );
  } else if (user?.role === "HOD") {
    navItems.push(
      { label: "Department Overview", path: "/#overview", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "Laboratories", path: "/labs", icon: <FlaskConical className="w-4 h-4" /> },
      { label: "Examinations", path: "/examinations", icon: <CalendarCheck className="w-4 h-4" /> },
      { label: "Faculty Directory", path: "/#faculty", icon: <Users className="w-4 h-4" /> }
      ,{ label: "Students", path: "/students", icon: <GraduationCap className="w-4 h-4" /> }
    );
  } else if (user?.role === "FACULTY") {
    navItems.push(
      { label: "Overview", path: "/#overview", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "MY LABS", path: "/labs", icon: <FlaskConical className="w-4 h-4" /> },
      { label: "Examinations", path: "/examinations", icon: <CalendarCheck className="w-4 h-4" /> }
    );
  } else {
    // Student
    navItems.push(
      { label: "Overview", path: "/#overview", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "My Exams", path: "/examinations", icon: <CalendarCheck className="w-4 h-4" /> },
      { label: "MY LABS", path: "/labs", icon: <FlaskConical className="w-4 h-4" /> }
    );
  }

  navItems.push({ label: "Developers", path: "/developer", icon: <Code2 className="w-4 h-4" /> });

  return (
    <>
      <aside className="portal-sidebar w-64 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 transition-all duration-300">
        <div className="space-y-6">
          {/* Action Button based on Role */}
          {user?.role === "STUDENT" ? (
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="portal-sidebar-action w-full py-3.5 flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 group"
            >
              <KeyRound className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-bold uppercase tracking-wider">Join Lab</span>
            </button>
          ) : user?.role === "FACULTY" ? (
            <button
              onClick={openCreateModal}
              className="portal-sidebar-action w-full py-3.5 flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 group"
            >
              <PlusCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-bold uppercase tracking-wider">Create Lab</span>
            </button>
          ) : null}

          {/* Nav List */}
          <div className="portal-sidebar-nav p-3">
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = location.pathname + location.hash === item.path;
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={`portal-nav-link flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                      isActive
                        ? "is-active"
                        : ""
                    }`}
                  >
                    <span className="portal-nav-icon transition-colors">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* System info footer */}
        <div className="portal-sidebar-footer p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest leading-none">LabNEXUS</p>
              <p className="text-[9px] font-bold text-indigo-100 uppercase tracking-tighter mt-1">Academic workspace</p>
            </div>
          </div>
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
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Enter the unique enrollment key provided by your faculty instructor (e.g. <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-indigo-600 dark:text-indigo-400 font-mono">DSALAB2026</code>).
          </p>
          {joinError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-400">
              {joinError}
            </div>
          )}
          {joinSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{joinSuccess}</span>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
              Enrollment Key
            </label>
            <input
              type="text"
              required
              placeholder="e.g. DSALAB2026"
              value={enrollmentKey}
              onChange={(e) => setEnrollmentKey(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white uppercase transition-all"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsJoinModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={joinLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-95"
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
        <form onSubmit={handleCreateLab} className="space-y-5">
          {createError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-400">
              {createError}
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
              Laboratory Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design & Analysis of Algorithms Lab"
              value={labTitle}
              onChange={(e) => setLabTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                Course Code
              </label>
              <input
                type="text"
                placeholder="e.g. CSBS-204"
                value={labCode}
                onChange={(e) => setLabCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                Primary Language *
              </label>
              <select
                value={labLang}
                onChange={(e) => setLabLang(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
              >
                <option value="C">C (GCC)</option>
                <option value="CPP">C++ (G++)</option>
                <option value="JAVA">Java (OpenJDK)</option>
                <option value="PYTHON">Python 3</option>
              </select>
            </div>
          </div>
          {academicOptionsError && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Academic links could not be loaded. The lab can still be created without them.</p>
          )}
          {academicOptions && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Course / Subject</label>
                <select
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                >
                  <option value="">No course linked</option>
                  {availableCourses.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Branch · Semester · Section</label>
                <select
                  value={selectedCohortId}
                  onChange={(event) => setSelectedCohortId(event.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                >
                  <option value="">No cohort linked</option>
                  {availableCohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.programCode} · Sem {cohort.semester} · Sec {cohort.section} · {cohort.academicYear.label}</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
              Description / Objectives
            </label>
            <textarea
              rows={3}
              placeholder="Course outline, syllabus coverage, and learning objectives..."
              value={labDesc}
              onChange={(e) => setLabDesc(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-95"
            >
              {createLoading ? "Creating..." : "Create Laboratory"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
