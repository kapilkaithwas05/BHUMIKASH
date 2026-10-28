import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, FlaskConical, List, Search, Users, LayoutGrid, BookOpen } from "lucide-react";
import { api } from "../services/api";
import { Examination, Lab } from "../types";

type CatalogKind = "labs" | "examinations";
type CatalogExam = Examination & { catalogLab: Lab };
type StatusFilter = "All" | "Published" | "Draft" | "Archived" | "Upcoming" | "In progress" | "Closed";

const getExamStatus = (exam: Examination): Exclude<StatusFilter, "All" | "Published"> => {
  if (!exam.isPublished) return "Draft";
  const now = Date.now();
  if (now < new Date(exam.startTime).getTime()) return "Upcoming";
  if (now <= new Date(exam.endTime).getTime()) return "In progress";
  return "Closed";
};

const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
}).format(new Date(value));

export const AssessmentCatalog: React.FC<{ kind: CatalogKind }> = ({ kind }) => {
  const isExams = kind === "examinations";
  const [labs, setLabs] = useState<Lab[]>([]);
  const [exams, setExams] = useState<CatalogExam[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [sort, setSort] = useState("Title");
  const [listView, setListView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.getLabs().then(async (result) => {
      const loadedExams = await Promise.all(result.labs.map(async (lab) => {
        const response = await api.getLabExaminations(lab.id).catch(() => ({ examinations: [], serverTime: "" }));
        return response.examinations.map((exam) => ({ ...exam, catalogLab: lab }));
      }));
      if (!active) return;
      setLabs(result.labs);
      setExams(loadedExams.flat());
    }).catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Could not load records."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filteredLabs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return labs.filter((lab) => {
      const labStatus = lab.archivedAt ? "Archived" : lab.isPublished ? "Published" : "Draft";
      const matchesStatus = status === "All" || status === labStatus;
      const matchesQuery = !normalized || [lab.title, lab.code, lab.description, lab.language, lab.department?.name]
        .some((value) => value?.toLowerCase().includes(normalized));
      return matchesStatus && matchesQuery;
    }).sort((a, b) => sort === "Identifier"
      ? (a.code || a.title).localeCompare(b.code || b.title)
      : sort === "Status"
        ? Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)) || Number(b.isPublished) - Number(a.isPublished) || a.title.localeCompare(b.title)
        : a.title.localeCompare(b.title));
  }, [labs, query, sort, status]);

  const filteredExams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return exams.filter((exam) => {
      const examStatus = getExamStatus(exam);
      const matchesStatus = status === "All" || examStatus === status;
      const matchesQuery = !normalized || [exam.title, exam.description, exam.catalogLab.title, exam.catalogLab.code, exam.catalogLab.language]
        .some((value) => value?.toLowerCase().includes(normalized));
      return matchesStatus && matchesQuery;
    }).sort((a, b) => sort === "Status"
      ? getExamStatus(a).localeCompare(getExamStatus(b)) || a.title.localeCompare(b.title)
      : sort === "Identifier"
        ? (a.catalogLab.code || a.catalogLab.title).localeCompare(b.catalogLab.code || b.catalogLab.title)
        : a.title.localeCompare(b.title));
  }, [exams, query, sort, status]);

  const count = isExams ? filteredExams.length : filteredLabs.length;
  const statusOptions: StatusFilter[] = isExams
    ? ["All", "Draft", "Upcoming", "In progress", "Closed"]
    : ["All", "Published", "Draft", "Archived"];

  return (
    <div className="workspace-page catalog-page">
      <header className="workspace-heading">
        <div>
          <p className="workspace-eyebrow">{isExams ? "Assessment schedule" : "Academic workspace"}</p>
          <h1>{isExams ? "Examinations" : "Laboratories"}</h1>
          <p className="workspace-description">{isExams ? "Browse assessment schedules and check publication status." : "Browse your assigned laboratories and course workspaces."}</p>
        </div>
        <div className="catalog-count"><strong>{count}</strong><span>{count === 1 ? "record" : "records"}</span></div>
      </header>

      <section className="catalog-toolbar" aria-label="Filter records">
        <label className="catalog-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isExams ? "Search title, course or identifier" : "Search laboratory, course or identifier"} /></label>
        <label className="catalog-select"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="catalog-select"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Title</option><option>Status</option><option>Identifier</option></select></label>
        <button className="catalog-view-toggle" type="button" aria-label={listView ? "Switch to card view" : "Switch to list view"} onClick={() => setListView((value) => !value)}>{listView ? <LayoutGrid /> : <List />}{listView ? "Cards" : "List"}</button>
      </section>

      <div className="catalog-results-caption">{loading ? "Loading records…" : `${count} matching ${isExams ? "assessment" : "laboratory"}${count === 1 ? "" : " records"}`}</div>
      {error && <div className="workspace-message workspace-error" role="alert">{error}</div>}
      {!loading && !error && count === 0 && <div className="workspace-empty catalog-empty"><span>{isExams ? <CalendarDays /> : <FlaskConical />}</span><strong>No matching records</strong><p>Try a different search term or status filter.</p></div>}

      {!loading && !error && count > 0 && (isExams
        ? listView
          ? <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Assessment</th><th>Course</th><th>Schedule</th><th>Duration</th><th>Status</th><th /></tr></thead><tbody>{filteredExams.map((exam) => <tr key={exam.id}><td><strong>{exam.title}</strong><span>{exam.catalogLab.code || "Assessment"}</span></td><td>{exam.catalogLab.title}</td><td>{formatDate(exam.startTime)}</td><td>{exam.durationMinutes} min</td><td><span className={`workspace-status status-${getExamStatus(exam).toLowerCase().replace(/ /g, "-")}`}>{getExamStatus(exam)}</span></td><td><Link className="workspace-row-link" to={`/examinations/${exam.id}`}>Details<ArrowRight /></Link></td></tr>)}</tbody></table></div>
          : <div className="catalog-card-grid">{filteredExams.map((exam) => <article className="catalog-record-card" key={exam.id}><div className="catalog-record-meta"><span className="workspace-code">Exam · {exam.catalogLab.code || exam.catalogLab.title}</span><span className={`workspace-status status-${getExamStatus(exam).toLowerCase().replace(/ /g, "-")}`}>{getExamStatus(exam)}</span></div><h2>{exam.title}</h2><p className="catalog-record-subtitle">{exam.catalogLab.title} · {exam.catalogLab.language === "CPP" ? "C++" : exam.catalogLab.language}</p><div className="catalog-record-facts"><span><CalendarDays />{formatDate(exam.startTime)}</span><span><ClockMark />{exam.durationMinutes} min</span><span><BookOpen />{exam.questions?.length || 0} questions</span></div><Link className="catalog-record-action" to={`/examinations/${exam.id}`}>View assessment<ArrowRight /></Link></article>)}</div>
        : listView
          ? <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Laboratory</th><th>Course</th><th>Language</th><th>Questions</th><th>Students</th><th>Status</th><th /></tr></thead><tbody>{filteredLabs.map((lab) => { const label = lab.archivedAt ? "Archived" : lab.isPublished ? "Published" : "Draft"; return <tr key={lab.id}><td><strong>{lab.title}</strong><span>{lab.code || "Laboratory"}</span></td><td>{lab.department?.name || "Course workspace"}</td><td>{lab.language === "CPP" ? "C++" : lab.language}</td><td>{lab._count?.questions || 0}</td><td>{lab._count?.enrollments ?? "—"}</td><td><span className={`workspace-status status-${lab.archivedAt ? "draft" : lab.isPublished ? "published" : "draft"}`}>{label}</span></td><td><Link className="workspace-row-link" to={`/labs/${lab.id}`}>{lab.archivedAt ? "Restore" : "Details"}<ArrowRight /></Link></td></tr>; })}</tbody></table></div>
          : <div className="catalog-card-grid">{filteredLabs.map((lab) => { const label = lab.archivedAt ? "Archived" : lab.isPublished ? "Published" : "Draft"; return <article className="catalog-record-card" key={lab.id}><div className="catalog-record-meta"><span className="workspace-code">Lab · {lab.code || lab.language}</span><span className={`workspace-status status-${lab.archivedAt ? "draft" : lab.isPublished ? "published" : "draft"}`}>{label}</span></div><h2>{lab.title}</h2><p className="catalog-record-subtitle">{lab.department?.name || "Course workspace"} · {lab.language === "CPP" ? "C++" : lab.language}</p><p className="catalog-record-description">{lab.description || "Open this lab to view assignments and practical work."}</p><div className="catalog-record-facts"><span><BookOpen />{lab._count?.questions || 0} questions</span>{lab._count?.enrollments !== undefined && <span><Users />{lab._count.enrollments} students</span>}<span><CalendarDays />{lab._count?.examinations || 0} exams</span></div><Link className="catalog-record-action" to={`/labs/${lab.id}`}>{lab.archivedAt ? "RESTORE LAB" : "MANAGE LAB"}<ArrowRight /></Link></article>; })}</div>
      )}
    </div>
  );
};

function ClockMark() {
  return <span className="catalog-clock-icon">◷</span>;
}
