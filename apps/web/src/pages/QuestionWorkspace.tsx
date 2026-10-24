import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { api } from "../services/api";
import { Question, Submission, SupportedLanguage } from "../types";
import { Badge } from "../components/Badge";
import {
  Play,
  Send,
  RotateCcw,
  Clock,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Terminal,
  FileCode,
  ArrowLeft,
  Settings2,
  Copy,
  History,
} from "lucide-react";

export const QuestionWorkspace: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();

  const [question, setQuestion] = useState<Question | null>(null);
  const [sourceCode, setSourceCode] = useState<string>("");
  const [language, setLanguage] = useState<string>("PYTHON");
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [fontSize, setFontSize] = useState<number>(14);

  // Console State
  const [consoleTab, setConsoleTab] = useState<"output" | "customInput" | "verdict" | "history">("output");
  const [customInput, setCustomInput] = useState<string>("");
  const [runOutput, setRunOutput] = useState<{
    status: string;
    stdout: string;
    stderr: string;
    compileOutput?: string;
    executionTimeMs: number;
  } | null>(null);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null);
  const [historySubmissions, setHistorySubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadQuestion() {
      if (!questionId) return;
      try {
        const res = await api.getQuestionById(questionId);
        setQuestion(res.question);

        const lang = res.question.lab?.language || "C";
        setLanguage(lang);

        // Load starter code or default template
        if (res.question.starterCode) {
          setSourceCode(res.question.starterCode);
        } else {
          setSourceCode(getDefaultTemplate(lang));
        }

        // Load visible sample test input into custom input
        if (res.question.testCases && res.question.testCases.length > 0) {
          setCustomInput(res.question.testCases[0].input);
        }

        // Fetch submission history
        const hist = await api.getQuestionSubmissions(questionId).catch(() => ({ submissions: [] }));
        setHistorySubmissions(hist.submissions);
      } catch (err) {
        console.error("Failed to load question:", err);
      } finally {
        setLoading(false);
      }
    }
    loadQuestion();
  }, [questionId]);

  const getDefaultTemplate = (lang: string) => {
    switch (lang) {
      case "PYTHON":
        return `import sys\n\ndef main():\n    # Read input from standard input\n    input_data = sys.stdin.read().strip()\n    # Write your solution here:\n    print("Hello, MITS-DU!")\n\nif __name__ == "__main__":\n    main()\n`;
      case "C":
        return `#include <stdio.h>\n\nint main() {\n    // Write your C program here\n    printf("Hello, MITS-DU!\\n");\n    return 0;\n}\n`;
      case "CPP":
        return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ program here\n    cout << "Hello, MITS-DU!" << endl;\n    return 0;\n}\n`;
      case "JAVA":
        return `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Write your Java program here\n        System.out.println("Hello, MITS-DU!");\n    }\n}\n`;
      default:
        return "";
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (!sourceCode || sourceCode === getDefaultTemplate(language)) {
      setSourceCode(getDefaultTemplate(newLang));
    }
  };

  const handleResetCode = () => {
    if (confirm("Reset editor to starter template? Any unsaved edits will be lost.")) {
      if (question?.starterCode) {
        setSourceCode(question.starterCode);
      } else {
        setSourceCode(getDefaultTemplate(language));
      }
    }
  };

  const handleRunCode = async () => {
    if (!questionId) return;
    setIsRunning(true);
    setConsoleTab("output");
    try {
      const res = await api.runCode(questionId, sourceCode, language, customInput);
      setRunOutput(res);
    } catch (err: any) {
      setRunOutput({
        status: "INTERNAL_ERROR",
        stdout: "",
        stderr: err.message || "Failed to execute code",
        executionTimeMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleFormalSubmit = async () => {
    if (!questionId) return;
    setIsSubmitting(true);
    setConsoleTab("verdict");
    try {
      const res = await api.submitCode(questionId, sourceCode, language);
      setLastSubmission(res.submission);
      // Refresh history
      const hist = await api.getQuestionSubmissions(questionId).catch(() => ({ submissions: [] }));
      setHistorySubmissions(hist.submissions);
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMonacoLanguage = (lang: string) => {
    switch (lang) {
      case "PYTHON":
        return "python";
      case "C":
      case "CPP":
        return "cpp";
      case "JAVA":
        return "java";
      default:
        return "plaintext";
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading coding workspace...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="p-20 text-center bg-slate-50 dark:bg-slate-950 min-h-screen">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Question Unavailable</h2>
        <p className="text-slate-500 mt-2 font-medium">This session record could not be retrieved from the academic server.</p>
        <Link to="/" className="mt-8 inline-block px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl uppercase tracking-widest text-xs">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white dark:bg-slate-950 overflow-hidden">
      {/* Top Professional Header */}
      <div className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 shadow-2xl z-50">
        <div className="flex items-center gap-4">
          <Link
            to={question.labId ? `/labs/${question.labId}` : "/"}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-black text-lg text-white tracking-tighter uppercase">{question.title}</span>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                question.difficulty === "EASY"
                  ? "bg-emerald-950/50 text-emerald-400 border-emerald-900/50"
                  : question.difficulty === "MEDIUM"
                  ? "bg-amber-950/50 text-amber-400 border-amber-900/50"
                  : "bg-rose-950/50 text-rose-400 border-rose-900/50"
              }`}>
                {question.difficulty}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-950/50 text-indigo-400 border border-indigo-900/50">
                {question.marks} PTS
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                PRACTICE MODE
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
             <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-transparent text-slate-200 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="C">C (GCC)</option>
              <option value="CPP">C++ (G++)</option>
              <option value="PYTHON">Python 3</option>
              <option value="JAVA">Java</option>
            </select>
            <div className="w-[1px] h-4 bg-slate-800 mx-1" />
            <button
              onClick={() => setEditorTheme(editorTheme === "vs-dark" ? "light" : "vs-dark")}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Toggle Theme"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetCode}
              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
              title="Reset Code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400" title="An isolated execution service is not configured">Code execution unavailable</span>
            <button
              onClick={handleFormalSubmit}
              disabled={isRunning || isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Submitting..." : "Submit Solution"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Left Pane: Problem Description */}
        <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileCode className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Problem Statement</h2>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {question.description}
              </div>
            </div>

            {(question.inputFormat || question.outputFormat || question.constraints) && (
              <div className="space-y-4">
                {question.inputFormat && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">Input Specification</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">{question.inputFormat}</p>
                  </div>
                )}
                {question.outputFormat && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Output Specification</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">{question.outputFormat}</p>
                  </div>
                )}
                {question.constraints && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Constraints</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">{question.constraints}</p>
                  </div>
                )}
              </div>
            )}

            {/* Sample Test Cases */}
            {question.testCases && question.testCases.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sample Test Cases</h3>
                </div>
                {question.testCases.map((tc, idx) => (
                  <div key={tc.id || idx} className="portal-card overflow-hidden bg-white dark:bg-slate-900/80 border-slate-100 dark:border-slate-800">
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Case #{idx + 1}</span>
                      <button
                        onClick={() => setCustomInput(tc.input)}
                        className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                      >
                        <Copy className="w-3 h-3" /> Load Input
                      </button>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Input</div>
                          <pre className="p-2.5 bg-slate-950 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto border border-slate-800">{tc.input || "No input"}</pre>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Expected Output</div>
                          <pre className="p-2.5 bg-slate-950 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto border border-slate-800">{tc.expectedOutput}</pre>
                        </div>
                      </div>
                      {tc.explanation && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] text-slate-500 font-medium italic">
                            <span className="font-black uppercase not-italic mr-1">Note:</span> {tc.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Code Editor & Console */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          <div className="flex-1 bg-white dark:bg-slate-950 relative border-b border-slate-200 dark:border-slate-800">
            <Editor
              height="100%"
              language={getMonacoLanguage(language)}
              theme={editorTheme}
              value={sourceCode}
              onChange={(value) => setSourceCode(value || "")}
              options={{
                fontSize,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                fontFamily: "JetBrains Mono, monospace",
                automaticLayout: true,
                tabSize: 4,
                padding: { top: 20 },
                lineDecorationsWidth: 10,
                hideCursorInOverviewRuler: true,
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  useShadows: false,
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10
                }
              }}
            />
          </div>

          {/* Console Area */}
          <div className="h-72 flex flex-col bg-white dark:bg-slate-950 z-10">
            <div className="flex items-center justify-between px-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex gap-6">
                {[
                  { id: "output", icon: Terminal, label: "Terminal Output" },
                  { id: "customInput", icon: FileCode, label: "Custom Stdin" },
                  { id: "verdict", icon: CheckCircle2, label: "Evaluation" },
                  { id: "history", icon: History, label: "Past Attempts" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setConsoleTab(tab.id as any)}
                    className={`py-3.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${
                      consoleTab === tab.id
                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.id === 'verdict' && lastSubmission && (
                      <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[8px] font-black">
                        {lastSubmission.score}/{question.marks}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              {runOutput && consoleTab === "output" && (
                <div className="flex items-center gap-4">
                  <Badge status={runOutput.status} size="sm" />
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
                    <Clock className="w-3 h-3" />
                    {runOutput.executionTimeMs}ms
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-950 font-mono text-xs custom-scrollbar">
              {consoleTab === "output" && (
                <div className="space-y-4">
                  {isRunning ? (
                    <div className="flex items-center gap-3 text-slate-400 animate-pulse font-bold uppercase tracking-widest text-[10px]">
                      <Cpu className="w-4 h-4 animate-spin" />
                      Executing session in secure sandbox...
                    </div>
                  ) : runOutput ? (
                    <div className="space-y-4">
                      {runOutput.compileOutput && (
                        <div className="portal-card border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 overflow-hidden">
                          <div className="px-4 py-1.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest">Compilation Failure</div>
                          <pre className="p-4 text-rose-600 dark:text-rose-400 whitespace-pre-wrap leading-relaxed">{runOutput.compileOutput}</pre>
                        </div>
                      )}
                      {runOutput.stdout && (
                        <div className="portal-card border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
                          <div className="px-4 py-1.5 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest">Stdout</div>
                          <pre className="p-4 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{runOutput.stdout}</pre>
                        </div>
                      )}
                      {runOutput.stderr && !runOutput.compileOutput && (
                        <div className="portal-card border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 overflow-hidden">
                          <div className="px-4 py-1.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest">Runtime Error</div>
                          <pre className="p-4 text-rose-600 dark:text-rose-400 whitespace-pre-wrap leading-relaxed">{runOutput.stderr}</pre>
                        </div>
                      )}
                      {!runOutput.stdout && !runOutput.stderr && !runOutput.compileOutput && (
                        <div className="text-slate-400 italic text-[11px] font-medium text-center py-8">Process finished with exit code 0 (No output generated)</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-300 dark:text-slate-700">
                      <Terminal className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Code execution is unavailable</p>
                      <p className="text-[10px] text-center max-w-xs">You can save a submission now. Evaluation stays pending until an isolated runner is configured.</p>
                    </div>
                  )}
                </div>
              )}

              {consoleTab === "customInput" && (
                <div className="h-full">
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Provide standard input (stdin) for the practice session..."
                    className="w-full h-full bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all resize-none"
                  />
                </div>
              )}

              {consoleTab === "verdict" && (
                <div className="space-y-6">
                  {isSubmitting ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validating against hidden test suite...</p>
                    </div>
                  ) : lastSubmission ? (
                    <div className="space-y-6">
                      <div className="portal-card p-6 bg-indigo-600 text-white border-none shadow-xl shadow-indigo-600/20 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Badge status={lastSubmission.status} size="md" />
                          </div>
                          <div>
                            <h4 className="text-xl font-black tracking-tight leading-none mb-1">{lastSubmission.status === "PENDING" ? "Submitted — awaiting evaluation" : `Score: ${lastSubmission.score} / ${question.marks}`}</h4>
                            {lastSubmission.status !== "PENDING" && <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest opacity-80">Passed {lastSubmission.passedTests} of {lastSubmission.totalTests} test cases</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Submitted At</div>
                          <div className="text-xs font-bold">{new Date(lastSubmission.submittedAt).toLocaleTimeString()}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {lastSubmission.testResults?.map((tr, i) => (
                          <div
                            key={tr.id || i}
                            className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group transition-all hover:border-indigo-600/30"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tr.passed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'}`}>
                                {tr.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Test Case #{i + 1}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase">{tr.testCase.isHidden ? "Hidden Suite" : "Visible Suite"}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-400 font-mono">{tr.executionTimeMs || 0}ms</span>
                              <Badge status={tr.status} size="sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-300 dark:text-slate-700">
                      <Send className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Final submission required for grading</p>
                    </div>
                  )}
                </div>
              )}

              {consoleTab === "history" && (
                <div className="space-y-3">
                  {historySubmissions.length === 0 ? (
                    <div className="text-slate-400 italic text-[11px] font-medium text-center py-12">No previous attempts recorded for this question.</div>
                  ) : (
                    historySubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group hover:border-indigo-600/30 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <Badge status={sub.status} size="sm" />
                          <div>
                            <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{sub.score} Points Secured</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase">{sub.passedTests}/{sub.totalTests} Tests Passed</div>
                          </div>
                        </div>
                        <div className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(sub.submittedAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

