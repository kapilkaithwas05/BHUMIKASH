import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FlaskConical,
  GraduationCap,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Examination, Lab, Notification, Submission } from "../types";

type DepartmentAnalytics = {
  department: {
    id: string; name: string; code: string;
    programs?: Array<{
      id: string; name: string; code: string;
      cohorts: Array<{
        id: string; semester: number; section: string; academicYear: { label: string };
        _count: { students: number; labs: number };
        labs: Array<Lab & { facultyAssignments?: Array<{ faculty: { user: { id: string; name: string } } }> }>;
      }>;
    }>;
  } | null;
  overview: {
    facultyCount: number;
    studentCount: number;
    labCount: number;
    examCount: number;
    totalSubmissions: number;
    acceptedSubmissions: number;
    passRate: number;
  };
  facultyList: Array<{ id: string; name: string; email: string; facultyProfile?: { labAssignments: Array<{
    lab: Lab & { facultyAssignments?: Array<{ faculty: { user: { id: string; name: string } } }> };
  }> } | null }>;
  labs: Lab[];
  examinations: Examination[];
};

type InstitutionAnalytics = {
  overview: {
    totalDepartments: number;
    totalFaculty: number;
    totalStudents: number;
    totalLabs: number;
    totalExaminations: number;
    totalSubmissions: number;
    acceptedSubmissions: number;
    passRate: number;
  };
  departmentStats: Array<{
    id: string;
    name: string;
    code: string;
    studentCount: number;
    facultyCount: number;
    labCount: number;
    submissionsCount: number;
  }>;
  recentSubmissions: Array<{
    id: string;
    submittedAt: string;
    language: string;
    status: string;
    score: number;
    totalTests: number;
    lab: { title: string; code?: string | null };
    question: { title: string };
  }>;
};

const formatDate = (value: string, includeTime = false) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

const examState = (exam: Examination) => {
  const now = Date.now();
  if (now < new Date(exam.startTime).getTime()) return "Upcoming";
  if (now <= new Date(exam.endTime).getTime()) return "In progress";
  return "Closed";
};

const labAcademicLabel = (lab: Lab) => [
  lab.cohort?.program?.code || lab.course?.code,
  lab.cohort ? `Sem ${lab.cohort.semester}` : null,
  lab.cohort?.section ? `Section ${lab.cohort.section}` : null,
  lab.cohort?.academicYear?.label,
].filter(Boolean).join(" · ");

export const PortalDashboard: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === "VICE_CHANCELLOR") return <InstitutionHome />;
  if (user?.role === "HOD") return <DepartmentHome />;
  if (user?.role === "FACULTY") return <FacultyHome />;
  return <StudentHome />;
};

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="workspace-heading">
      <div>
        <p className="workspace-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="workspace-description">{description}</p>
      </div>
      <div className="workspace-date"><CalendarDays aria-hidden="true" />{formatDate(new Date().toISOString())}</div>
    </header>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const content = (
    <>
      <div className="workspace-metric-top"><span>{label}</span><span className="workspace-metric-icon">{icon}</span></div>
      <strong>{value}</strong>
      <span className="workspace-metric-detail">{detail}</span>
    </>
  );
  return href ? <Link className="workspace-metric" to={href}>{content}</Link> : <article className="workspace-metric">{content}</article>;
}

function SectionHeading({ title, action, href }: { title: string; action?: string; href?: string }) {
  return (
    <div className="workspace-section-heading">
      <h2>{title}</h2>
      {action && href && <Link to={href}>{action}<ArrowRight aria-hidden="true" /></Link>}
    </div>
  );
}

