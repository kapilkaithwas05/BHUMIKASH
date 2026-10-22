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
        return `import sys\n\ndef main():\n    # Read input from standard input\n    input_data = sys.stdin.read().strip()\n    # Write your solution here:\n    print("Hello, LabNEXUS!")\n\nif __name__ == "__main__":\n    main()\n`;
      case "C":
        return `#include <stdio.h>\n\nint main() {\n    // Write your C program here\n    printf("Hello, LabNEXUS!\\n");\n    return 0;\n}\n`;
      case "CPP":
        return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ program here\n    cout << "Hello, LabNEXUS!" << endl;\n    return 0;\n}\n`;
      case "JAVA":
        return `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Write your Java program here\n        System.out.println("Hello, LabNEXUS!");\n    }\n}\n`;
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
    return <div className="h-[80vh] flex items-center justify-center text-slate-500">Loading coding environment...</div>;
  }

  if (!question) {
    return <div className="p-8 text-center text-slate-500">Question not found.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Action Bar */}
      <div className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to={question.labId ? `/labs/${question.labId}` : "/"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Back to Laboratory"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-100">{question.title}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                question.difficulty === "EASY"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : question.difficulty === "MEDIUM"
                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                  : "bg-rose-950 text-rose-400 border border-rose-800"
              }`}
            >
              {question.difficulty}
            </span>
            <span className="text-xs text-slate-400 font-semibold">{question.marks} Points</span>
          </div>
        </div>

        {/* Editor Controls & Buttons */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-slate-900 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="C">C (GCC)</option>
            <option value="CPP">C++ (G++)</option>
            <option value="PYTHON">Python 3</option>
            <option value="JAVA">Java</option>
          </select>

          {/* Theme & Settings */}
          <button
            onClick={() => setEditorTheme(editorTheme === "vs-dark" ? "light" : "vs-dark")}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 text-xs flex items-center gap-1 border border-slate-800"
            title="Toggle theme"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{editorTheme === "vs-dark" ? "Dark" : "Light"}</span>
          </button>

          <button
            onClick={handleResetCode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 text-xs flex items-center gap-1 border border-slate-800"
            title="Reset code template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 disabled:opacity-50 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isRunning ? "Compiling..." : "Run Code"}</span>
          </button>

          {/* Submit Solution Button */}
          <button
            onClick={handleFormalSubmit}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "Evaluating..." : "Submit Solution"}</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Pane: Problem Description (5 cols) */}
        <div className="lg:col-span-5 border-r border-slate-800 bg-slate-950 p-6 overflow-y-auto space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Problem Statement</h2>
            <div className="mt-3 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {question.description}
            </div>
          </div>

          {question.inputFormat && (
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Input Specification</h3>
              <p className="text-xs text-slate-300 font-mono">{question.inputFormat}</p>
            </div>
          )}

          {question.outputFormat && (
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Output Specification</h3>
              <p className="text-xs text-slate-300 font-mono">{question.outputFormat}</p>
            </div>
          )}

          {question.constraints && (
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Constraints & Limits</h3>
              <p className="text-xs text-slate-300 font-mono">{question.constraints}</p>
            </div>
          )}

          {/* Visible Sample Test Cases */}
          {question.testCases && question.testCases.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sample Test Cases</h3>
              {question.testCases.map((tc, idx) => (
                <div key={tc.id || idx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <div className="px-3.5 py-2 bg-slate-850 border-b border-slate-800 flex justify-between items-center text-slate-400 font-semibold">
                    <span>Sample Case #{idx + 1}</span>
                    <button
                      onClick={() => setCustomInput(tc.input)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Load into Input
                    </button>
                  </div>
                  <div className="p-3.5 space-y-2">
                    <div>
                      <div className="text-[11px] text-slate-500 font-semibold mb-1">Standard Input:</div>
                      <pre className="p-2 bg-slate-950 rounded font-mono text-slate-200 overflow-x-auto">{tc.input || "No input"}</pre>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-semibold mb-1">Expected Output:</div>
                      <pre className="p-2 bg-slate-950 rounded font-mono text-emerald-400 overflow-x-auto">{tc.expectedOutput}</pre>
                    </div>
                    {tc.explanation && (
                      <div className="text-[11px] text-slate-400 italic">
                        Explanation: {tc.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Pane: Monaco Code Editor & Execution Console (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-slate-900 overflow-hidden">
          {/* Monaco Editor Container (top 60%) */}
          <div className="flex-1 min-h-[300px] border-b border-slate-800">
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
              }}
            />
          </div>

          {/* Interactive Console Tabs (bottom 40%) */}
          <div className="h-64 flex flex-col bg-slate-950">
            {/* Console Header Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 bg-slate-900/80">
              <div className="flex space-x-4">
                <button
                  onClick={() => setConsoleTab("output")}
                  className={`py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    consoleTab === "output"
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Program Output</span>
                </button>

                <button
                  onClick={() => setConsoleTab("customInput")}
                  className={`py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    consoleTab === "customInput"
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Custom Input (stdin)</span>
                </button>

                <button
                  onClick={() => setConsoleTab("verdict")}
                  className={`py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    consoleTab === "verdict"
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Evaluation Verdict</span>
                  {lastSubmission && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded">
                      {lastSubmission.score}/{question.marks}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setConsoleTab("history")}
                  className={`py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    consoleTab === "history"
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Submissions ({historySubmissions.length})</span>
                </button>
              </div>

              {/* Status Indicator */}
              {runOutput && consoleTab === "output" && (
                <div className="flex items-center gap-3 text-xs">
                  <Badge status={runOutput.status} />
                  <span className="text-slate-400 text-[11px]">{runOutput.executionTimeMs}ms</span>
                </div>
              )}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300">
              {/* Output Tab */}
              {consoleTab === "output" && (
                <div>
                  {isRunning ? (
                    <div className="text-slate-500 animate-pulse">Executing code in sandboxed runtime...</div>
                  ) : runOutput ? (
                    <div className="space-y-3">
                      {runOutput.compileOutput && (
                        <div>
                          <div className="text-rose-400 font-bold mb-1">Compilation Errors:</div>
                          <pre className="p-2.5 bg-rose-950/40 border border-rose-900 rounded text-rose-300 whitespace-pre-wrap">
                            {runOutput.compileOutput}
                          </pre>
                        </div>
                      )}
                      {runOutput.stdout && (
                        <div>
                          <div className="text-slate-400 font-bold mb-1">Standard Output:</div>
                          <pre className="p-2.5 bg-slate-900 rounded text-slate-200 whitespace-pre-wrap">
                            {runOutput.stdout}
                          </pre>
                        </div>
                      )}
                      {runOutput.stderr && !runOutput.compileOutput && (
                        <div>
                          <div className="text-rose-400 font-bold mb-1">Standard Error:</div>
                          <pre className="p-2.5 bg-rose-950/30 border border-rose-900/60 rounded text-rose-300 whitespace-pre-wrap">
                            {runOutput.stderr}
                          </pre>
                        </div>
                      )}
                      {!runOutput.stdout && !runOutput.stderr && !runOutput.compileOutput && (
                        <div className="text-slate-500 italic">Program finished execution with no output.</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500 italic">
                      Click "Run Code" to compile and test with your custom input.
                    </div>
                  )}
                </div>
              )}

              {/* Custom Input Tab */}
              {consoleTab === "customInput" && (
                <div className="h-full flex flex-col">
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter standard input (stdin) for practice execution..."
                    className="w-full flex-1 bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>
              )}

              {/* Verdict Tab */}
              {consoleTab === "verdict" && (
                <div>
                  {isSubmitting ? (
                    <div className="text-slate-400 animate-pulse">
                      Evaluating against all configured test cases (including hidden tests)...
                    </div>
                  ) : lastSubmission ? (
                    <div className="space-y-4 font-sans">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-3">
                          <Badge status={lastSubmission.status} size="md" />
                          <div>
                            <div className="font-bold text-sm text-slate-100">
                              Score: {lastSubmission.score} / {question.marks} Points
                            </div>
                            <div className="text-xs text-slate-400">
                              Passed {lastSubmission.passedTests} of {lastSubmission.totalTests} Test Cases
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <div>Execution Time: {lastSubmission.executionTimeMs || 0}ms</div>
                          <div>{new Date(lastSubmission.submittedAt).toLocaleTimeString()}</div>
                        </div>
                      </div>

                      {/* Individual Test Results */}
                      <div className="space-y-2">
                        {lastSubmission.testResults?.map((tr, i) => (
                          <div
                            key={tr.id || i}
                            className="p-3 bg-slate-900/90 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {tr.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              )}
                              <span className="font-semibold text-slate-300">
                                Test Case #{i + 1} {tr.testCase.isHidden ? "(Hidden Test Case)" : "(Visible Case)"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-slate-400">{tr.executionTimeMs || 0}ms</span>
                              <Badge status={tr.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 italic">
                      Click "Submit Solution" to run your solution against the full evaluation suite.
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {consoleTab === "history" && (
                <div className="space-y-2 font-sans">
                  {historySubmissions.length === 0 ? (
                    <div className="text-slate-500 italic">No previous submissions recorded.</div>
                  ) : (
                    historySubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <Badge status={sub.status} />
                          <span className="font-bold text-slate-200">{sub.score} pts</span>
                          <span className="text-slate-500 font-mono">
                            ({sub.passedTests}/{sub.totalTests} passed)
                          </span>
                        </div>
                        <span className="text-slate-500">
                          {new Date(sub.submittedAt).toLocaleString()}
                        </span>
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
