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
} from "lucide-react";

export const LabDetail: React.FC = () => {
  const { labId } = useParams<{ labId: string }>();
  const { user } = useAuth();

  const isInstructor = user?.role === "FACULTY" || user?.role === "HOD" || user?.role === "VICE_CHANCELLOR";

  const [lab, setLab] = useState<Lab | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"questions" | "exams" | "students" | "ams">("questions");
  const [loading, setLoading] = useState(true);

  // Key copied status
  const [keyCopied, setKeyCopied] = useState(false);

  // Modals
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Question Form State
  const [qTitle, setQTitle] = useState("");
  const [qDesc, setQDesc] = useState("");
  const [qDiff, setQDiff] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");
  const [qMarks, setQMarks] = useState(10);
  const [qStarter, setQStarter] = useState("");
  const [qTestCases, setQTestCases] = useState<
    { input: string; expectedOutput: string; isHidden: boolean; explanation?: string }[]
  >([
    { input: "", expectedOutput: "", isHidden: false, explanation: "Sample test case" },
    { input: "", expectedOutput: "", isHidden: true, explanation: "Hidden test case" },
  ]);
  const [qLoading, setQLoading] = useState(false);

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
        description: qDesc,
        difficulty: qDiff,
        marks: qMarks,
        starterCode: qStarter,
        testCases: qTestCases.filter((tc) => tc.expectedOutput.trim() !== ""),
      });
      setIsQuestionModalOpen(false);
      setQTitle("");
      setQDesc("");
      fetchLabData();
    } catch (err) {
      console.error(err);
    } finally {
      setQLoading(false);
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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading laboratory details...</div>;
  if (!lab) return <div className="p-8 text-center text-slate-500">Laboratory not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {lab.language}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {lab.code || "Lab"}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  lab.isPublished ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {lab.isPublished ? "Published" : "Draft (Unpublished)"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{lab.title}</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">{lab.description || "No description provided."}</p>
          </div>

          {/* Action buttons for Faculty */}
          {isInstructor && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleTogglePublish}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  lab.isPublished
                    ? "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {lab.isPublished ? "Unpublish Lab" : "Publish Lab to Students"}
              </button>

              <button
                onClick={() => setIsQuestionModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>

              <button
                onClick={() => setIsExamModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Calendar className="w-4 h-4" /> Schedule Exam
              </button>
            </div>
          )}
        </div>

        {/* Enrollment Key Banner for Faculty */}
        {isInstructor && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Student Enrollment Key
                </span>
                <div className="font-mono text-base font-bold text-slate-900 tracking-wider">
                  {lab.enrollmentKey || "No Key Generated"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyKey}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 shadow-xs transition-colors"
              >
                {keyCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {keyCopied ? "Copied Key" : "Copy Key"}
              </button>
              <button
                onClick={handleRegenerateKey}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={() => setIsEnrollModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Enroll Email
              </button>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Bulk CSV/Excel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("questions")}
            className={`py-3 px-1 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === "questions"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Programming Questions ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab("exams")}
            className={`py-3 px-1 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === "exams"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Examinations & Assessments ({examinations.length})
          </button>
          {isInstructor && (
            <button
              onClick={() => setActiveTab("students")}
              className={`py-3 px-1 font-semibold text-sm border-b-2 transition-colors ${
                activeTab === "students"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Enrolled Students ({students.length})
            </button>
          )}
        </nav>
      </div>

      {/* Tab 1: Questions */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <Code2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">No programming questions added yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {isInstructor ? "Add the first coding challenge with sample and hidden test cases." : "Check back once your instructor publishes questions."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <h3 className="font-bold text-base text-slate-900">{q.title}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          q.difficulty === "EASY"
                            ? "bg-emerald-50 text-emerald-700"
                            : q.difficulty === "MEDIUM"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">{q.description}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                      <span>Marks: <strong>{q.marks}</strong></span>
                      <span>•</span>
                      <span>Time Limit: <strong>{q.timeLimitMs}ms</strong></span>
                      {isInstructor && (
                        <>
                          <span>•</span>
                          <span>Test cases: <strong>{q.totalTestCasesCount || q.testCases?.length || 0}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/questions/${q.id}`}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <span>Solve in Monaco</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Examinations */}
      {activeTab === "exams" && (
        <div className="space-y-4">
          {examinations.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">No examinations scheduled yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {isInstructor ? "Schedule practical coding assessments with timers and copy-paste deterrents." : "No upcoming examinations announced."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {examinations.map((exam) => (
                <div key={exam.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {exam.durationMinutes} Mins Duration
                      </span>
                      {exam.disableCopyPaste && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <Lock className="w-3 h-3 text-slate-400" /> Copy-Paste Guarded
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base text-slate-900 mt-2">{exam.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exam.description}</p>
                    <div className="mt-3 text-xs text-slate-600 space-y-1">
                      <div>Start: {new Date(exam.startTime).toLocaleString()}</div>
                      <div>End: {new Date(exam.endTime).toLocaleString()}</div>
                      <div>Total Marks: <strong>{exam.totalMarks}</strong></div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {isInstructor ? (
                      <Link
                        to={`/examinations/${exam.id}/results`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        View Grade Summary <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        to={`/examinations/${exam.id}`}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                      >
                        Enter Examination Room
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Enrolled Students */}
      {activeTab === "students" && isInstructor && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Enrolled Student Roster</h3>
            <span className="text-xs text-slate-500 font-semibold">{students.length} Total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-6">Roll Number</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6">Enrolled At</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">{st.name}</td>
                    <td className="py-3.5 px-6 font-mono text-xs">{st.rollNumber || "—"}</td>
                    <td className="py-3.5 px-6 text-slate-500">{st.email}</td>
                    <td className="py-3.5 px-6 text-xs text-slate-400">
                      {new Date(st.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={async () => {
                          if (confirm(`Remove ${st.name} from this lab?`)) {
                            await api.removeStudent(labId!, st.id);
                            fetchLabData();
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
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

      {/* Create Question Modal */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        title="Add Programming Question"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateQuestion} className="space-y-4">
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Student University Email *</label>
            <input
              type="email"
              required
              placeholder="csbs.student01@mitsgwl.ac.in"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
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
            Upload a <strong>.CSV</strong> or <strong>.XLSX</strong> spreadsheet containing student email addresses.
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
