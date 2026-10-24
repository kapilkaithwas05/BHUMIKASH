export type Role = "VICE_CHANCELLOR" | "HOD" | "FACULTY" | "STUDENT";

export type LabLanguage = "C" | "CPP" | "JAVA" | "PYTHON";
export type SupportedLanguage = LabLanguage;

export type SubmissionStatus =
  | "PENDING"
  | "RUNNING"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR";

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  rollNumber?: string | null;
  departmentId?: string | null;
  department?: Department | null;
}

export interface Lab {
  id: string;
  title: string;
  code?: string | null;
  description?: string | null;
  language: LabLanguage;
  enrollmentKey?: string | null;
  isPublished: boolean;
  departmentId?: string | null;
  department?: Department | null;
  createdById: string;
  createdBy?: { id: string; name: string; email?: string } | null;
  _count?: {
    enrollments?: number;
    questions?: number;
    examinations?: number;
  };
  createdAt?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string | null;
  orderIndex: number;
}

export interface Question {
  id: string;
  labId: string;
  title: string;
  description: string;
  inputFormat?: string | null;
  outputFormat?: string | null;
  constraints?: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  marks: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  attemptsAllowed?: number | null;
  starterCode?: string | null;
  orderIndex: number;
  testCases?: TestCase[];
  totalTestCasesCount?: number;
  lab?: Lab;
}

export interface Examination {
  id: string;
  labId: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalMarks: number;
  isPublished: boolean;
  disableCopyPaste: boolean;
  questions?: {
    orderIndex: number;
    question: Question;
  }[];
  lab?: Lab;
  _count?: {
    submissions?: number;
  };
}

export interface SubmissionTestResult {
  id: string;
  testCaseId: string;
  passed: boolean;
  status: SubmissionStatus;
  actualOutput?: string | null;
  executionTimeMs?: number | null;
  testCase: {
    id: string;
    input?: string | null;
    expectedOutput?: string | null;
    isHidden: boolean;
    explanation?: string | null;
  };
}

export interface Submission {
  id: string;
  studentId: string;
  student?: {
    id: string;
    name: string;
    email: string;
    rollNumber?: string | null;
  };
  labId: string;
  questionId: string;
  question?: {
    id: string;
    title: string;
    marks: number;
  };
  examinationId?: string | null;
  language: LabLanguage;
  sourceCode: string;
  status: SubmissionStatus;
  compileOutput?: string | null;
  score: number;
  totalTests: number;
  passedTests: number;
  executionTimeMs?: number | null;
  testResults?: SubmissionTestResult[];
  submittedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "ENROLLMENT" | "SUBMISSION" | "EXAM" | "WARNING" | "SYSTEM";
  isRead: boolean;
  createdAt: string;
}
