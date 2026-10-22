import { ExecutionService, SupportedLanguage } from "./execution.service";

export interface EvaluationTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string | null;
}

export interface EvaluationTestResult {
  testCaseId: string;
  passed: boolean;
  status:
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "COMPILATION_ERROR"
    | "RUNTIME_ERROR"
    | "TIME_LIMIT_EXCEEDED"
    | "INTERNAL_ERROR";
  actualOutput?: string | null;
  expectedOutput?: string | null;
  input?: string | null;
  isHidden: boolean;
  executionTimeMs: number;
}

export interface EvaluationSummary {
  status:
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "COMPILATION_ERROR"
    | "RUNTIME_ERROR"
    | "TIME_LIMIT_EXCEEDED"
    | "INTERNAL_ERROR";
  score: number;
  totalTests: number;
  passedTests: number;
  compileOutput?: string;
  executionTimeMs: number;
  testResults: EvaluationTestResult[];
}

export class EvaluationService {
  /**
   * Normalizes program output by removing carriage returns and trailing whitespace.
   */
  public static normalizeOutput(output: string): string {
    return output
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim();
  }

  /**
   * Evaluates student source code against a suite of test cases.
   */
  public static async evaluate(
    language: SupportedLanguage,
    sourceCode: string,
    testCases: EvaluationTestCase[],
    options: {
      timeLimitMs?: number;
      memoryLimitMb?: number;
      maxMarks?: number;
      maskHiddenTests?: boolean;
    } = {}
  ): Promise<EvaluationSummary> {
    const timeLimitMs = options.timeLimitMs || 2000;
    const maxMarks = options.maxMarks || 10;
    const maskHiddenTests = options.maskHiddenTests !== false;

    if (testCases.length === 0) {
      return {
        status: "ACCEPTED",
        score: maxMarks,
        totalTests: 0,
        passedTests: 0,
        executionTimeMs: 0,
        testResults: [],
      };
    }

    const testResults: EvaluationTestResult[] = [];
    let passedTests = 0;
    let overallStatus: EvaluationSummary["status"] = "ACCEPTED";
    let compileOutput: string | undefined;
    let totalExecTime = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];

      const execResult = await ExecutionService.execute({
        language,
        sourceCode,
        stdin: tc.input,
        timeLimitMs,
        memoryLimitMb: options.memoryLimitMb,
      });

      totalExecTime += execResult.executionTimeMs;

      // Handle compilation error
      if (execResult.status === "COMPILATION_ERROR") {
        overallStatus = "COMPILATION_ERROR";
        compileOutput = execResult.compileOutput || execResult.stderr;

        testResults.push({
          testCaseId: tc.id,
          passed: false,
          status: "COMPILATION_ERROR",
          actualOutput: execResult.stderr,
          expectedOutput: maskHiddenTests && tc.isHidden ? null : tc.expectedOutput,
          input: maskHiddenTests && tc.isHidden ? null : tc.input,
          isHidden: tc.isHidden,
          executionTimeMs: execResult.executionTimeMs,
        });

        // Break early on compilation failure - no need to rerun remaining tests
        break;
      }

      // Check runtime or timeout failure
      if (execResult.status !== "ACCEPTED") {
        if (overallStatus === "ACCEPTED") {
          overallStatus = execResult.status;
        }

        testResults.push({
          testCaseId: tc.id,
          passed: false,
          status: execResult.status,
          actualOutput: maskHiddenTests && tc.isHidden ? null : (execResult.stderr || execResult.stdout),
          expectedOutput: maskHiddenTests && tc.isHidden ? null : tc.expectedOutput,
          input: maskHiddenTests && tc.isHidden ? null : tc.input,
          isHidden: tc.isHidden,
          executionTimeMs: execResult.executionTimeMs,
        });
        continue;
      }

      // Output comparison
      const normalizedActual = this.normalizeOutput(execResult.stdout);
      const normalizedExpected = this.normalizeOutput(tc.expectedOutput);
      const isMatch = normalizedActual === normalizedExpected;

      if (isMatch) {
        passedTests++;
        testResults.push({
          testCaseId: tc.id,
          passed: true,
          status: "ACCEPTED",
          actualOutput: maskHiddenTests && tc.isHidden ? null : execResult.stdout.trim(),
          expectedOutput: maskHiddenTests && tc.isHidden ? null : tc.expectedOutput,
          input: maskHiddenTests && tc.isHidden ? null : tc.input,
          isHidden: tc.isHidden,
          executionTimeMs: execResult.executionTimeMs,
        });
      } else {
        if (overallStatus === "ACCEPTED") {
          overallStatus = "WRONG_ANSWER";
        }
        testResults.push({
          testCaseId: tc.id,
          passed: false,
          status: "WRONG_ANSWER",
          actualOutput: maskHiddenTests && tc.isHidden ? null : execResult.stdout.trim(),
          expectedOutput: maskHiddenTests && tc.isHidden ? null : tc.expectedOutput,
          input: maskHiddenTests && tc.isHidden ? null : tc.input,
          isHidden: tc.isHidden,
          executionTimeMs: execResult.executionTimeMs,
        });
      }
    }

    const score = testCases.length > 0 ? (passedTests / testCases.length) * maxMarks : 0;

    return {
      status: overallStatus,
      score: Math.round(score * 10) / 10,
      totalTests: testCases.length,
      passedTests,
      compileOutput,
      executionTimeMs: totalExecTime,
      testResults,
    };
  }
}
