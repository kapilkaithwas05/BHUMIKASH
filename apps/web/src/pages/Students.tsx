import React, { useEffect, useState } from "react";
import { Search, Users, ChevronLeft, ChevronRight, RefreshCw, UserCheck, UserX } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

type StudentRow = {
  id: string; name: string; email: string; rollNumber?: string | null; isActive: boolean;
  department?: { name: string; code: string } | null;
  studentProfile?: { enrollmentNumber: string; instituteId?: string | null; program?: { code: string; name: string } | null; cohort?: { semester: number; section: string; academicYear: { label: string } } | null } | null;
};

export const Students: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const cohortId = new URLSearchParams(window.location.search).get("cohortId") || undefined;
  const programId = new URLSearchParams(window.location.search).get("programId") || undefined;

  const load = async (nextPage = page, query = search) => {
    setLoading(true); setError("");
    try {
      const result = await api.getStudents(nextPage, query, { cohortId, programId });
      setStudents(result.students); setPages(Math.max(1, result.pagination.pages)); setTotal(result.pagination.total);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load students"); }
    finally { setLoading(false); }
  };

  useEffect(() => { const timer = window.setTimeout(() => { void load(page, search); }, search ? 250 : 0); return () => window.clearTimeout(timer); }, [page, search, cohortId, programId]);

  const toggleStatus = async (student: StudentRow) => {
    setBusyId(student.id);
    try { await api.setStudentActive(student.id, !student.isActive); await load(page, search); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update account status"); }
    finally { setBusyId(""); }
  };

  return <div className="workspace-page students-page space-y-6 animate-in fade-in duration-300">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Academic directory</p><h1 className="text-3xl font-black mt-1">{cohortId ? "Section students" : programId ? "Branch students" : "Students"}</h1><p className="text-sm text-slate-500 mt-2">Department scoped student records. {user?.role === "HOD" ? "Your view is limited to your department." : "Institution wide view."}</p></div>
      <div className="text-sm font-semibold text-slate-500">{total.toLocaleString()} records</div>
    </header>
    <section className="portal-card p-4">
      <label className="relative block max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input aria-label="Search students" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, or enrollment number" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"/></label>
    </section>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    <section className="portal-card overflow-hidden">
      <div className="overflow-x-auto"><table className="workspace-table w-full text-left text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Student</th><th className="px-5 py-4">Enrollment</th><th className="px-5 py-4">Program / cohort</th><th className="px-5 py-4">Department</th><th className="px-5 py-4">Status</th>{user?.role === "VICE_CHANCELLOR" && <th className="px-5 py-4">Account</th>}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? <tr><td colSpan={user?.role === "VICE_CHANCELLOR" ? 6 : 5} className="px-5 py-12 text-center text-slate-500"><RefreshCw className="inline w-4 h-4 mr-2 animate-spin"/>Loading students…</td></tr> : students.length === 0 ? <tr><td colSpan={user?.role === "VICE_CHANCELLOR" ? 6 : 5} className="px-5 py-12 text-center text-slate-500"><Users className="inline w-4 h-4 mr-2"/>No student records found.</td></tr> : students.map(s => <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"><td className="px-5 py-4"><div className="font-semibold">{s.name}</div><div className="text-xs text-slate-500 mt-1">{s.email}</div></td><td className="px-5 py-4 font-mono text-xs">{s.studentProfile?.enrollmentNumber || s.rollNumber || "—"}</td><td className="px-5 py-4">{s.studentProfile?.program ? <><div>{s.studentProfile.program.code}</div><div className="text-xs text-slate-500 mt-1">{s.studentProfile.cohort ? `${s.studentProfile.cohort.academicYear.label} · Sem ${s.studentProfile.cohort.semester} · ${s.studentProfile.cohort.section}` : s.studentProfile.program.name}</div></> : <span className="text-slate-400">Not assigned</span>}</td><td className="px-5 py-4">{s.department?.name || "—"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{s.isActive ? "Active" : "Inactive"}</span></td>{user?.role === "VICE_CHANCELLOR" && <td className="px-5 py-4"><button disabled={busyId === s.id} onClick={() => void toggleStatus(s)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold disabled:opacity-50">{s.isActive ? <UserX className="w-3.5 h-3.5"/> : <UserCheck className="w-3.5 h-3.5"/>}{s.isActive ? "Deactivate" : "Activate"}</button></td>}</tr>)}
        </tbody>
      </table></div>
      <footer className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-5 py-4"><span className="text-xs text-slate-500">Page {page} of {pages}</span><div className="flex gap-2"><button aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 disabled:opacity-40"><ChevronLeft className="w-4 h-4"/></button><button aria-label="Next page" disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button></div></footer>
    </section>
  </div>;
};
