import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Lab, Examination, Submission } from "../types";
import { Badge } from "../components/Badge";
import { Timer } from "../components/Timer";
import {
  FlaskConical,
  Calendar,
  Users,
  Code2,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Building,
  ShieldCheck,
  Clock,
  Sparkles,
  FileText,
  AlertTriangle,
  GraduationCap,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  BookOpen,
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === "VICE_CHANCELLOR") {
    return <ViceChancellorDashboard />;
  }
  if (user?.role === "HOD") {
    return <HodDashboard />;
  }
  if (user?.role === "FACULTY") {
    return <FacultyDashboard />;
  }
  return <StudentDashboard />;
};

/* =========================================================================
   1. VICE CHANCELLOR / INSTITUTIONAL ADMIN DASHBOARD
   ========================================================================= */
const ViceChancellorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [instRes, logsRes] = await Promise.all([
          api.getInstitutionAnalytics(),
          api.getAuditLogs(),
        ]);
        setData(instRes);
        setAuditLogs(logsRes.logs);
      } catch (err) {
        console.error("VC data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const { overview, departmentStats, recentSubmissions } = data || {
    overview: {},
    departmentStats: [],
    recentSubmissions: [],
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Executive Welcome */}
      <div className="portal-card bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
              Institutional Governance
            </span>
            <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 text-emerald-300">
              System Admin
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 uppercase">
            Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">VC Office</span>
          </h1>
          <p className="text-indigo-100/80 font-medium max-w-2xl leading-relaxed">
            Monitor university-wide laboratory engagement, department performance metrics, and administrative audit trails for MITS-DU.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-3xl" />
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Depts" value={overview.totalDepartments || 0} icon={<Building className="w-5 h-5 text-indigo-600" />} />
        <MetricCard label="Faculty" value={overview.totalFaculty || 0} icon={<Users className="w-5 h-5 text-blue-600" />} />
        <MetricCard label="Students" value={overview.totalStudents || 0} icon={<Users className="w-5 h-5 text-emerald-600" />} />
        <MetricCard label="Labs" value={overview.totalLabs || 0} icon={<FlaskConical className="w-5 h-5 text-purple-600" />} />
        <MetricCard label="Code Runs" value={overview.totalSubmissions || 0} icon={<Code2 className="w-5 h-5 text-amber-600" />} />
        <MetricCard label="Avg Pass" value={`${overview.passRate || 0}%`} icon={<TrendingUp className="w-5 h-5 text-rose-600" />} highlight />
      </div>

      {/* Department Breakdown */}
      <div className="portal-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Academic Departments</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time engagement metrics across departments</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6 text-center">Faculty</th>
                <th className="py-4 px-6 text-center">Students</th>
                <th className="py-4 px-6 text-center">Active Labs</th>
                <th className="py-4 px-6 text-right">Submissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {departmentStats.map((dept: any) => (
                <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                        {dept.code}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{dept.name}</span>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-center font-bold text-slate-600 dark:text-slate-400">{dept.facultyCount}</td>
                  <td className="py-5 px-6 text-center font-bold text-slate-600 dark:text-slate-400">{dept.studentCount}</td>
                  <td className="py-5 px-6 text-center font-bold text-slate-600 dark:text-slate-400">{dept.labCount}</td>
                  <td className="py-5 px-6 text-right font-black text-indigo-600 dark:text-indigo-400">{dept.submissionsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="portal-card p-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Latest Code Runs</h3>
          <div className="space-y-4">
            {recentSubmissions.slice(0, 5).map((sub: any) => (
              <div key={sub.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                    {sub.student.name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{sub.student.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{sub.lab.title}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge status={sub.status} />
                  <span className="text-[11px] font-black text-slate-900 dark:text-white">{sub.score} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div className="portal-card p-6 bg-slate-900 text-white border-none shadow-xl">
          <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-4">Security Audit Trail</h3>
          <div className="space-y-4">
            {auditLogs.slice(0, 5).map((log: any) => (
              <div key={log.id} className="text-[11px] leading-relaxed group">
                <div className="flex justify-between font-black text-indigo-300 mb-1">
                  <span className="uppercase tracking-widest">{log.action}</span>
                  <span className="text-slate-500 font-medium">{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-400 group-hover:text-white transition-colors">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   2. HEAD OF DEPARTMENT (HOD) DASHBOARD
   ========================================================================= */
const HodDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDept() {
      try {
        const res = await api.getDepartmentAnalytics();
        setData(res);
      } catch (err) {
        console.error("HOD data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDept();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const { department, overview, facultyList, labs, examinations } = data || {
    overview: {},
    facultyList: [],
    labs: [],
    examinations: [],
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Department Header */}
      <div className="portal-card p-8 bg-white dark:bg-slate-900 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-black uppercase tracking-widest">
                Dept: {department?.code || "CSBS"}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[10px] font-bold uppercase tracking-widest">
                HOD Access
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {department?.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-xl">
              Curriculum oversight, faculty supervision, and practical assessment monitoring for your department.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department HOD</p>
               <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.name}</p>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-lg font-black shadow-lg shadow-indigo-500/20">
               {user?.name[0]}
             </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Faculty Members" value={overview.facultyCount || 0} icon={<Users className="w-6 h-6 text-indigo-600" />} />
        <MetricCard label="Total Students" value={overview.studentCount || 0} icon={<Users className="w-6 h-6 text-emerald-600" />} />
        <MetricCard label="Active Labs" value={overview.labCount || 0} icon={<FlaskConical className="w-6 h-6 text-purple-600" />} />
        <MetricCard label="Avg Pass Rate" value={`${overview.passRate || 0}%`} icon={<TrendingUp className="w-6 h-6 text-rose-600" />} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Department Laboratories</h2>
            <Link to="/#labs" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {labs.map((lab: any) => (
              <div key={lab.id} className="portal-card group hover:scale-[1.02]">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                      {lab.language}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${lab.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {lab.isPublished ? "Live" : "Draft"}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base group-hover:text-indigo-600 transition-colors leading-tight uppercase">{lab.title}</h3>
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {lab.createdBy?.name[0]}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{lab.createdBy?.name.split(' ')[1]}</span>
                    </div>
                    <Link to={`/labs/${lab.id}`} className="nav-icon-btn">
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty List */}
        <div className="portal-card p-6">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Faculty Directory</h2>
          <div className="space-y-4">
            {facultyList.map((f: any) => (
              <div key={f.id} className="flex items-center gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 transition-all border border-transparent group-hover:border-indigo-100 dark:group-hover:border-indigo-800">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight">{f.name}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{f.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. FACULTY WORKSPACE DASHBOARD
   ========================================================================= */
const FacultyDashboard: React.FC = () => {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabs = async () => {
    try {
      const res = await api.getLabs();
      setLabs(res.labs);
    } catch (err) {
      console.error("Fetch labs error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="portal-card p-8 bg-indigo-600 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
             <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[10px] font-black uppercase tracking-widest border border-white/20">
               Faculty Control
             </span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Lab Management</h1>
          <p className="text-indigo-100 font-medium mt-2 max-w-2xl leading-relaxed">
            Author programming questions, configure automated test cases, and manage student assessments.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
      </div>

      {/* Labs Grid */}
      <div id="labs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">My Programming Labs</h2>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{labs.length} Active Courses</span>
        </div>

        {labs.length === 0 ? (
          <div className="portal-card border-dashed border-2 border-slate-200 dark:border-slate-800 p-20 text-center">
            <Sparkles className="w-12 h-12 text-indigo-600/30 mx-auto mb-4" />
            <h3 className="font-black text-slate-800 dark:text-slate-200 text-lg uppercase tracking-tight">Create your first lab</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
              Get started by clicking the "Create Laboratory" button in the sidebar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {labs.map((lab) => (
              <div key={lab.id} className="portal-card group hover:translate-y-[-4px]">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                      {lab.code || "302521XX"}
                    </span>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                        {lab.language}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${lab.isPublished ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                        {lab.isPublished ? "Live" : "Draft"}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 transition-colors uppercase">{lab.title}</h3>
                  
                  <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{lab._count?.questions || 0}</div>
                      <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Qs</div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{lab._count?.enrollments || 0}</div>
                      <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Stds</div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{lab._count?.examinations || 0}</div>
                      <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Exms</div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Key: <span className="text-indigo-600 dark:text-indigo-400 ml-1">{lab.enrollmentKey || "---"}</span>
                  </div>
                  <Link
                    to={`/labs/${lab.id}`}
                    className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-2 uppercase tracking-widest"
                  >
                    Manage <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================================
   4. STUDENT WORKSPACE DASHBOARD
   ========================================================================= */
const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [exams, setExams] = useState<Examination[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudentData() {
      try {
        const labsRes = await api.getLabs();
        setLabs(labsRes.labs);
        const examResults = await Promise.all(
          labsRes.labs.map((lab) => api.getLabExaminations(lab.id).catch(() => ({ examinations: [], serverTime: "" })))
        );
        setExams(examResults.flatMap((result) => result.examinations));
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load your workspace.");
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="portal-card p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Student workspace</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">Welcome back, {user?.name}</h1>
        <p className="mt-2 text-slate-300">Your enrolled coding labs and published assessments.</p>
      </section>

      {loadError && <div role="alert" className="portal-card p-4 border-rose-300 text-rose-700">{loadError}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard label="Enrolled labs" value={labs.length} icon={<FlaskConical className="w-5 h-5 text-indigo-600" />} />
        <MetricCard label="Published assessments" value={exams.length} icon={<Calendar className="w-5 h-5 text-blue-600" />} />
      </div>

      <section id="exams" className="space-y-4 scroll-mt-24">
        <div className="flex items-end justify-between gap-4">
          <div><h2 className="text-xl font-bold">Published assessments</h2><p className="text-sm text-slate-500 mt-1">Assessments available in your enrolled labs.</p></div>
        </div>
        {exams.length === 0 ? (
          <div className="portal-card p-8 text-center text-slate-500">No published assessments are available yet.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <article key={exam.id} className="portal-card p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{exam.title}</h3><p className="text-sm text-slate-500 mt-1">{exam.description || "Coding assessment"}</p></div><Badge variant="info">Published</Badge></div>
                <div className="text-sm text-slate-500">{new Date(exam.startTime).toLocaleString()} – {new Date(exam.endTime).toLocaleString()}</div>
                <Link to={`/examinations/${exam.id}`} className="btn-primary mt-auto inline-flex items-center justify-center gap-2">Open assessment <ArrowRight className="w-4 h-4" /></Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="labs" className="space-y-4 scroll-mt-24">
        <div><h2 className="text-xl font-bold">MY LABS</h2><p className="text-sm text-slate-500 mt-1">Open a lab to review questions and course material.</p></div>
        {labs.length === 0 ? (
          <div className="portal-card p-8 text-center"><p className="text-slate-500">You are not enrolled in any labs yet.</p><p className="text-sm text-slate-400 mt-2">Ask your instructor for a lab enrollment key.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {labs.map((lab) => <Link key={lab.id} to={`/labs/${lab.id}`} className="portal-card p-6 hover:border-indigo-300 transition-colors"><p className="text-xs uppercase tracking-widest text-indigo-600 font-bold">{lab.code || lab.language}</p><h3 className="text-lg font-bold mt-2">{lab.title}</h3><p className="text-sm text-slate-500 mt-2 line-clamp-2">{lab.description || "Coding laboratory"}</p></Link>)}
          </div>
        )}
      </section>
    </div>
  );
};
/* Helper Components */
const MetricCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}> = ({ label, value, icon, highlight }) => (
  <div className={`portal-card p-5 group ${highlight ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800" : ""}`}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
    <div className="text-2xl font-black text-slate-900 dark:text-white mt-3 tracking-tight">{value}</div>
  </div>
);

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse p-8">
    <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    </div>
    <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
  </div>
);
