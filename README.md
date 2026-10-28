<div align="center">

# 🧪 LabNEXUS

### An Integrated University Laboratory Submission and Assessment Portal

**Code. Practice. Submit. Review.**

A university coding portal for laboratory management, practical assessments, code submissions, and faculty review.

<br/>

![Project Status](https://img.shields.io/badge/Status-Core_Workflow-indigo?style=for-the-badge)
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
4. **Students**: Monaco coding workspace with synchronized assessment timers and persistent submissions. Submissions remain pending until isolated code execution is configured.

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
        EvalSvc[Submission Status: Pending Evaluation]
        ExecSvc[Isolated Code Runner: Not Configured]
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
| Monaco Editor Coding | — | — | — | ✓ |
| Isolated Code Execution | — | — | — | Pending |
| Submit Code for Review | — | — | — | ✓ |
| Timed Assessment Participation | — | — | — | ✓ |

---

## 🔑 Demo Accounts

For local development only, seed fictional demo accounts using `npm run seed:demo-accounts` after the CSBS department exists. Quick Access uses these accounts:

| Role | Email Address | Password | Permissions Scope |
|---|---|---|---|
| **Vice Chancellor** | `vc@labnexus.test` | `NexusPass123!` | Institutional monitoring |
| **HOD (CSBS)** | `hod.csbs@labnexus.test` | `NexusPass123!` | Department-scoped monitoring |
| **Faculty** | `demo.faculty@labnexus.test` | `FacultyPass123!` | Lab management & question authoring |
| **Student** | `demo.student@labnexus.test` | `StudentPass123!` | Coding workspace & examination room |

*These are local demo credentials, not institutional accounts. The login page has one-click demo login buttons. The demo account script does not import roster records.*

---

## 🚀 Getting Started

## 🌐 Deploy a mentor demo (Render)

This repository includes a Render Blueprint for the web app, API, and PostgreSQL database. To create a live demo:

1. Push the project to a GitHub repository. A deployment uses the files committed and pushed to GitHub; uncommitted local changes are not included.
2. In Render, create a new **Blueprint** and select this repository. Review the `labnexus-db`, `labnexus-api`, and `labnexus-web` resources before applying. The current free Render Postgres plan expires after 30 days, so treat it as a short evaluation demo and check current plan and pricing details before creating resources.
3. After the API and web services are created, set `CORS_ORIGIN` on `labnexus-api` to the web service's full public URL (for example, `https://labnexus-web.onrender.com`). Set `VITE_API_URL` on `labnexus-web` to the API service's full public URL (for example, `https://labnexus-api.onrender.com`), with no trailing slash. Save both values and redeploy the web service so the frontend build uses the API URL.
4. The API Blueprint generates a `JWT_SECRET` and uses Render's database connection string. It installs the API dependencies, builds the Prisma client, applies checked-in migrations, and starts the API. Do not put production credentials in this repository.
5. Once the API is healthy, optionally initialize the database from a trusted environment using `npm run seed --prefix apps/api` with the production `DATABASE_URL` securely configured. The main seed includes institutional demo data. Avoid running local demo-account credentials on a public site unless you intentionally want anyone with those credentials to access the demo.
6. Share the `labnexus-web` public URL with your mentor. Pushing later commits to the connected GitHub branch triggers automatic deployments; if auto-deploy is disabled, start a deploy from Render. Database migrations run before API deployment.

Render plan availability, pricing, and service behavior can change; review the current plan details in Render before creating resources. This hosted demo does not configure isolated code execution, so code running remains unavailable by design.

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
   # Apply the checked-in, additive migrations
   cd apps/api
   npm run db:validate
   npm run db:deploy
   npm run db:generate

   # Seed institutional data
   npm run seed
   cd ../..
   ```

   For local schema development, use `npm run db:migrate` from `apps/api`; this creates a migration and applies it to the configured development database. Do not use `db push` where preserving existing data and migration history matters.

4. **Inspect development data with Prisma Studio**
   ```bash
   cd apps/api
   npm run studio
   ```
   Prisma Studio uses the same `DATABASE_URL` from `apps/api/.env`. Stop it with Ctrl+C. Studio is intended for local development and is not the production admin interface.

5. **Run the Application**
   Start PostgreSQL and make sure `apps/api/.env` has a valid `DATABASE_URL` and `JWT_SECRET`. Then run both services together:

   ```bash
   npm run dev
   ```

   On Windows PowerShell, use `npm.cmd run dev`. To run them separately, open two terminals:

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

6. **Run Verification & Engine Tests**
   ```bash
   npm run test:exec
   # Tests Python, C compilation, timeout termination, and evaluation engine.
   ```

---

## ⚙️ Code Execution Status

The API does not execute submitted code. The existing child-process runner uses temporary folders and timeouts, but these controls do not isolate untrusted programs from the host. The Run endpoint returns `503` until an isolated execution service is configured. Student submissions are saved with `PENDING` status and can be reviewed by the lab owner. The standalone execution verification script checks local Python/C behavior; it does not establish sandbox security.

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
- `POST /api/questions/:questionId/run` — Returns `503` until an isolated execution service is configured.
- `POST /api/questions/:questionId/submit` — Saves a submission with `PENDING` evaluation status.

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
- **Code Execution Disabled**: The API does not run untrusted submissions until an isolated runner is available.
