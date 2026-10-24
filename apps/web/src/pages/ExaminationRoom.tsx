import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { api } from "../services/api";
import { Examination, Question } from "../types";
import { Timer } from "../components/Timer";
import { Badge } from "../components/Badge";
import {
  ShieldAlert,
  Play,
  Send,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Terminal,
  FileCode,
  Trophy,
  Clock,
} from "lucide-react";

export const ExaminationRoom: React.FC = () => {
  const { examinationId } = useParams<{ examinationId: string }>();
  const navigate = useNavigate();

  const [examination, setExamination] = useState<Examination | null>(null);
  const [serverTime, setServerTime] = useState<string>("");
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<string>("PYTHON");

  // Console State
  const [consoleTab, setConsoleTab] = useState<"output" | "customInput" | "verdict">("output");
  const [customInput, setCustomInput] = useState<string>("");
  const [runOutput, setRunOutput] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, any>>({});
  const [pasteWarning, setPasteWarning] = useState<boolean>(false);
  const [isExamEnded, setIsExamEnded] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExam() {
      if (!examinationId) return;
      try {
        const res = await api.getExaminationById(examinationId);
        setExamination(res.examination);
        setServerTime(res.serverTime);

        const defaultLang = res.examination.lab?.language || "C";
        setLanguage(defaultLang);

        // Load saved drafts or starter code
        const initialCodes: Record<string, string> = {};
        res.examination.questions?.forEach((item) => {
          const draftKey = `exam_draft_${examinationId}_${item.question.id}`;
          const savedDraft = localStorage.getItem(draftKey);
          initialCodes[item.question.id] = savedDraft || item.question.starterCode || "";
        });
        setCodeMap(initialCodes);
      } catch (err) {
        console.error("Exam load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [examinationId]);

  // Handle Copy-Paste Restrictions when configured on assessment
  useEffect(() => {
    if (!examination?.disableCopyPaste) return;

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setPasteWarning(true);
      setTimeout(() => setPasteWarning(false), 3000);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [examination?.disableCopyPaste]);

  const activeQuestion: Question | undefined =
    examination?.questions?.[currentQIndex]?.question;

  const handleCodeChange = (value: string | undefined) => {
    if (!activeQuestion) return;
    const newCode = value || "";
    setCodeMap((prev) => ({ ...prev, [activeQuestion.id]: newCode }));
    // Auto-save draft locally
    localStorage.setItem(`exam_draft_${examinationId}_${activeQuestion.id}`, newCode);
  };

  const handleRunCode = async () => {
    if (!activeQuestion) return;
    setIsRunning(true);
    setConsoleTab("output");
    try {
      const code = codeMap[activeQuestion.id] || "";
      const res = await api.runCode(activeQuestion.id, code, language, customInput);
      setRunOutput(res);
    } catch (err: any) {
      setRunOutput({
        status: "INTERNAL_ERROR",
        stdout: "",
        stderr: err.message,
        executionTimeMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!activeQuestion || !examinationId) return;
    if (!confirm(`Submit answer for "${activeQuestion.title}"? Your submission will be evaluated and scored.`)) {
      return;
    }
    setIsSubmitting(true);
    setConsoleTab("verdict");
    try {
      const code = codeMap[activeQuestion.id] || "";
      const res = await api.submitCode(activeQuestion.id, code, language, examinationId);
      setSubmittedQuestions((prev) => ({
        ...prev,
        [activeQuestion.id]: res.submission,
      }));
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-black text-slate-500 uppercase tracking-[0.3em]">Establishing Secure Session...</span>
    </div>
  );

  if (!examination) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-8 text-center">
      <AlertTriangle className="w-16 h-16 text-rose-500 mb-6" />
      <h2 className="text-3xl font-black text-white uppercase tracking-tight">Access Restricted</h2>
      <p className="text-slate-500 mt-2 max-w-md">This assessment is either unavailable, expired, or you do not have permission to enter.</p>
      <Link to="/" className="btn-primary mt-8 inline-flex">Return to Portal</Link>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Secure Header with MITS-DU Branding */}
      <div className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 shadow-2xl z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
              <span className="font-black text-lg text-white tracking-tighter uppercase">Assessment Room</span>
                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/50">
                  ACTIVE
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                {examination.title}
              </p>
            </div>
          </div>
        </div>

        {/* Live Synchronized Countdown Timer - Prominent MITS Style */}
        <div className="flex items-center gap-4 bg-slate-900/50 px-6 py-2 rounded-2xl border border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Session Closes In</p>
          </div>
          <div className="font-mono text-2xl font-black text-indigo-400 tracking-wider">
            <Timer
              endTime={examination.endTime}
              serverTime={serverTime}
              onExpire={() => setIsExamEnded(true)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:block text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase leading-none">MITS-DU Official</p>
            <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Academics Management</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Copy-Paste Warning Toast - Elegant Portal Style */}
      {pasteWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest py-3 px-8 rounded-2xl shadow-2xl shadow-rose-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <ShieldAlert className="w-4 h-4" />
          <span>Security Violation: Copy-Paste is strictly prohibited.</span>
        </div>
      )}

      {/* Workspace Controls */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {examination.questions?.map((item, idx) => {
            const isSelected = idx === currentQIndex;
            const isSub = Boolean(submittedQuestions[item.question.id]);
            return (
              <button
                key={item.question.id}
                onClick={() => setCurrentQIndex(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  isSelected
                    ? "bg-white text-indigo-600 shadow-lg shadow-indigo-500/10 scale-105"
                    : "bg-slate-800/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span>Q{idx + 1}</span>
                {isSub && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400" title="An isolated execution service is not configured">Execution unavailable</span>
          <button
            onClick={handleSubmitQuestion}
            disabled={isSubmitting || isExamEnded}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Final Submit</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      {activeQuestion ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left: Problem Details - Portal Style */}
          <div className="lg:col-span-4 border-r border-slate-800 bg-slate-950 p-8 overflow-y-auto space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Active Challenge</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{activeQuestion.marks} Points</span>
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{activeQuestion.title}</h2>
              <div className="h-1 w-12 bg-indigo-600 rounded-full" />
            </div>

            <div className="text-slate-400 text-sm font-medium leading-relaxed whitespace-pre-wrap font-sans">
              {activeQuestion.description}
            </div>

            <div className="space-y-4 pt-4">
              {activeQuestion.inputFormat && (
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Input Format</span>
                  <p className="font-mono text-[11px] text-slate-300 leading-relaxed">{activeQuestion.inputFormat}</p>
                </div>
              )}

              {activeQuestion.outputFormat && (
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Output Format</span>
                  <p className="font-mono text-[11px] text-slate-300 leading-relaxed">{activeQuestion.outputFormat}</p>
                </div>
              )}
            </div>

            {/* Test cases */}
            {activeQuestion.testCases && activeQuestion.testCases.length > 0 && (
              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Sample Test Cases</span>
                {activeQuestion.testCases.map((tc, idx) => (
                  <div key={idx} className="portal-card bg-slate-900/50 border-slate-800 p-5 space-y-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Input</span>
                      <pre className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-slate-200 border border-slate-800 overflow-x-auto">{tc.input || "No input required"}</pre>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Expected Output</span>
                      <pre className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-emerald-400 border border-emerald-900/30 overflow-x-auto">{tc.expectedOutput}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Monaco Editor & Output */}
          <div className="lg:col-span-8 flex flex-col h-full bg-slate-900 overflow-hidden">
            <div className="flex-1 min-h-[300px] border-b border-slate-800 relative">
              <div className="absolute top-4 right-6 z-10 flex items-center gap-2">
                <span className="px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg text-[9px] font-black text-indigo-400 uppercase tracking-widest border border-slate-800">
                  {language} RUNTIME
                </span>
              </div>
              <Editor
                height="100%"
                language={language.toLowerCase() === "python" ? "python" : "cpp"}
                theme="vs-dark"
                value={codeMap[activeQuestion.id] || ""}
                onChange={handleCodeChange}
                options={{
                  fontSize: 15,
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  fontFamily: "JetBrains Mono, monospace",
                  automaticLayout: true,
                  tabSize: 4,
                  padding: { top: 20 },
                  cursorStyle: "block",
                  smoothScrolling: true,
                }}
              />
            </div>

            {/* Console Tabs - Integrated Style */}
            <div className="h-64 flex flex-col bg-slate-950">
              <div className="flex items-center space-x-6 border-b border-slate-800 px-8 bg-slate-900/80">
                <button
                  onClick={() => setConsoleTab("output")}
                  className={`py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                    consoleTab === "output" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Dry Run Output</span>
                  </div>
                </button>
                <button
                  onClick={() => setConsoleTab("verdict")}
                  className={`py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                    consoleTab === "verdict" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Submission Status</span>
                  </div>
                </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto font-mono text-xs">
                {consoleTab === "output" && (
                  <div className="h-full">
                    {isRunning ? (
                      <div className="flex items-center gap-3 text-slate-500 animate-pulse">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Compiling and executing in sandboxed environment...</span>
                      </div>
                    ) : runOutput ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge status={runOutput.status} />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{runOutput.executionTimeMs}ms execution</span>
                        </div>
                        {runOutput.stdout && (
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">stdout</span>
                            <pre className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-slate-200 overflow-x-auto">{runOutput.stdout}</pre>
                          </div>
                        )}
                        {runOutput.stderr && (
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">stderr</span>
                            <pre className="p-4 bg-rose-950/20 text-rose-300 rounded-2xl border border-rose-900/30 overflow-x-auto">{runOutput.stderr}</pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                        <Play className="w-8 h-8 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Code execution is unavailable</span>
                      </div>
                    )}
                  </div>
                )}

                {consoleTab === "verdict" && (
                  <div className="h-full">
                    {isSubmitting ? (
                      <div className="flex items-center gap-3 text-slate-500 animate-pulse">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span>Evaluating submission against private test suite...</span>
                      </div>
                    ) : submittedQuestions[activeQuestion.id] ? (
                      <div className="portal-card bg-slate-900/50 border-slate-800 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                              <Trophy className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{submittedQuestions[activeQuestion.id].status === "PENDING" ? "Submission status" : "Final evaluation score"}</p>
                              <p className="text-2xl font-black text-white uppercase tracking-tighter">
                                {submittedQuestions[activeQuestion.id].status === "PENDING" ? "Submitted — awaiting evaluation" : `${submittedQuestions[activeQuestion.id].score} / ${activeQuestion.marks} Points`}
                              </p>
                            </div>
                          </div>
                          <Badge status={submittedQuestions[activeQuestion.id].status} size="md" />
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2">
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Submitted at {new Date(submittedQuestions[activeQuestion.id].submittedAt).toLocaleTimeString()}</span>
                          {submittedQuestions[activeQuestion.id].status !== "PENDING" && <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {submittedQuestions[activeQuestion.id].passedTests} tests passed</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                        <Send className="w-8 h-8 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No submission recorded for this challenge</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 bg-slate-950 text-slate-600 gap-4">
          <FileCode className="w-16 h-16 opacity-10" />
          <p className="text-sm font-black uppercase tracking-[0.3em]">Select a Challenge to Begin Assessment</p>
        </div>
      )}
    </div>
  );
};
