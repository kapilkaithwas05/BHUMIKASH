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

  if (loading) return <div className="p-8 text-center text-slate-500">Entering Examination Room...</div>;
  if (!examination) return <div className="p-8 text-center text-slate-500">Examination not found or not published.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-900 text-slate-100 overflow-hidden">
      {/* Assessment Header with Synchronized Timer */}
      <div className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to={`/labs/${examination.labId}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">{examination.title}</span>
              {examination.disableCopyPaste && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800">
                  <Lock className="w-3 h-3" /> Copy-Paste Guarded
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500">Total Marks: {examination.totalMarks} Points</span>
          </div>
        </div>

        {/* Live Synchronized Countdown Timer */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Remaining Time</span>
          </div>
          <Timer
            endTime={examination.endTime}
            serverTime={serverTime}
            onExpire={() => setIsExamEnded(true)}
          />
        </div>
      </div>

      {/* Copy-Paste Warning Toast */}
      {pasteWarning && (
        <div className="bg-rose-600 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 animate-in slide-in-from-top">
          <ShieldAlert className="w-4 h-4" />
          <span>Copy-paste is restricted during this examination session. Please type your solution manually.</span>
        </div>
      )}

      {/* Question Selector Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex space-x-2 py-2 overflow-x-auto">
          {examination.questions?.map((item, idx) => {
            const isSelected = idx === currentQIndex;
            const isSub = Boolean(submittedQuestions[item.question.id]);
            return (
              <button
                key={item.question.id}
                onClick={() => setCurrentQIndex(idx)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <span>Q{idx + 1}: {item.question.title}</span>
                {isSub && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCode}
            disabled={isRunning || isExamEnded}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test Run</span>
          </button>
          <button
            onClick={handleSubmitQuestion}
            disabled={isSubmitting || isExamEnded}
            className="flex items-center gap-1.5 px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Solution</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      {activeQuestion ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left: Problem Details */}
          <div className="lg:col-span-5 border-r border-slate-800 bg-slate-950 p-6 overflow-y-auto space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-100">{activeQuestion.title}</h2>
            <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">{activeQuestion.description}</div>

            {activeQuestion.inputFormat && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="font-bold text-indigo-400 block mb-1">Input Format:</span>
                <span className="font-mono text-slate-300">{activeQuestion.inputFormat}</span>
              </div>
            )}

            {activeQuestion.outputFormat && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="font-bold text-indigo-400 block mb-1">Output Format:</span>
                <span className="font-mono text-slate-300">{activeQuestion.outputFormat}</span>
              </div>
            )}

            {activeQuestion.constraints && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="font-bold text-amber-400 block mb-1">Constraints:</span>
                <span className="font-mono text-slate-300">{activeQuestion.constraints}</span>
              </div>
            )}

            {/* Test cases */}
            {activeQuestion.testCases && activeQuestion.testCases.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Sample Test Cases</span>
                {activeQuestion.testCases.map((tc, idx) => (
                  <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400">Sample #{idx + 1}</span>
                    <pre className="p-2 bg-slate-950 rounded font-mono text-slate-200">{tc.input}</pre>
                    <span className="text-[11px] text-slate-500 font-semibold block pt-1">Expected Output:</span>
                    <pre className="p-2 bg-slate-950 rounded font-mono text-emerald-400">{tc.expectedOutput}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Monaco Editor & Output */}
          <div className="lg:col-span-7 flex flex-col h-full bg-slate-900 overflow-hidden">
            <div className="flex-1 min-h-[300px] border-b border-slate-800">
              <Editor
                height="100%"
                language={language.toLowerCase() === "python" ? "python" : "cpp"}
                theme="vs-dark"
                value={codeMap[activeQuestion.id] || ""}
                onChange={handleCodeChange}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  fontFamily: "JetBrains Mono, monospace",
                  automaticLayout: true,
                  tabSize: 4,
                }}
              />
            </div>

            {/* Console Tabs */}
            <div className="h-56 flex flex-col bg-slate-950 font-mono text-xs">
              <div className="flex items-center space-x-4 border-b border-slate-800 px-4 bg-slate-900/80">
                <button
                  onClick={() => setConsoleTab("output")}
                  className={`py-2 text-xs font-semibold border-b-2 transition-colors ${
                    consoleTab === "output" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400"
                  }`}
                >
                  Execution Output
                </button>
                <button
                  onClick={() => setConsoleTab("verdict")}
                  className={`py-2 text-xs font-semibold border-b-2 transition-colors ${
                    consoleTab === "verdict" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400"
                  }`}
                >
                  Submission Status
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto">
                {consoleTab === "output" && (
                  <div>
                    {isRunning ? (
                      <span className="text-slate-500 animate-pulse">Running test execution...</span>
                    ) : runOutput ? (
                      <div className="space-y-2">
                        <Badge status={runOutput.status} />
                        {runOutput.stdout && <pre className="p-2 bg-slate-900 rounded">{runOutput.stdout}</pre>}
                        {runOutput.stderr && <pre className="p-2 bg-rose-950/40 text-rose-300 rounded">{runOutput.stderr}</pre>}
                      </div>
                    ) : (
                      <span className="text-slate-500">Run code to test against sample inputs.</span>
                    )}
                  </div>
                )}

                {consoleTab === "verdict" && (
                  <div>
                    {submittedQuestions[activeQuestion.id] ? (
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">
                            Score: {submittedQuestions[activeQuestion.id].score} / {activeQuestion.marks} Points
                          </span>
                          <Badge status={submittedQuestions[activeQuestion.id].status} />
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          Submitted at {new Date(submittedQuestions[activeQuestion.id].submittedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-500">Submit your solution when ready for final evaluation.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500">Select a question to begin.</div>
      )}
    </div>
  );
};
