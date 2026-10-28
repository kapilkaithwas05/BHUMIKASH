import {
  User,
  Lab,
  Question,
  Examination,
  Submission,
  SupportedLanguage,
} from "../types";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api";

function getToken(): string | null {
  return localStorage.getItem("labnexus_token");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error("Cannot reach the LabNEXUS API. Start the backend with `npm.cmd run dev:api` and try again.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    const errorMsg = data.message || (response.status >= 500
      ? "The LabNEXUS API could not complete this request. Check that the backend and database are running."
      : `Request failed with status ${response.status}`);
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async register(name: string, email: string, password: string): Promise<{ user: User }> {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },

  async getMe(): Promise<{ user: User }> {
    return request("/auth/me");
  },

  // Labs
  async getLabs(): Promise<{ labs: Lab[] }> {
    return request("/labs");
  },

  async getLabById(id: string): Promise<{ lab: Lab }> {
    return request(`/labs/${id}`);
  },

  async createLab(data: {
    title: string;
    code?: string;
    description?: string;
    language: string;
    departmentId?: string;
    courseId?: string;
    cohortId?: string;
  }): Promise<{ lab: Lab }> {
    return request("/labs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getAcademicOptions(): Promise<{ homeDepartmentId: string | null; departments: Array<{
    id: string; name: string; code: string;
    programs: Array<{ id: string; name: string; code: string; cohorts: Array<{ id: string; semester: number; section: string; academicYear: { label: string } }> }>;
    courses: Array<{ id: string; code: string; title: string }>;
  }> }> {
    return request("/academics/options");
  },

  async publishLab(labId: string, isPublished: boolean): Promise<{ lab: Lab }> {
    return request(`/labs/${labId}/publish`, {
      method: "PUT",
      body: JSON.stringify({ isPublished }),
    });
  },

  async archiveLab(labId: string): Promise<{ message: string; lab: Lab }> {
    return request(`/labs/${labId}/archive`, { method: "PATCH" });
  },

  async restoreLab(labId: string): Promise<{ message: string; lab: Lab }> {
    return request(`/labs/${labId}/restore`, { method: "PATCH" });
  },

  async generateEnrollmentKey(labId: string): Promise<{ enrollmentKey: string }> {
    return request(`/labs/${labId}/enrollment-key`, {
      method: "POST",
    });
  },

  async joinLabByKey(enrollmentKey: string): Promise<{ message: string; lab: Lab }> {
    return request("/labs/join-by-key", {
      method: "POST",
      body: JSON.stringify({ enrollmentKey }),
    });
  },

  async getEnrolledStudents(labId: string): Promise<{ totalStudents: number; students: any[] }> {
    return request(`/labs/${labId}/students`);
  },

  async getLabFaculty(labId: string): Promise<{
    assignedFaculty: Array<{ id: string; name: string; email: string; homeDepartment?: { name: string; code: string } | null }>;
    faculty: Array<{ id: string; name: string; email: string; homeDepartment?: { name: string; code: string } | null }>;
  }> {
    return request(`/labs/${labId}/faculty`);
  },

  async updateLabFaculty(labId: string, facultyIds: string[]): Promise<{
    message: string;
    assignedFaculty: Array<{ id: string; name: string; email: string; homeDepartment?: { name: string; code: string } | null }>;
  }> {
    return request(`/labs/${labId}/faculty`, {
      method: "PUT",
      body: JSON.stringify({ facultyIds }),
    });
  },

  async enrollStudent(labId: string, email: string): Promise<{ message: string }> {
    return request(`/labs/${labId}/enroll`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async removeStudent(labId: string, studentId: string): Promise<{ message: string }> {
    return request(`/labs/${labId}/students/${studentId}`, {
      method: "DELETE",
    });
  },

  async bulkEnrollStudents(labId: string, file: File): Promise<{ message: string; summary: any }> {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/labs/${labId}/enroll/bulk`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to process bulk enrollment");
    }
    return data;
  },

  // Questions
  async getLabQuestions(labId: string): Promise<{ questions: Question[] }> {
    return request(`/labs/${labId}/questions`);
  },

  async getQuestionById(questionId: string): Promise<{ question: Question }> {
    return request(`/questions/${questionId}`);
  },

  async createQuestion(labId: string, data: any): Promise<{ question: Question }> {
    return request(`/labs/${labId}/questions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async createSampleQuestions(labId: string): Promise<{ message: string; createdCount: number; questions: Question[] }> {
    return request(`/labs/${labId}/questions/sample-set`, { method: "POST" });
  },

  async updateQuestion(questionId: string, data: any): Promise<{ question: Question }> {
    return request(`/questions/${questionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteQuestion(questionId: string): Promise<{ message: string }> {
    return request(`/questions/${questionId}`, {
      method: "DELETE",
    });
  },

  // Submissions & Execution
  async runCode(
    questionId: string,
    sourceCode: string,
    language?: string,
    customInput?: string
  ): Promise<{
    status: string;
    stdout: string;
    stderr: string;
    compileOutput?: string;
    executionTimeMs: number;
    usedInput: string;
  }> {
    return request(`/questions/${questionId}/run`, {
      method: "POST",
      body: JSON.stringify({ sourceCode, language, customInput }),
    });
  },

  async submitCode(
    questionId: string,
    sourceCode: string,
    language?: string,
    examinationId?: string
  ): Promise<{ message: string; submission: Submission }> {
    return request(`/questions/${questionId}/submit`, {
      method: "POST",
      body: JSON.stringify({ sourceCode, language, examinationId }),
    });
  },

  async getQuestionSubmissions(questionId: string): Promise<{ submissions: Submission[] }> {
    return request(`/questions/${questionId}/submissions`);
  },

  async getSubmissions(): Promise<{ submissions: Array<Submission & {
    student: { id: string; name: string; email: string; rollNumber?: string | null };
    lab: { id: string; title: string; code?: string | null };
    question: { id: string; title: string; marks: number };
  }> }> {
    return request("/submissions");
  },

  // Examinations
  async getLabExaminations(labId: string): Promise<{ examinations: Examination[]; serverTime: string }> {
    return request(`/labs/${labId}/examinations`);
  },

  async getExaminationById(examinationId: string): Promise<{ examination: Examination; serverTime: string }> {
    return request(`/examinations/${examinationId}`);
  },

  async createExamination(labId: string, data: any): Promise<{ examination: Examination }> {
    return request(`/labs/${labId}/examinations`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async publishExamination(examinationId: string, isPublished: boolean): Promise<{ examination: Examination }> {
    return request(`/examinations/${examinationId}/publish`, {
      method: "PUT",
      body: JSON.stringify({ isPublished }),
    });
  },

  async getExaminationResults(examinationId: string): Promise<{ examination: any; results: any[] }> {
    return request(`/examinations/${examinationId}/results`);
  },

  // Analytics
  async getInstitutionAnalytics(): Promise<any> {
    return request("/analytics/institution");
  },

  async getDepartmentAnalytics(departmentId?: string): Promise<any> {
    const q = departmentId ? `?departmentId=${departmentId}` : "";
    return request(`/analytics/department${q}`);
  },

  async getAuditLogs(): Promise<{ logs: any[] }> {
    return request("/analytics/audit-logs");
  },

  async getStudents(page = 1, q = "", scope: { cohortId?: string; programId?: string } = {}): Promise<{ students: any[]; pagination: { page: number; pageSize: number; total: number; pages: number } }> {
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (q.trim()) params.set("q", q.trim());
    if (scope.cohortId) params.set("cohortId", scope.cohortId);
    if (scope.programId) params.set("programId", scope.programId);
    return request(`/students?${params.toString()}`);
  },

  async setStudentActive(id: string, isActive: boolean): Promise<void> {
    await request(`/students/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  },

  // AMS
  async getAMSStatus(): Promise<any> {
    return request("/ams/status");
  },

  async getAMSReport(labId: string): Promise<any> {
    return request(`/ams/labs/${labId}/report`);
  },

  // Notifications
  async getNotifications(): Promise<{ notifications: any[]; unreadCount: number }> {
    return request("/notifications");
  },

  async markNotificationRead(id: string): Promise<{ notification: any }> {
    return request(`/notifications/${id}/read`, { method: "PUT" });
  },

  async markAllNotificationsRead(): Promise<{ message: string }> {
    return request("/notifications/read-all", { method: "PUT" });
  },

  async deleteNotification(id: string): Promise<{ message: string }> {
    return request(`/notifications/${id}`, { method: "DELETE" });
  },
};