function LoadState({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <div className="workspace-message" role="status"><span className="workspace-spinner" />Loading your workspace…</div>;
  if (error) return <div className="workspace-message workspace-error" role="alert">{error}</div>;
  return null;
}

function StudentHome() {
  const { user } = useAuth();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [exams, setExams] = useState<Examination[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [submissions, setSubmissions] = useState<Array<Submission & { lab: { id: string; title: string; code?: string | null } }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = () => {
      setLoading(true);
      setError("");
      Promise.all([api.getLabs(), api.getNotifications(), api.getSubmissions()])
        .then(async ([labResult, notificationResult, submissionResult]) => {
        const examResults = await Promise.all(
          labResult.labs.map((lab) => api.getLabExaminations(lab.id).catch(() => ({ examinations: [], serverTime: "" })))
        );
        if (!active) return;
        setLabs(labResult.labs);
        setExams(examResults.flatMap((result) => result.examinations).filter((exam) => exam.isPublished));
        setNotifications(notificationResult.notifications.slice(0, 4));
        setUnreadCount(notificationResult.unreadCount);
        setSubmissions(submissionResult.submissions);
      })
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Could not load your workspace."))
      .finally(() => active && setLoading(false));
    };
    window.addEventListener("labnexus:labs-changed", load);
    load();
    return () => { active = false; window.removeEventListener("labnexus:labs-changed", load); };
  }, []);

  const sortedExams = useMemo(() => [...exams].sort((a, b) => a.startTime.localeCompare(b.startTime)), [exams]);
  const questionCount = labs.reduce((total, lab) => total + (lab._count?.questions || 0), 0);
  const openLabs = labs.filter((lab) => lab.isPublished).length;

  return (
    <div id="overview" className="workspace-page">
      <PageHeading eyebrow="Student workspace" title={`Good day, ${user?.name.split(" ")[0] || "Student"}`} description="Your enrolled coding labs and published assessments, all in one place." />
      <LoadState loading={loading} error={error} />
      {!loading && !error && <>
        <section className="workspace-metrics" aria-label="Student overview">
          <Metric label="Assigned labs" value={labs.length} detail={`${openLabs} published`} icon={<FlaskConical />} href="/#labs" />
          <Metric label="Upcoming exams" value={exams.filter((exam) => examState(exam) !== "Closed").length} detail="Across your enrolled labs" icon={<CalendarDays />} href="/#exams" />
          <Metric label="Practice questions" value={questionCount} detail="In your assigned labs" icon={<BookOpen />} href="/#labs" />
          <Metric label="Notifications" value={unreadCount} detail="Unread updates" icon={<CheckCircle2 />} href="/notifications" />
        </section>

        <section id="exams" className="workspace-section">
          <SectionHeading title="Upcoming assessments" action="Explore labs" href="/#labs" />
          {sortedExams.length === 0 ? <EmptyPanel title="No assessments scheduled" detail="Published assessments for your enrolled labs will appear here." /> : (
            <div className="workspace-table-wrap"><table className="workspace-table">
              <thead><tr><th>Assessment</th><th>Laboratory</th><th>Schedule</th><th>Duration</th><th>Status</th><th /></tr></thead>
              <tbody>{sortedExams.slice(0, 6).map((exam) => <tr key={exam.id}>
                <td><strong>{exam.title}</strong><span>{exam.description || "Coding assessment"}</span></td>
                <td>{labs.find((lab) => lab.id === exam.labId)?.title || "Laboratory"}</td>
                <td>{formatDate(exam.startTime, true)}</td>
                <td>{exam.durationMinutes} min</td>
                <td><StatusPill status={examState(exam)} /></td>
                <td><Link className="workspace-row-link" to={`/examinations/${exam.id}`}>Details<ArrowRight /></Link></td>
              </tr>)}</tbody>
            </table></div>
          )}
        </section>

        <div className="workspace-two-column">
          <section id="labs" className="workspace-section">
            <SectionHeading title="MY LABS" action="View all" href="/#labs" />
            {labs.length === 0 ? <EmptyPanel title="No labs assigned yet" detail="Join a lab with the enrollment key shared by your instructor." /> : <div className="workspace-lab-list">
              {labs.slice(0, 4).map((lab) => <Link className="workspace-lab-row" key={lab.id} to={`/labs/${lab.id}`}>
                <span className="workspace-list-icon"><FlaskConical /></span><span className="workspace-list-main"><strong>{lab.title}</strong><small>{labAcademicLabel(lab) || lab.code || lab.language} · {lab._count?.questions || 0} questions</small></span><StatusPill status={lab.isPublished ? "Published" : "Draft"} /><ArrowRight className="workspace-row-arrow" />
              </Link>)}
            </div>}
          </section>
          <section className="workspace-section">
            <SectionHeading title="Recent activity" action="Notifications" href="/notifications" />
            {notifications.length === 0 ? <EmptyPanel title="You’re all caught up" detail="New lab and assessment updates will appear here." /> : <div className="workspace-activity-list">
              {notifications.map((item) => <article className="workspace-activity" key={item.id}><span className="workspace-activity-dot" /><div><strong>{item.title}</strong><p>{item.message}</p><small>{formatDate(item.createdAt, true)}</small></div></article>)}
            </div>}
          </section>
        </div>
        <section id="attempts" className="workspace-section">
          <SectionHeading title="My previous attempts" action="View my labs" href="/#labs" />
          {submissions.length === 0 ? <EmptyPanel title="No attempts yet" detail="Questions you submit will be saved here so you can reopen them later." /> : (
            <div className="workspace-panel workspace-recent-list">
              {submissions.slice(0, 8).map((submission) => <article className="workspace-recent-row" key={submission.id}>
                <span className="workspace-activity-dot" />
                <div className="workspace-list-main">
                  <strong>{submission.question?.title || "Programming question"}</strong>
                  <small>{submission.lab.code || submission.lab.title} · {formatDate(submission.submittedAt, true)}</small>
                </div>
                <StatusPill status={submission.status.replace(/_/g, " ")} />
                <Link className="workspace-row-link" to={`/questions/${submission.questionId}`}>Open question<ArrowRight /></Link>
              </article>)}
            </div>
          )}
        </section>
      </>}
    </div>
  );
}

