import { spawn, exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

export type SupportedLanguage = "C" | "CPP" | "JAVA" | "PYTHON";

export interface ExecutionOptions {
  language: SupportedLanguage;
  sourceCode: string;
  stdin?: string;
  timeLimitMs?: number; // Default 2000ms
  memoryLimitMb?: number; // Default 128MB
}

export interface ExecutionResult {
  status:
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "COMPILATION_ERROR"
    | "RUNTIME_ERROR"
    | "TIME_LIMIT_EXCEEDED"
    | "INTERNAL_ERROR";
  stdout: string;
  stderr: string;
  compileOutput?: string;
  executionTimeMs: number;
}

const MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB truncation limit

// Helper to kill a Windows process tree cleanly
function killProcessTree(pid: number): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      exec(`taskkill /F /T /PID ${pid}`, () => resolve());
    } else {
      try {
        process.kill(-pid, "SIGKILL");
      } catch {
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          // Process already ended
        }
      }
      resolve();
    }
  });
}

export class ExecutionService {
  private static async getPythonCommand(): Promise<string> {
    const configuredCommand = process.env.PYTHON_EXECUTABLE?.trim();
    if (configuredCommand) {
      return configuredCommand.replace(/^"(.*)"$/, "$1");
    }

    if (process.platform !== "win32") {
      return "python3";
    }

    // The Windows py launcher can be installed without a registered interpreter.
    // Check the standard per-user install folder before falling back to that launcher.
    const localPrograms = path.join(os.homedir(), "AppData", "Local", "Programs", "Python");
    try {
      const installations = await fs.readdir(localPrograms, { withFileTypes: true });
      const candidates = installations
        .filter((entry) => entry.isDirectory() && /^Python\d+$/i.test(entry.name))
        .sort((left, right) => right.name.localeCompare(left.name, undefined, { numeric: true }));

      for (const installation of candidates) {
        const interpreter = path.join(localPrograms, installation.name, "python.exe");
        try {
          await fs.access(interpreter);
          return interpreter;
        } catch {
          // Try the next discovered installation.
        }
      }
    } catch {
      // Use the standard launcher below when no per-user installation is present.
    }

    return "py";
  }

  /**
   * Runs code in a temporary working directory with a time limit. This is not a security
   * sandbox: it still runs with the API host user's operating-system permissions and must
   * not be exposed to untrusted student code without an external isolation layer.
   *
   * Cold-start tolerance: the first spawns of a compiler/runtime and of a freshly written
   * binary after an idle period can take several seconds on a shared Windows host (antivirus
   * scanning of new executables). That latency is host overhead, not student code runtime, and
   * it must not be reported as a wrong TIME_LIMIT_EXCEEDED verdict. A timed-out attempt is
   * therefore re-run once with a widened budget; genuinely slow or non-terminating programs
   * still report TIME_LIMIT_EXCEEDED.
   */
  public static async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const timeLimitMs = options.timeLimitMs || 2000;
    const firstAttempt = await this.executeOnce(options);

    if (firstAttempt.status === "TIME_LIMIT_EXCEEDED") {
      const graceLimitMs = Math.max(timeLimitMs * 3, timeLimitMs + 4000);
      const retryAttempt = await this.executeOnce({
        ...options,
        timeLimitMs: graceLimitMs,
      });

      if (retryAttempt.status !== "TIME_LIMIT_EXCEEDED") {
        return retryAttempt;
      }
    }

