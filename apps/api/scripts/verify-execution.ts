import "dotenv/config";
import { ExecutionService } from "../src/services/execution.service";
import { EvaluationService } from "../src/services/evaluation.service";

async function runTests() {
  console.log("=== Testing Execution Engine ===");

  // 1. Python test
  const pyCode = `
import sys
line = sys.stdin.read().strip()
words = [w for w in line.split() if w.lower() == w.lower()[::-1]]
print(" ".join(words) if words else "NONE")
`;
  console.log("\n1. Testing Python Execution:");
  const pyRes = await ExecutionService.execute({
    language: "PYTHON",
    sourceCode: pyCode,
    stdin: "racecar mom drove fast",
  });
  console.log("Python Status:", pyRes.status);
  console.log("Python Stdout:", pyRes.stdout.trim());
  console.log("Python Time:", pyRes.executionTimeMs, "ms");

  // 2. C test
  const cCode = `
#include <stdio.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", a + b);
    }
    return 0;
}
`;
  console.log("\n2. Testing C Compilation & Execution:");
  const cRes = await ExecutionService.execute({
    language: "C",
    sourceCode: cCode,
    stdin: "15 27",
  });
  console.log("C Status:", cRes.status);
  console.log("C Stdout:", cRes.stdout.trim());
  console.log("C Time:", cRes.executionTimeMs, "ms");

  // 3. Timeout test (infinite loop)
  const infiniteLoop = `
while True:
    pass
`;
  console.log("\n3. Testing Timeout Enforcement (Infinite Loop):");
  const timeoutRes = await ExecutionService.execute({
    language: "PYTHON",
    sourceCode: infiniteLoop,
    timeLimitMs: 1500,
  });
  console.log("Timeout Status:", timeoutRes.status);
  console.log("Timeout Stderr:", timeoutRes.stderr);

  // 4. Evaluation Service Test (Visible + Hidden test cases)
  console.log("\n4. Testing Evaluation Service:");
  const evalRes = await EvaluationService.evaluate(
    "PYTHON",
    pyCode,
    [
      {
        id: "tc1",
        input: "racecar mom drove fast",
        expectedOutput: "racecar mom",
        isHidden: false,
      },
      {
        id: "tc2",
        input: "Madam Arora noon radar",
        expectedOutput: "Madam Arora noon radar",
        isHidden: true,
      },
    ],
    { maskHiddenTests: true, maxMarks: 20 }
  );
  console.log("Eval Status:", evalRes.status);
  console.log("Eval Score:", evalRes.score, "/ 20");
  console.log("Eval Passed Tests:", `${evalRes.passedTests}/${evalRes.totalTests}`);
  console.log("Hidden test masked output check:", evalRes.testResults[1].actualOutput === null ? "PASSED (Hidden Output Masked)" : "FAILED");
}

runTests().catch(console.error);