function FacultyHome() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [exams, setExams] = useState<Array<Examination & { workspaceLab: Lab }>>([]);
  const [submissions, setSubmissions] = useState<Array<{
    id: string; submittedAt: string; language: string; status: string; score: number;
    student: { id: string; name: string; email: string; rollNumber?: string | null };
    lab: { id: string; title: string; code?: string | null };
    question: { id: string; title: string; marks: number };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = () => {
      setLoading(true);
      setError("");
      api.getLabs().then(async (result) => {
      const labExams = await Promise.all(result.labs.map(async (lab) => {
        const response = await api.getLabExaminations(lab.id).catch(() => ({ examinations: [], serverTime: "" }));
        return response.examinations.map((exam) => ({ ...exam, workspaceLab: lab }));
      }));
      const submissionResult = await api.getSubmissions();
      if (!active) return;
      setLabs(result.labs);
      setExams(labExams.flat().filter((exam) => exam.isPublished).sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setSubmissions(submissionResult.submissions);
    }).catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Could not load faculty workspace."))
      .finally(() => active && setLoading(false));
    };
    window.addEventListener("labnexus:labs-changed", load);
    load();
    return () => { active = false; window.removeEventListener("labnexus:labs-changed", load); };
  }, []);

  const studentCount = labs.reduce((total, lab) => total + (lab._count?.enrollments || 0), 0);
  const activeLabs = labs.filter((lab) => lab.isPublished).length;

  return (
    <div id="overview" className="workspace-page">
      <PageHeading eyebrow="Faculty workspace" title="Teaching overview" description="Manage your laboratories, student enrollment, and upcoming assessments." />
      <LoadState loading={loading} error={error} />
      {!loading && !error && <>
        <section className="workspace-metrics" aria-label="Teaching overview">
          <Metric label="Total labs" value={labs.length} detail={`${activeLabs} published`} icon={<FlaskConical />} href="/#labs" />
          <Metric label="Upcoming exams" value={exams.filter((exam) => examState(exam) !== "Closed").length} detail="Across your labs" icon={<CalendarDays />} href="/#schedule" />
          <Metric label="Enrolled students" value={studentCount} detail="Across all laboratories" icon={<Users />} href="/#labs" />
          <Metric label="Questions" value={labs.reduce((sum, lab) => sum + (lab._count?.questions || 0), 0)} detail="In your question bank" icon={<BookOpen />} href="/#labs" />
        </section>

        <section id="schedule" className="workspace-section">
          <SectionHeading title="Upcoming schedule" action="View all labs" href="/#labs" />
          {exams.length === 0 ? <EmptyPanel title="No upcoming assessments" detail="Published assessments will appear here once scheduled." /> : <div className="workspace-schedule-list">
            {exams.slice(0, 5).map((exam) => <article className="workspace-schedule-row" key={exam.id}>
              <div className="workspace-date-block"><strong>{new Date(exam.startTime).toLocaleDateString("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" })}</strong><span>{new Date(exam.startTime).toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" })}</span></div>
              <div className="workspace-list-main"><strong>{exam.title}</strong><small>{exam.workspaceLab.code || exam.workspaceLab.title} · {formatDate(exam.startTime, true)} · {exam.durationMinutes} min</small></div>
              <StatusPill status={examState(exam)} /><Link className="workspace-row-link" to={`/examinations/${exam.id}/results`}>Results<ArrowRight /></Link>
            </article>)}
          </div>}
        </section>

        <section id="submissions" className="workspace-section">
          <SectionHeading title="Recent student submissions" action="Open a laboratory" href="/#labs" />
          {submissions.length === 0 ? <EmptyPanel title="No submissions yet" detail="Formal student submissions for your labs will appear here." /> : (
            <div className="workspace-panel workspace-recent-list">
              {submissions.slice(0, 8).map((submission) => <article className="workspace-recent-row" key={submission.id}>
                <span className="workspace-activity-dot" />
                <div className="workspace-list-main">
                  <strong>{submission.student.name} · {submission.question.title}</strong>
                  <small>{submission.lab.code || submission.lab.title} · {submission.language} · {formatDate(submission.submittedAt, true)}</small>
                </div>
                <StatusPill status={submission.status} />
                <Link className="workspace-row-link" to={`/labs/${submission.lab.id}`}>Review<ArrowRight /></Link>
              </article>)}
            </div>
          )}
        </section>

        <section id="labs" className="workspace-section">
          <SectionHeading title="MY LABS" action="Manage labs" href="/#labs" />
          {labs.length === 0 ? <EmptyPanel title="Create your first laboratory" detail="Use Create Lab in the navigation to set up a course workspace." /> : <div className="workspace-lab-grid">
            {labs.map((lab) => <Link className="workspace-lab-card" to={`/labs/${lab.id}`} key={lab.id}>
              <div className="workspace-lab-card-head"><span className="workspace-code">{lab.code || lab.language}</span><StatusPill status={lab.isPublished ? "Published" : "Draft"} /></div>
              <h3>{lab.title}</h3><p>{lab.description || "Programming laboratory"}</p>
              {labAcademicLabel(lab) && <p className="!mt-1 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">{labAcademicLabel(lab)}</p>}
              <div className="workspace-lab-stats"><span><BookOpen />{lab._count?.questions || 0} questions</span><span><Users />{lab._count?.enrollments || 0} students</span><span><CalendarDays />{lab._count?.examinations || 0} exams</span></div>
              <span className="workspace-card-action">MANAGE LAB<ArrowRight /></span>
            </Link>)}
          </div>}
        </section>
      </>}
    </div>
  );
}