    return firstAttempt;
  }

  private static async executeOnce(options: ExecutionOptions): Promise<ExecutionResult> {
    const timeLimitMs = options.timeLimitMs || 2000;
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "labnexus-exec-"));

    const startTime = Date.now();

    try {
      switch (options.language) {
        case "PYTHON":
          return await this.executePython(options.sourceCode, options.stdin || "", tempDir, timeLimitMs);
        case "C":
          return await this.executeC(options.sourceCode, options.stdin || "", tempDir, timeLimitMs);
        case "CPP":
          return await this.executeCpp(options.sourceCode, options.stdin || "", tempDir, timeLimitMs);
        case "JAVA":
          return await this.executeJava(options.sourceCode, options.stdin || "", tempDir, timeLimitMs);
        default:
          return {
            status: "INTERNAL_ERROR",
            stdout: "",
            stderr: `Unsupported language: ${options.language}`,
            executionTimeMs: 0,
          };
      }
    } catch (error: any) {
      return {
        status: "INTERNAL_ERROR",
        stdout: "",
        stderr: error.message || "Internal execution error occurred",
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      // Clean up sandbox directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Silently ignore cleanup errors
      }
    }
  }

  private static async executePython(
    sourceCode: string,
    stdin: string,
    tempDir: string,
    timeLimitMs: number
  ): Promise<ExecutionResult> {
    const scriptPath = path.join(tempDir, "solution.py");
    await fs.writeFile(scriptPath, sourceCode, "utf8");

    const pythonCommand = await this.getPythonCommand();
    return this.runProcess(pythonCommand, ["-u", scriptPath], stdin, tempDir, timeLimitMs);
  }

  private static async executeC(
    sourceCode: string,
    stdin: string,
    tempDir: string,
    timeLimitMs: number
  ): Promise<ExecutionResult> {
    const srcPath = path.join(tempDir, "solution.c");
    const outExe = path.join(tempDir, process.platform === "win32" ? "solution.exe" : "solution");
    await fs.writeFile(srcPath, sourceCode, "utf8");

    // 1. Compile with gcc
    const compileRes = await this.runCompile("gcc", ["-O2", "-Wall", srcPath, "-o", outExe], tempDir);
    if (compileRes.status !== "ACCEPTED") {
      return {
        status: "COMPILATION_ERROR",
        stdout: "",
        stderr: compileRes.stderr || compileRes.stdout,
        compileOutput: compileRes.stderr || compileRes.stdout,
        executionTimeMs: 0,
      };
    }

    // 2. Run compiled executable
    return this.runProcess(outExe, [], stdin, tempDir, timeLimitMs);
  }

  private static async executeCpp(
    sourceCode: string,
    stdin: string,
    tempDir: string,
    timeLimitMs: number
  ): Promise<ExecutionResult> {
    const srcPath = path.join(tempDir, "solution.cpp");
    const outExe = path.join(tempDir, process.platform === "win32" ? "solution.exe" : "solution");
    await fs.writeFile(srcPath, sourceCode, "utf8");

    // 1. Compile with g++
    const compileRes = await this.runCompile("g++", ["-O2", "-Wall", srcPath, "-o", outExe], tempDir);
    if (compileRes.status !== "ACCEPTED") {
      return {
        status: "COMPILATION_ERROR",
        stdout: "",
        stderr: compileRes.stderr || compileRes.stdout,
        compileOutput: compileRes.stderr || compileRes.stdout,
        executionTimeMs: 0,
      };
    }

    // 2. Run compiled executable
    return this.runProcess(outExe, [], stdin, tempDir, timeLimitMs);
  }

  private static async executeJava(
    sourceCode: string,
    stdin: string,
    tempDir: string,
    timeLimitMs: number
  ): Promise<ExecutionResult> {
    const srcPath = path.join(tempDir, "Main.java");
    await fs.writeFile(srcPath, sourceCode, "utf8");

    // Compile with javac
    const compileRes = await this.runCompile("javac", [srcPath], tempDir);
    if (compileRes.status !== "ACCEPTED") {
      return {
        status: "COMPILATION_ERROR",
        stdout: "",
        stderr: compileRes.stderr || compileRes.stdout,
        compileOutput: compileRes.stderr || compileRes.stdout,
        executionTimeMs: 0,
      };
    }

    return this.runProcess("java", ["-cp", tempDir, "Main"], stdin, tempDir, timeLimitMs);
  }

  /**
   * Compiles a source file with a fixed budget, retrying once with a wider budget if the
   * first attempt times out. The first cold invocation of a toolchain (gcc/g++/javac) on a
   * shared Windows host can be slowed down by antivirus scanning of the freshly written
   * problem, which must not be reported to the student as a compilation error in their code.
   */
  private static async runCompile(
    command: string,
    args: string[],
    cwd: string
  ): Promise<ExecutionResult> {
    const compileRes = await this.runProcess(command, args, "", cwd, 8000);

    if (compileRes.status === "TIME_LIMIT_EXCEEDED") {
      return this.runProcess(command, args, "", cwd, 25000);
    }

    return compileRes;
  }

  private static runProcess(
    command: string,
    args: string[],
    stdin: string,
    cwd: string,
    timeLimitMs: number
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = "";
      let stderr = "";
      let isTimedOut = false;
      let isResolved = false;

      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(command, args, {
          cwd,
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });
      } catch (err: any) {
        return resolve({
          status: "INTERNAL_ERROR",
          stdout: "",
          stderr: `Failed to invoke command ${command}: ${err.message}`,
          executionTimeMs: 0,
        });
      }

      // Timer to terminate on timeout
      const timer = setTimeout(async () => {
        isTimedOut = true;
        if (child.pid) {
          await killProcessTree(child.pid);
        }
        if (!isResolved) {
          isResolved = true;
          resolve({
            status: "TIME_LIMIT_EXCEEDED",
            stdout: stdout.trim(),
            stderr: `Execution exceeded time limit of ${timeLimitMs}ms`,
            executionTimeMs: timeLimitMs,
          });
        }
      }, timeLimitMs);

      // Pipe standard input
      if (child.stdin) {
        if (stdin) {
          child.stdin.write(stdin);
        }
        child.stdin.end();
      }

      child.stdout?.on("data", (data) => {
        if (stdout.length < MAX_OUTPUT_BYTES) {
          stdout += data.toString();
        }
      });

      child.stderr?.on("data", (data) => {
        if (stderr.length < MAX_OUTPUT_BYTES) {
          stderr += data.toString();
        }
      });

      child.on("error", (err: any) => {
        clearTimeout(timer);
        if (!isResolved) {
          isResolved = true;
          // Check if error is missing executable
          const isNotFound = err.code === "ENOENT";
          resolve({
            status: "INTERNAL_ERROR",
            stdout: "",
            stderr: isNotFound
              ? `Compiler/Runtime not found: "${command}". Please ensure it is installed and in PATH.`
              : err.message,
            executionTimeMs: Date.now() - startTime,
          });
        }
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (isResolved || isTimedOut) return;
        isResolved = true;

        const executionTimeMs = Date.now() - startTime;

        if (code === 0) {
          resolve({
            status: "ACCEPTED",
            stdout: stdout,
            stderr: stderr,
            executionTimeMs,
          });
        } else {
          resolve({
            status: "RUNTIME_ERROR",
            stdout: stdout,
            stderr: stderr || `Process exited with code ${code}`,
            executionTimeMs,
          });
        }
      });
    });
  }
}
