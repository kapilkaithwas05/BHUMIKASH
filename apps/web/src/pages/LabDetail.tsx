import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Lab, Question, Examination } from "../types";
import { Modal } from "../components/Modal";
import { Badge } from "../components/Badge";
import {
  FlaskConical,
  Plus,
  Users,
  Calendar,
  KeyRound,
  Copy,
  Check,
  FileSpreadsheet,
  ArrowRight,
  Code2,
  Trash2,
  Lock,
  Globe,
  Upload,
  AlertTriangle,
  Clock,
  TrendingUp,
} from "lucide-react";

type LabFacultyMember = { id: string; name: string; email: string; homeDepartment?: { name: string; code: string } | null };

export const LabDetail: React.FC = () => {
  const { labId } = useParams<{ labId: string }>();
  const { user } = useAuth();

  const isInstructor = user?.role === "FACULTY" || user?.role === "HOD" || user?.role === "VICE_CHANCELLOR";

  const [lab, setLab] = useState<Lab | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"questions" | "exams" | "students" | "faculty">("questions");
  const [assignedFaculty, setAssignedFaculty] = useState<LabFacultyMember[]>([]);
  const [facultyOptions, setFacultyOptions] = useState<LabFacultyMember[]>([]);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([]);
  const [savingFaculty, setSavingFaculty] = useState(false);
  const [loading, setLoading] = useState(true);

  // Key copied status
  const [keyCopied, setKeyCopied] = useState(false);

  // Modals
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Question Form State
  const [qTitle, setQTitle] = useState("");
  const [qContentType, setQContentType] = useState<"DAILY" | "PRACTICE">("PRACTICE");
  const [qPublished, setQPublished] = useState(true);
  const [qAvailableFrom, setQAvailableFrom] = useState("");
  const [qAvailableUntil, setQAvailableUntil] = useState("");
  const [qDesc, setQDesc] = useState("");
  const [qDiff, setQDiff] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");
  const [qMarks, setQMarks] = useState(10);
  const [qAttempts, setQAttempts] = useState<number | "">("");
  const [qStarter, setQStarter] = useState("");
  const [qTestCases, setQTestCases] = useState<
    { input: string; expectedOutput: string; isHidden: boolean; explanation?: string }[]
  >([
    { input: "", expectedOutput: "", isHidden: false, explanation: "Sample test case" },
    { input: "", expectedOutput: "", isHidden: true, explanation: "Hidden test case" },
  ]);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleMessage, setSampleMessage] = useState<string | null>(null);

  // Exam Form State
  const [examTitle, setExamTitle] = useState("");
  const [examDesc, setExamDesc] = useState("");
  const [examStart, setExamStart] = useState("");
  const [examEnd, setExamEnd] = useState("");
  const [examDuration, setExamDuration] = useState(60);
  const [examMarks, setExamMarks] = useState(50);
  const [examDisableCP, setExamDisableCP] = useState(true);
  const [examSelectedQs, setExamSelectedQs] = useState<string[]>([]);
  const [examLoading, setExamLoading] = useState(false);

  // Single Enroll State
  const [studentEmail, setStudentEmail] = useState("");
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null);

  // Bulk Upload State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkSummary, setBulkSummary] = useState<any | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchLabData = async () => {
    if (!labId) return;
    try {
      const [labRes, qRes, exRes] = await Promise.all([
        api.getLabById(labId),
        api.getLabQuestions(labId).catch(() => ({ questions: [] })),
        api.getLabExaminations(labId).catch(() => ({ examinations: [], serverTime: "" })),
      ]);
      setLab(labRes.lab);
      setQuestions(qRes.questions);
      setExaminations(exRes.examinations);

      if (isInstructor) {
        const stRes = await api.getEnrolledStudents(labId).catch(() => ({ totalStudents: 0, students: [] }));
        setStudents(stRes.students);
        const facultyRes = await api.getLabFaculty(labId).catch(() => ({ assignedFaculty: [], faculty: [] }));
        setAssignedFaculty(facultyRes.assignedFaculty);
        setFacultyOptions(facultyRes.faculty);
        setSelectedFacultyIds(facultyRes.assignedFaculty.map((member) => member.id));
      }
    } catch (err) {
      console.error("Load lab error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabData();
  }, [labId]);

  const handleCopyKey = () => {
    if (lab?.enrollmentKey) {
      navigator.clipboard.writeText(lab.enrollmentKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  const handleRegenerateKey = async () => {
    if (!labId) return;
    try {
      const res = await api.generateEnrollmentKey(labId);
      setLab((prev) => (prev ? { ...prev, enrollmentKey: res.enrollmentKey } : null));
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePublish = async () => {
    if (!labId || !lab) return;
    try {
      const res = await api.publishLab(labId, !lab.isPublished);
      setLab(res.lab);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labId) return;
    setQLoading(true);
    try {
      await api.createQuestion(labId, {
        title: qTitle,
        contentType: qContentType,
        isPublished: qPublished,
        availableFrom: qAvailableFrom ? new Date(qAvailableFrom).toISOString() : null,
        availableUntil: qAvailableUntil ? new Date(qAvailableUntil).toISOString() : null,
        description: qDesc,
        difficulty: qDiff,
        marks: qMarks,
        attemptsAllowed: qAttempts === "" ? null : Number(qAttempts),
        starterCode: qStarter,
        testCases: qTestCases.filter((tc) => tc.expectedOutput.trim() !== ""),
      });
      setIsQuestionModalOpen(false);
      setQTitle("");
      setQDesc("");
      setQError(null);
      setQContentType("PRACTICE");
      setQPublished(true);
      setQAvailableFrom("");
      setQAvailableUntil("");
      fetchLabData();
    } catch (err: any) {
      console.error(err);
      setQError(err?.message || "Could not create the question. Check the details and try again.");
    } finally {
      setQLoading(false);
    }
  };

  const handleAddSampleQuestions = async () => {
    if (!labId) return;
    setSampleLoading(true);
    setSampleMessage(null);
    try {
      const result = await api.createSampleQuestions(labId);
      setSampleMessage(result.createdCount
        ? `Added ${result.createdCount} starter practice question${result.createdCount === 1 ? "" : "s"}.`
        : "The starter practice set is already in this lab.");
      await fetchLabData();
    } catch (error: any) {
      setSampleMessage(error?.message || "Could not add the starter questions.");
    } finally {
      setSampleLoading(false);
    }
  };

  const handleArchiveLab = async () => {
    if (!labId) return;
    setIsArchiving(true);
    try {
      const result = await api.archiveLab(labId);
      setLab(result.lab);
      setIsDeleteModalOpen(false);
      window.dispatchEvent(new Event("labnexus:labs-changed"));
    } catch (error: any) {
      alert(error?.message || "Could not archive this laboratory.");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreLab = async () => {
    if (!labId) return;
    setIsRestoring(true);
    try {
      const result = await api.restoreLab(labId);
      setLab(result.lab);
      window.dispatchEvent(new Event("labnexus:labs-changed"));
    } catch (error: any) {
      alert(error?.message || "Could not restore this laboratory.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labId) return;
    setExamLoading(true);
    try {
      await api.createExamination(labId, {
        title: examTitle,
        description: examDesc,
        startTime: new Date(examStart).toISOString(),
        endTime: new Date(examEnd).toISOString(),
        durationMinutes: examDuration,
        totalMarks: examMarks,
        disableCopyPaste: examDisableCP,
        isPublished: true,
        questionIds: examSelectedQs,
      });
      setIsExamModalOpen(false);
      setExamTitle("");
      fetchLabData();
    } catch (err) {
      console.error(err);
    } finally {
      setExamLoading(false);
    }
  };

  const handleEnrollSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labId) return;
    try {
      await api.enrollStudent(labId, studentEmail);
      setEnrollMsg(`Student ${studentEmail} enrolled successfully`);
      setStudentEmail("");
      fetchLabData();
      setTimeout(() => {
        setIsEnrollModalOpen(false);
        setEnrollMsg(null);
      }, 1500);
    } catch (err: any) {
      setEnrollMsg(err.message || "Enrollment failed");
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labId || !bulkFile) return;
    setBulkLoading(true);
    try {
      const res = await api.bulkEnrollStudents(labId, bulkFile);
      setBulkSummary(res.summary);
      fetchLabData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const canEditFacultyTeam = user?.role === "HOD" || (user?.role === "FACULTY" && lab?.createdById === user.id);
  const handleSaveFacultyTeam = async () => {
    if (!labId) return;
    setSavingFaculty(true);
    try {
      const result = await api.updateLabFaculty(labId, selectedFacultyIds);
      setAssignedFaculty(result.assignedFaculty);
      alert(result.message);
    } catch (error: any) {
      alert(error.message || "Could not update the teaching team");
    } finally {
      setSavingFaculty(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Synchronizing Lab Data...</span>
    </div>
  );

  if (!lab) return (
    <div className="portal-card p-12 text-center">
      <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
      <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase">Laboratory Not Found</h2>
      <p className="text-slate-500 mt-2">The laboratory you are looking for might have been moved or deleted.</p>
      <Link to="/" className="btn-primary mt-6 inline-flex">Back to Dashboard</Link>
    </div>
  );

  const academicContext = [
    lab.cohort?.program?.code,
    lab.cohort ? `Semester ${lab.cohort.semester}` : null,
    lab.cohort?.section ? `Section ${lab.cohort.section}` : null,
    lab.cohort?.academicYear?.label,
    lab.course?.code,
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Dynamic Breadcrumb-style Header */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
        <Link to="/" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-indigo-600 dark:text-indigo-400">{lab.code || "Lab"}</span>
      </div>

      {/* Modern Lab Banner */}
      <div className="portal-card relative overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/5 rounded-full -ml-32 -mb-32 blur-3xl" />
        
        <div className="relative p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                {lab.language}
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest ring-1 ring-slate-200 dark:ring-slate-700">
                {lab.code || "Course Lab"}
              </span>
              {lab.isPublished ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest ring-1 ring-emerald-200 dark:ring-emerald-800">
                  <Globe className="w-3 h-3" /> Live & Published
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest ring-1 ring-amber-200 dark:ring-amber-800">
                  <Lock className="w-3 h-3" /> Internal Draft
                </span>
              )}
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-[0.9]">
              {lab.title}
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed">
              {lab.description || "Master core concepts through practical hands-on laboratory sessions."}
            </p>
            {academicContext && <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{academicContext}</p>}
          </div>

          {/* Instructor Quick Actions */}
          {isInstructor && (
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 w-full sm:w-auto">
              {lab.archivedAt ? (
                <div className="space-y-2">
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">This lab is archived. Its submissions and records are preserved.</p>
                  <button onClick={handleRestoreLab} disabled={isRestoring} className="w-full rounded-2xl bg-emerald-600 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white disabled:opacity-50">
                    {isRestoring ? "Restoring…" : "Restore Lab"}
                  </button>
                </div>
              ) : <>
                <button
                  onClick={handleTogglePublish}
                  className={`w-full px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                    lab.isPublished
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20"
                  }`}
                >
                  {lab.isPublished ? "Unpublish Lab" : "Publish to Students"}
                </button>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => { setQError(null); setIsQuestionModalOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Add Question
                  </button>
                  <button
                    onClick={() => setIsExamModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                  >
                    <Calendar className="w-4 h-4" /> Schedule Exam
                  </button>
                </div>
                {user && (user.role !== "FACULTY" || lab.createdById === user.id) ? (
                  <button onClick={() => setIsDeleteModalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30">
                    <Trash2 className="w-4 h-4" /> Delete Lab
                  </button>
                ) : null}
              </>}
            </div>
          )}
        </div>

        {/* Enrollment Key Banner for Faculty */}
        {isInstructor && (
          <div className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Student Enrollment Key
                </span>
                <div className="font-mono text-2xl font-black text-slate-900 dark:text-white tracking-[0.2em] mt-0.5">
                  {lab.enrollmentKey || "NOT_SET"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-center">
              <button
                onClick={handleCopyKey}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-sm transition-all active:scale-95"
              >
                {keyCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {keyCopied ? "COPIED" : "COPY KEY"}
              </button>
              <button
                onClick={handleRegenerateKey}
                className="px-4 py-2.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-wider transition-colors"
              >
                Regenerate
              </button>
              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block" />
              <button
                onClick={() => setIsEnrollModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
              >
                Direct Enroll
              </button>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" /> Bulk Upload
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs - Modern Portal Style */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl w-fit border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("questions")}
          className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
            activeTab === "questions"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-slate-200/50 dark:shadow-none"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Questions ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab("exams")}
          className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
            activeTab === "exams"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-slate-200/50 dark:shadow-none"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Assessments ({examinations.length})
        </button>
        {isInstructor && (
          <button
            onClick={() => setActiveTab("students")}
            className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === "students"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-slate-200/50 dark:shadow-none"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Students enrolled ({students.length})
          </button>
        )}
        {isInstructor && (
          <button
            onClick={() => setActiveTab("faculty")}
            className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === "faculty"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-slate-200/50 dark:shadow-none"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Teaching team ({assignedFaculty.length})
          </button>
        )}
      </div>

      {/* Content Areas */}
      <div className="min-h-[400px]">
        {/* Tab 1: Questions Grid */}
        {activeTab === "questions" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questions.length === 0 ? (
              <div className="col-span-full portal-card py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent">
                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-800">
                  <Code2 className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Empty Question Bank</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                  {isInstructor ? "Kickstart the learning by adding your first coding challenge." : "Your instructor hasn't published any questions yet."}
                </p>
                {isInstructor && (
                  <div className="mt-6 flex flex-col items-center gap-3">
                    <div className="flex flex-wrap justify-center gap-3">
                      <button onClick={() => { setQError(null); setIsQuestionModalOpen(true); }} className="btn-primary inline-flex">Add New Question</button>
                      <button onClick={handleAddSampleQuestions} disabled={sampleLoading || Boolean(lab.archivedAt)} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-xs font-black uppercase tracking-wider text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                        <Code2 className="h-4 w-4" /> {sampleLoading ? "Adding Questions…" : "Add Starter Questions"}
                      </button>
                    </div>
                    {sampleMessage && <p role="status" className="text-xs font-semibold text-slate-600">{sampleMessage}</p>}
                  </div>
                )}
              </div>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="portal-card group hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question #{idx + 1}</span>
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                          q.difficulty === "EASY"
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                            : q.difficulty === "MEDIUM"
                            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                            : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                      {q.contentType === "DAILY" ? "Daily lab question" : "Practice question"}{isInstructor ? ` · ${q.isPublished ? "Published" : "Draft"}` : ""}
                    </p>
                    
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-none group-hover:text-indigo-600 transition-colors">
                      {q.title}
                    </h3>
                    
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium line-clamp-2">
                      {q.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" /> {q.marks} Pts
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        <Clock className="w-3 h-3" /> {q.timeLimitMs}ms
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <Link
                      to={`/questions/${q.id}`}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                      Solve Question <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Examinations Grid */}
        {activeTab === "exams" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {examinations.length === 0 ? (
              <div className="col-span-full portal-card py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">No Assessments</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                  Stay tuned for scheduled practical exams and performance evaluations.
                </p>
              </div>
            ) : (
              examinations.map((exam) => (
                <div key={exam.id} className="portal-card group hover:shadow-2xl transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    {exam.disableCopyPaste && (
                      <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400" title="Security Active">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest ring-1 ring-indigo-200 dark:ring-indigo-800">
                        {exam.durationMinutes} MINS
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest ring-1 ring-slate-200 dark:ring-slate-700">
                        {exam.totalMarks} PTS TOTAL
                      </span>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none group-hover:text-indigo-600 transition-colors">
                      {exam.title}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Starts</p>
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase">{new Date(exam.startTime).toLocaleDateString()} {new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ends</p>
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase">{new Date(exam.endTime).toLocaleDateString()} {new Date(exam.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic">
                      {exam.description || "Official assessment for course completion."}
                    </p>
                  </div>

                  <div className="mt-8 flex items-center gap-3">
                    {isInstructor ? (
                      <Link
                        to={`/examinations/${exam.id}/results`}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                      >
                        Grade Analytics <TrendingUp className="w-4 h-4" />
                      </Link>
                    ) : (
                      <Link
                        to={`/examinations/${exam.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                      >
                        Enter Assessment <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "faculty" && isInstructor && (
          <div className="portal-card space-y-5 border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Teaching team</h3>
                <p className="mt-1 text-sm text-slate-500">Faculty can be assigned across departments. Student enrollment remains specific to this lab.</p>
              </div>
              {canEditFacultyTeam && <button onClick={handleSaveFacultyTeam} disabled={savingFaculty} className="btn-primary disabled:opacity-50">{savingFaculty ? "Saving…" : "Save teaching team"}</button>}
            </div>
            {facultyOptions.length === 0 ? <p className="text-sm text-slate-500">No active faculty profiles are available to assign.</p> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {facultyOptions.map((member) => {
                  const assigned = selectedFacultyIds.includes(member.id);
                  return <label key={member.id} className={`flex items-start gap-3 rounded-xl border p-4 ${canEditFacultyTeam ? "cursor-pointer" : "cursor-default"} ${assigned ? "border-indigo-300 bg-indigo-50/70 dark:border-indigo-800 dark:bg-indigo-950/30" : "border-slate-200 dark:border-slate-800"}`}>
                    <input type="checkbox" checked={assigned} disabled={!canEditFacultyTeam} onChange={(event) => setSelectedFacultyIds((current) => event.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))} className="mt-1 rounded text-indigo-600" />
                    <span className="min-w-0"><strong className="block text-sm text-slate-900 dark:text-white">{member.name}</strong><span className="block text-xs text-slate-500">{member.email}</span><span className="block text-xs text-slate-500">Home department: {member.homeDepartment?.code || member.homeDepartment?.name || "Not assigned"}</span></span>
                  </label>;
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Student Roster */}
        {activeTab === "students" && isInstructor && (
          <div className="portal-card p-0 border-none overflow-hidden bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Students enrolled</h3>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Academic Session 2026-27</p>
              </div>
              <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest shadow-sm">
                {students.length} Enrolled
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 dark:border-slate-800">
                    <th className="py-4 px-8">Full Name</th>
                    <th className="py-4 px-8">Roll Number</th>
                    <th className="py-4 px-8">Branch</th>
                    <th className="py-4 px-8">Section</th>
                    <th className="py-4 px-8">Semester</th>
                    <th className="py-4 px-8">Institutional Email</th>
                    <th className="py-4 px-8">Status</th>
                    <th className="py-4 px-8 text-right">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-black text-xs group-hover:from-indigo-600 group-hover:to-violet-600 group-hover:text-white transition-all">
                            {st.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wide">{st.name}</span>
                        </div>
                      </td>
                      <td className="py-5 px-8 font-mono text-xs tracking-widest text-slate-500 dark:text-slate-400">{st.rollNumber || "NOT_ASSIGNED"}</td>
                      <td className="py-5 px-8 text-xs text-slate-500 dark:text-slate-400">{st.studentProfile?.program?.code || st.studentProfile?.program?.name || "—"}</td>
                      <td className="py-5 px-8 text-xs text-slate-500 dark:text-slate-400">{st.studentProfile?.cohort?.section || "—"}</td>
                      <td className="py-5 px-8 text-xs text-slate-500 dark:text-slate-400">{st.studentProfile?.cohort?.semester ?? "—"}</td>
                      <td className="py-5 px-8 text-xs font-medium text-slate-500 dark:text-slate-400">{st.email}</td>
                      <td className="py-5 px-8">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest ring-1 ring-emerald-200 dark:ring-emerald-800">
                          Active
                        </span>
                      </td>
                      <td className="py-5 px-8 text-right">
                        <button
                          onClick={async () => {
                            if (confirm(`Remove ${st.name} from this laboratory roster?`)) {
                              await api.removeStudent(labId!, st.id);
                              fetchLabData();
                            }
                          }}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isArchiving && setIsDeleteModalOpen(false)}
        title="Delete laboratory?"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            “{lab.title}” will be removed from the student workspace and unpublished. Its questions, enrollments, and submissions will be kept so you can restore the lab later.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} disabled={isArchiving} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={handleArchiveLab} disabled={isArchiving} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">
              {isArchiving ? "Archiving…" : "Delete Lab"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Question Modal */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        title="Add Programming Question"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateQuestion} className="space-y-4">
          {qError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{qError}</p>}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Question Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Invert Binary Tree"
              value={qTitle}
              onChange={(e) => setQTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Content type</label>
              <select value={qContentType} onChange={(event) => setQContentType(event.target.value as "DAILY" | "PRACTICE")} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="PRACTICE">Practice question</option>
                <option value="DAILY">Daily lab question</option>
              </select>
            </div>
            <label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <input type="checkbox" checked={qPublished} onChange={(event) => setQPublished(event.target.checked)} />
              Publish to enrolled students
            </label>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Available from (optional)</label>
              <input type="datetime-local" value={qAvailableFrom} onChange={(event) => setQAvailableFrom(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Available until (optional)</label>
              <input type="datetime-local" value={qAvailableUntil} onChange={(event) => setQAvailableUntil(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty</label>
              <select
                value={qDiff}
                onChange={(e) => setQDiff(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Marks</label>
              <input
                type="number"
                value={qMarks}
                onChange={(e) => setQMarks(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attempts Allowed
              </label>
              <input
                type="number"
                min={1}
                placeholder="Unlimited"
                value={qAttempts}
                onChange={(e) =>
                  setQAttempts(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Problem Description (Markdown supported) *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Detailed description, problem specifications, input/output formats, and constraints..."
              value={qDesc}
              onChange={(e) => setQDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Starter Code Template (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="// Language starter scaffold"
              value={qStarter}
              onChange={(e) => setQStarter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
          </div>

          {/* Test Cases Editor */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">Automated Evaluation Test Cases</label>
              <button
                type="button"
                onClick={() =>
                  setQTestCases([
                    ...qTestCases,
                    { input: "", expectedOutput: "", isHidden: true, explanation: "" },
                  ])
                }
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                + Add Test Case
              </button>
            </div>

            <div className="space-y-3">
              {qTestCases.map((tc, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Test Case #{i + 1}</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tc.isHidden}
                        onChange={(e) => {
                          const updated = [...qTestCases];
                          updated[i].isHidden = e.target.checked;
                          setQTestCases(updated);
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-medium text-slate-600">Hidden from Student</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <textarea
                      rows={2}
                      placeholder="Input (stdin)"
                      value={tc.input}
                      onChange={(e) => {
                        const updated = [...qTestCases];
                        updated[i].input = e.target.value;
                        setQTestCases(updated);
                      }}
                      className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                    />
                    <textarea
                      rows={2}
                      placeholder="Expected Output (stdout)"
                      value={tc.expectedOutput}
                      onChange={(e) => {
                        const updated = [...qTestCases];
                        updated[i].expectedOutput = e.target.value;
                        setQTestCases(updated);
                      }}
                      className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsQuestionModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={qLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              {qLoading ? "Saving Question..." : "Create Question"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Exam Modal */}
      <Modal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        title="Schedule Practical Examination"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. End-Semester Practical Coding Exam"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Window *</label>
              <input
                type="datetime-local"
                required
                value={examStart}
                onChange={(e) => setExamStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Window *</label>
              <input
                type="datetime-local"
                required
                value={examEnd}
                onChange={(e) => setExamEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Minutes) *</label>
              <input
                type="number"
                value={examDuration}
                onChange={(e) => setExamDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Marks</label>
              <input
                type="number"
                value={examMarks}
                onChange={(e) => setExamMarks(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={examDisableCP}
                onChange={(e) => setExamDisableCP(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="text-xs font-semibold text-indigo-900">
                Enable Copy-Paste Restrictions in Student Editor
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Include Questions</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2">
              {questions.map((q) => (
                <label key={q.id} className="flex items-center gap-2 text-xs text-slate-700 p-1.5 hover:bg-slate-50 rounded">
                  <input
                    type="checkbox"
                    checked={examSelectedQs.includes(q.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExamSelectedQs([...examSelectedQs, q.id]);
                      } else {
                        setExamSelectedQs(examSelectedQs.filter((id) => id !== q.id));
                      }
                    }}
                    className="rounded text-indigo-600"
                  />
                  <span>{q.title} ({q.marks} pts)</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsExamModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={examLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              {examLoading ? "Scheduling..." : "Publish Assessment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Single Student Enroll Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title="Enroll Student by Email"
        maxWidth="md"
      >
        <form onSubmit={handleEnrollSingle} className="space-y-4">
          {enrollMsg && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800">
              {enrollMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Student College Email ID *</label>
            <input
              type="email"
              required
              pattern="[^\s@]+@mitsgwl\.ac\.in"
              title="Use a student email ending in @mitsgwl.ac.in"
              placeholder="25cb1bh42@mitsgwl.ac.in"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">Student IDs may vary before @; all college IDs use @mitsgwl.ac.in.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(false)}
              className="px-3 py-2 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              Enroll Student
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Roster CSV/Excel Upload Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Student Roster Import"
        maxWidth="lg"
      >
        <form onSubmit={handleBulkUpload} className="space-y-4">
          <p className="text-xs text-slate-500">
            Upload a <strong>.CSV</strong> or <strong>.XLSX</strong> spreadsheet containing student college email IDs ending in <strong>@mitsgwl.ac.in</strong>.
            The system will automatically validate format, prevent duplicate enrollments, and report unrecognized records.
          </p>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <input
              type="file"
              accept=".csv, .xlsx"
              required
              onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {bulkSummary && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
              <div className="font-bold text-slate-800">Bulk Import Results:</div>
              <div className="text-emerald-700 font-semibold">
                ✓ Successfully Enrolled: {bulkSummary.enrolled?.length || 0}
              </div>
              <div className="text-amber-700">
                • Already Enrolled: {bulkSummary.alreadyEnrolled?.length || 0}
              </div>
              {bulkSummary.unknownStudents?.length > 0 && (
                <div className="text-rose-700">
                  ✗ Unknown/Unregistered Emails ({bulkSummary.unknownStudents.length}): {bulkSummary.unknownStudents.join(", ")}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
              className="px-3 py-2 text-xs font-medium text-slate-600"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={bulkLoading || !bulkFile}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              {bulkLoading ? "Processing File..." : "Process Roster File"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