function DepartmentHome() {
  const [data, setData] = useState<DepartmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.getDepartmentAnalytics().then((result) => active && setData(result as DepartmentAnalytics))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Could not load department overview."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const upcoming = (data?.examinations || []).filter((exam) => exam.isPublished && examState(exam) !== "Closed").sort((a, b) => a.startTime.localeCompare(b.startTime));
  const labGroups = Object.entries((data?.labs || []).reduce<Record<string, number>>((counts, lab) => {
    counts[lab.language] = (counts[lab.language] || 0) + 1;
    return counts;
  }, {}));
  const maxGroup = Math.max(1, ...labGroups.map(([, count]) => count));

  return (
    <div id="overview" className="workspace-page">
      <PageHeading eyebrow={`Department · ${data?.department?.code || "Overview"}`} title={data?.department?.name || "Department overview"} description="A clear view of faculty activity, laboratories, and scheduled assessments in your department." />
      <LoadState loading={loading} error={error} />
      {!loading && data && <>
        <section className="workspace-metrics" aria-label="Department overview">
          <Metric label="Faculty members" value={data.overview.facultyCount} detail="In this department" icon={<GraduationCap />} href="/#faculty" />
          <Metric label="Laboratories" value={data.overview.labCount} detail="Department-wide" icon={<FlaskConical />} href="/#labs" />
          <Metric label="Scheduled exams" value={data.overview.examCount} detail="Across all courses" icon={<CalendarDays />} href="/#exams" />
          <Metric label="Students" value={data.overview.studentCount} detail="Department records" icon={<Users />} href="/students" />
        </section>

        <section className="workspace-section" aria-label="Academic programs and cohorts">
          <SectionHeading title="Branches, semesters & sections" />
          {(data.department?.programs || []).length === 0 ? (
            <EmptyPanel title="No academic cohorts configured" detail="Add programs and cohorts to the department data to organize labs by branch, semester, and section." />
          ) : <div className="workspace-lab-grid">
            {data.department?.programs?.map((program) => <article className="workspace-lab-card" key={program.id}>
              <div className="workspace-lab-card-head"><span className="workspace-code">{program.code}</span><span className="workspace-status">{program.cohorts.length} cohorts</span></div>
              <h3>{program.name}</h3>
              <div className="space-y-3">
                {program.cohorts.map((cohort) => <div key={cohort.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">Semester {cohort.semester} · Section {cohort.section}</strong><span className="text-xs text-slate-500">{cohort.academicYear.label} · {cohort._count.students} students · {cohort._count.labs} labs</span></div>
                  <Link to={`/students?cohortId=${encodeURIComponent(cohort.id)}`} className="mt-3 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-indigo-600 dark:border-slate-700">View section students</Link>
                  {cohort.labs.length > 0 && <div className="mt-3 space-y-2">{cohort.labs.map((lab) => <Link key={lab.id} to={`/labs/${lab.id}`} className="block rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800/70"><strong className="block">{lab.title}</strong><span className="text-slate-500">{lab.facultyAssignments?.map(({ faculty }) => faculty.user.name).join(", ") || "No teaching team assigned"}</span></Link>)}</div>}
                </div>)}
              </div>
            </article>)}
          </div>}
        </section>

        <div className="workspace-two-column">
          <section id="labs" className="workspace-section">
            <SectionHeading title="Laboratory distribution" action="View laboratories" href="/#labs" />
            <div className="workspace-panel workspace-bars-panel">
              <p className="workspace-panel-note">Laboratories grouped by programming language.</p>
              {labGroups.length === 0 ? <EmptyPanel title="No department laboratories yet" detail="Laboratory activity will appear here." /> : labGroups.map(([language, count]) => <div className="workspace-bar-row" key={language}>
                <div><strong>{language === "CPP" ? "C++" : language}</strong><span>{count} {count === 1 ? "lab" : "labs"}</span></div>
                <div className="workspace-bar-track"><span style={{ width: `${Math.max(10, (count / maxGroup) * 100)}%` }} /></div>
              </div>)}
            </div>
            <div id="exams" className="workspace-exam-section">
              <SectionHeading title="Upcoming examinations" action="View schedule" href="/#exams" />
              <ExamList exams={upcoming.slice(0, 4)} emptyTitle="No upcoming exams" emptyDetail="Scheduled department assessments will appear here." />
            </div>
          </section>
          <section id="faculty" className="workspace-section">
            <SectionHeading title="Faculty" action="Student directory" href="/students" />
            <div className="workspace-panel">
              {data.facultyList.length === 0 ? <EmptyPanel title="No faculty records" detail="Faculty assigned to this department will appear here." /> : data.facultyList.slice(0, 8).map((faculty) => <details className="workspace-person-row group" key={faculty.id}>
                <summary className="flex min-w-0 cursor-pointer list-none items-center gap-3">
                  <span className="workspace-avatar">{faculty.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><strong className="block">{faculty.name}</strong><small className="block">{faculty.email}</small></span><span className="ml-auto text-xs text-indigo-600">{faculty.facultyProfile?.labAssignments.length || 0} assigned labs</span>
                </summary>
                <div className="mt-3 w-full space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                  {(faculty.facultyProfile?.labAssignments || []).length === 0 ? <p className="text-xs text-slate-500">No lab assignments recorded.</p> : faculty.facultyProfile?.labAssignments.map(({ lab }) => <Link key={lab.id} to={`/labs/${lab.id}`} className="block rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/70">
                    <strong className="block">{lab.title}</strong>
                    <span className="text-slate-500">{lab.cohort?.program?.code || lab.course?.code || lab.department?.code || "Course"}{lab.cohort ? ` · Semester ${lab.cohort.semester} · Section ${lab.cohort.section} · ${lab.cohort.academicYear?.label || ""}` : ""} · {lab._count?.enrollments || 0} students</span>
                    <span className="block text-slate-500">Teaching team: {lab.facultyAssignments?.map(({ faculty: assigned }) => assigned.user.name).join(", ") || "No co-teachers assigned"}</span>
                  </Link>)}
                </div>
              </details>)}
            </div>
            <div className="workspace-note-card"><Building2 /><div><strong>Department reporting</strong><p>Figures reflect records available to your department account.</p></div></div>
          </section>
        </div>
      </>}
    </div>
  );
}

