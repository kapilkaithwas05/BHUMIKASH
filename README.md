<div align="center">

# 🧪 LabNEXUS

### An Integrated University Laboratory Submission and Assessment Portal

**Code. Compile. Submit. Evaluate.**

A modern, full-stack university coding portal designed for computer science curricula, laboratory management, synchronized practical assessments, and automated test-case evaluation.

<br/>

![Project Status](https://img.shields.io/badge/Status-Fully_Integrated-emerald?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React_18_+_Node.js_+_PostgreSQL-indigo?style=for-the-badge)
![Architecture](https://img.shields.io/badge/ORM-Prisma_7-blue?style=for-the-badge)
![Editor](https://img.shields.io/badge/Editor-Monaco_Code_Editor-violet?style=for-the-badge)

<br/>

[Architecture](#-system-architecture) •
[Roles & RBAC](#-user-roles--rbac) •
[Getting Started](#-getting-started) •
[Demo Credentials](#-demo-accounts) •
[API Documentation](#-api-routes) •
[Execution Engine](#-code-execution-engine)

</div>

---

## 📌 Overview

**LabNEXUS** replaces fragmented spreadsheets, disconnected IDEs, and manual email submissions with an institutional platform tailored to academic computer science laboratories.

The system connects four distinct stakeholders:
1. **Vice Chancellor / Executive Admin**: University-wide oversight, department comparisons, and audit logging.
2. **Head of Department (HOD)**: Department-level laboratory monitoring, faculty directory, and exam participation statistics.
3. **Faculty**: Course authoring, question management (with visible sample and private hidden test cases), manual and bulk student enrollment (CSV/XLSX), practical examination scheduling, and grading exports.
4. **Students**: Distraction-free Monaco coding workspace with live compilation output, server-synchronized assessment countdown timers, copy/paste deterrents, and instant automated grading.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (apps/web — React 18 + Vite)"]
        UI[Tailwind Component System]
        Monaco[Monaco Code Editor]
        AuthCtx[JWT Auth & Context]
        Timer[Synchronized Exam Countdown]
    end

    subgraph Backend ["Backend (apps/api — Express 5 + TypeScript)"]
        Router[REST API Layer]
        AuthMid[Auth & Role Verification]
        EvalSvc[Automated Evaluation Service]
        ExecSvc[Sandboxed Code Execution Engine]
        AMS[University AMS Gateway Adapter]
    end

    subgraph Database ["Data & Storage Layer"]
        Prisma[Prisma ORM 7]
        Postgres[(PostgreSQL Database)]
    end

    UI --> Router
    Monaco --> Router
    Router --> AuthMid
    AuthMid --> Prisma
    Router --> EvalSvc
    EvalSvc --> ExecSvc
    Prisma --> Postgres
    Router --> AMS
```

---

## 👥 User Roles & RBAC

| Capability | Vice Chancellor | Head of Dept (HOD) | Faculty | Student |
|---|:---:|:---:|:---:|:---:|
| Institution Overview & Comparisons | ✓ | — | — | — |
| Audit Trail Inspection | ✓ | — | — | — |
| Department Oversight & Faculty Directory | ✓ | ✓ | — | — |
| Create & Manage Laboratories | — | ✓ | ✓ | — |
| Author Questions & Hidden Test Cases | — | ✓ | ✓ | — |
| Single & Bulk Student Enrollment | — | ✓ | ✓ | — |
| Schedule & Publish Examinations | — | ✓ | ✓ | — |
| View All Student Submissions & Scores | ✓ | ✓ | ✓ | — |
| Export Assessment Results (CSV) | ✓ | ✓ | ✓ | — |
| Join Laboratory via Enrollment Key | — | — | — | ✓ |
| Monaco Editor Coding & Run Practice | — | — | — | ✓ |
| Submit Code for Automated Evaluation | — | — | — | ✓ |
| Timed Assessment Participation | — | — | — | ✓ |

---

## 🔑 Demo Accounts

The project includes an institutional seed script pre-populating departments, faculty, students, sample labs, questions, and an ongoing examination:

| Role | Email Address | Password | Permissions Scope |
|---|---|---|---|
| **Vice Chancellor** | `vc@labnexus.edu` | `NexusPass123!` | Institutional Analytics & Audit Logs |
| **HOD (CSBS)** | `hod.csbs@labnexus.edu` | `NexusPass123!` | Department-scoped monitoring & labs |
| **Faculty** | `demo.faculty@labnexus.test` | `FacultyPass123!` | Lab management & question authoring |
| **Student** | `demo.student@labnexus.test` | `StudentPass123!` | Coding workspace & examination room |

*Note: The login page also features one-click demo login buttons for rapid switching.*

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v24 recommended)
- **PostgreSQL**: v14 or higher running on `localhost:5432`
- **Compiler/Runtime**: Python (`py` or `python3`) and GCC (`gcc.exe` or MinGW) installed and available in PATH.

### Installation

1. **Clone & Install Dependencies**
   ```bash
   git clone <repo_url>
   cd LabNEXUS

   # Install root dependencies
   npm install

   # Install web dependencies
   cd apps/web && npm install && cd ../..

   # Install API dependencies
   cd apps/api && npm install && cd ../..
   ```

2. **Configure Environment Variables**
   Ensure `apps/api/.env` is configured with your PostgreSQL credentials:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/labnexus?schema=public"
   JWT_SECRET="71148e0a03dea2543252d50f34aa97b99a6b81bb81ce03c7316a7b608be516d4"
   ```

3. **Database Migration & Seed**
   ```bash
   # Synchronize schema to PostgreSQL
   cd apps/api
   npx prisma db push
   npx prisma generate

   # Seed institutional data
   npm run seed
   cd ../..
   ```

4. **Run the Application**
   Open two terminal sessions:

   **Terminal 1 — Backend API Server:**
   ```bash
   npm run dev:api
   # API will run on http://localhost:5000
   ```

   **Terminal 2 — Frontend Application:**
   ```bash
   npm run dev:web
   # Portal will run on http://localhost:3000
   ```

5. **Run Verification & Engine Tests**
   ```bash
   npm run test:exec
   # Tests Python, C compilation, timeout termination, and evaluation engine.
   ```

---

## ⚙️ Code Execution Engine

Submitted code is evaluated through a layered, sandboxed execution service (`apps/api/src/services/execution.service.ts`):
- **Temporary Working Directory Sandboxing**: Each run creates a fresh, isolated temporary folder (`os.tmpdir()/labnexus-exec-<id>`) that is forcefully cleaned up upon completion.
- **Strict Execution Timeouts**: Default 2,000ms timeout per test case. If an infinite loop is detected, the entire child process tree is forcefully terminated (`taskkill /F /T` on Windows or `SIGKILL` on Linux) and flagged as `TIME_LIMIT_EXCEEDED`.
- **Output Truncation**: Maximum stdout/stderr capture limited to 64 KB to defend against memory exhaustion attacks.
- **Hidden Test Case Masking**: Student requests receive sanitized outputs where private test inputs and expected outputs are never returned to the browser.
- **Compiler Support**: Native GCC MinGW compilation for C/C++ and unbuffered Python 3 execution.

---

## 📡 API Routes

### Authentication
- `POST /api/auth/register` — Public student registration.
- `POST /api/auth/login` — Issues signed JWT with role claim.
- `GET /api/auth/me` — Fetches current authenticated profile.

### Laboratories & Enrollments
- `GET /api/labs` — Lists laboratories (filtered by role).
- `POST /api/labs` — Creates laboratory (Faculty/HOD).
- `GET /api/labs/:labId` — Fetches laboratory details.
- `PUT /api/labs/:labId/publish` — Toggles publication status.
- `POST /api/labs/:labId/enrollment-key` — Generates unique enrollment key.
- `POST /api/labs/join-by-key` — Enrolls student using key.
- `POST /api/labs/:labId/enroll` — Enrolls individual student by email.
- `DELETE /api/labs/:labId/students/:studentId` — Removes student from lab.
- `POST /api/labs/:labId/enroll/bulk` — Uploads CSV or Excel student roster.

### Questions & Evaluation
- `GET /api/labs/:labId/questions` — Lists questions (masks hidden tests for students).
- `GET /api/questions/:questionId` — Question details and constraints.
- `POST /api/labs/:labId/questions` — Creates question with test cases.
- `POST /api/questions/:questionId/run` — Practice execution with custom stdin.
- `POST /api/questions/:questionId/submit` — Automated grading against all test cases.

### Examinations
- `GET /api/labs/:labId/examinations` — Lists scheduled assessments.
- `GET /api/examinations/:examinationId` — Examination room with server-synchronized time.
- `POST /api/labs/:labId/examinations` — Schedules practical examination.
- `GET /api/examinations/:examinationId/results` — Grade summary and CSV export.

### Analytics & University AMS
- `GET /api/analytics/institution` — Executive VC metrics and comparisons.
- `GET /api/analytics/department` — HOD department-scoped statistics.
- `GET /api/analytics/audit-logs` — Administrative audit trail.
- `GET /api/ams/status` — University Attendance Management System contract status.

---

## 🛡️ Security & Reliability

- **No Blind Trust**: Privileged roles cannot be self-assigned during registration.
- **Database-Backed Role Authorization**: Tokens verify current PostgreSQL database roles on each protected request.
- **Server-Side Deadline Enforcement**: The backend verifies assessment start and end windows, rejecting late submissions.
- **SQL Injection Defense**: All database queries are parameter-safe via Prisma ORM.
- **Process Isolation**: Untrusted code never executes directly in the main server loop.