function InstitutionHome() {
  const [data, setData] = useState<InstitutionAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; entity: string; details?: string | null; createdAt: string; user?: { name: string; role: string } | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.getInstitutionAnalytics(), api.getAuditLogs()]).then(([result, audit]) => {
      if (!active) return;
      setData(result as InstitutionAnalytics);
      setAuditLogs(audit.logs);
    })
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Could not load institutional overview."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const maxLabs = Math.max(1, ...(data?.departmentStats || []).map((dept) => dept.labCount));

  return (
    <div id="overview" className="workspace-page">
      <PageHeading eyebrow="Institution · Overview" title="Institution overview" description="University-wide laboratory activity and assessment participation." />
      <LoadState loading={loading} error={error} />
      {!loading && data && <>
        <section className="workspace-metrics" aria-label="Institution overview">
          <Metric label="Departments" value={data.overview.totalDepartments} detail="Across the institution" icon={<Building2 />} href="/#departments" />
          <Metric label="Faculty members" value={data.overview.totalFaculty} detail="Registered faculty" icon={<GraduationCap />} />
          <Metric label="Laboratories" value={data.overview.totalLabs} detail="All departments" icon={<FlaskConical />} href="/#departments" />
          <Metric label="Scheduled exams" value={data.overview.totalExaminations} detail="Institution-wide" icon={<CalendarDays />} />
        </section>

        <div className="workspace-two-column">
          <section id="departments" className="workspace-section">
            <SectionHeading title="Department comparison" action="Student directory" href="/students" />
            <div className="workspace-panel workspace-bars-panel">
              <p className="workspace-panel-note">Laboratory distribution by department.</p>
              {data.departmentStats.length === 0 ? <EmptyPanel title="No departments available" detail="Department activity will appear when records are created." /> : data.departmentStats.slice(0, 8).map((dept) => <div className="workspace-bar-row" key={dept.id}>
                <div><strong>{dept.name}</strong><span>{dept.labCount} labs · {dept.facultyCount} faculty</span></div>
                <div className="workspace-bar-track"><span style={{ width: `${Math.max(5, (dept.labCount / maxLabs) * 100)}%` }} /></div>
              </div>)}
            </div>
          </section>
          <section id="submissions" className="workspace-section">
            <SectionHeading title="Recent submissions" action="View submissions" href="/#submissions" />
            {data.recentSubmissions.length === 0 ? <EmptyPanel title="No submissions yet" detail="Recent student submissions will appear here." /> : <div className="workspace-panel workspace-recent-list">
              {data.recentSubmissions.slice(0, 6).map((submission) => <article className="workspace-recent-row" key={submission.id}>
                <span className="workspace-list-icon"><Code2Icon /></span><span className="workspace-list-main"><strong>Student submission</strong><small>{submission.lab.title} · {submission.question.title}</small></span><StatusPill status={submission.status.replace(/_/g, " ")} /><span className="workspace-score">{submission.status === "PENDING" ? "Not released" : `${submission.score} pts`}</span>
              </article>)}
            </div>}
          </section>
        </div>
        <section id="audit" className="workspace-section">
          <SectionHeading title="Recent audit activity" />
          {auditLogs.length === 0 ? <EmptyPanel title="No audit activity recorded" detail="Administrative events will appear here when audit logging is connected." /> : <div className="workspace-table-wrap"><table className="workspace-table">
            <thead><tr><th>Activity</th><th>Performed by</th><th>Record</th><th>Date</th></tr></thead>
            <tbody>{auditLogs.slice(0, 6).map((log) => <tr key={log.id}><td><strong>{log.action}</strong><span>{log.details || "Administrative activity"}</span></td><td>{log.user?.name || "System"}</td><td>{log.entity}</td><td>{formatDate(log.createdAt, true)}</td></tr>)}</tbody>
          </table></div>}
        </section>
      </>}
    </div>
  );
}

function ExamList({ exams, emptyTitle, emptyDetail }: { exams: Examination[]; emptyTitle: string; emptyDetail: string }) {
  if (!exams.length) return <EmptyPanel title={emptyTitle} detail={emptyDetail} />;
  return <div className="workspace-schedule-list">{exams.map((exam) => <article className="workspace-schedule-row" key={exam.id}>
    <div className="workspace-date-block"><strong>{new Date(exam.startTime).toLocaleDateString("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" })}</strong><span>{new Date(exam.startTime).toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" })}</span></div>
    <div className="workspace-list-main"><strong>{exam.title}</strong><small>{formatDate(exam.startTime, true)} · {exam.durationMinutes} min</small></div><StatusPill status={examState(exam)} />
  </article>)}</div>;
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return <div className="workspace-empty"><span><Clock3 /></span><strong>{title}</strong><p>{detail}</p></div>;
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/ /g, "-");
  return <span className={`workspace-status status-${normalized}`}>{status}</span>;
}

function Code2Icon() {
  return <span className="workspace-code-icon">&lt;/&gt;</span>;
}
