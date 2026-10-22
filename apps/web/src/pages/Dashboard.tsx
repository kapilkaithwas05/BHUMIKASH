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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Executive Welcome */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 border border-indigo-400/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Institutional Governance & Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              University Overview & Laboratory Monitoring
            </h1>
            <p className="mt-1 text-slate-300 text-sm max-w-2xl">
              Consolidated real-time indicators across all academic departments, programming
              laboratories, and student evaluations.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Live System Status
            </span>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              All Services Operational
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Departments" value={overview.totalDepartments || 0} icon={<Building className="w-5 h-5 text-indigo-600" />} />
        <MetricCard label="Faculty" value={overview.totalFaculty || 0} icon={<Users className="w-5 h-5 text-blue-600" />} />
        <MetricCard label="Students" value={overview.totalStudents || 0} icon={<Users className="w-5 h-5 text-emerald-600" />} />
        <MetricCard label="Laboratories" value={overview.totalLabs || 0} icon={<FlaskConical className="w-5 h-5 text-purple-600" />} />
        <MetricCard label="Submissions" value={overview.totalSubmissions || 0} icon={<Code2 className="w-5 h-5 text-amber-600" />} />
        <MetricCard label="Pass Rate" value={`${overview.passRate || 0}%`} icon={<TrendingUp className="w-5 h-5 text-rose-600" />} highlight />
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Academic Department Comparisons</h3>
            <p className="text-xs text-slate-500">Departmental student enrollment, faculty counts, and coding submissions</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Department</th>
                <th className="py-3.5 px-6">Code</th>
                <th className="py-3.5 px-6">Faculty Count</th>
                <th className="py-3.5 px-6">Enrolled Students</th>
                <th className="py-3.5 px-6">Active Labs</th>
                <th className="py-3.5 px-6">Total Submissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {departmentStats.map((dept: any) => (
                <tr key={dept.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">{dept.name}</td>
                  <td className="py-4 px-6 font-mono text-xs font-bold text-indigo-600">{dept.code}</td>
                  <td className="py-4 px-6">{dept.facultyCount}</td>
                  <td className="py-4 px-6">{dept.studentCount}</td>
                  <td className="py-4 px-6">{dept.labCount}</td>
                  <td className="py-4 px-6 font-semibold">{dept.submissionsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Latest Code Submissions</h3>
          <div className="space-y-3">
            {recentSubmissions.slice(0, 5).map((sub: any) => (
              <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div>
                  <div className="font-semibold text-xs text-slate-900">{sub.student.name}</div>
                  <div className="text-[11px] text-slate-500">{sub.lab.title} • {sub.question.title}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={sub.status} />
                  <span className="text-xs font-semibold text-slate-700">{sub.score} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Platform Audit Log</h3>
          <div className="space-y-3">
            {auditLogs.slice(0, 5).map((log: any) => (
              <div key={log.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-xs">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>{log.action}</span>
                  <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-slate-600 mt-1">{log.details}</p>
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Department Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Department Portal: {department?.code || "CSBS"}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              {department?.name || "Computer Science and Business Systems"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Curriculum oversight, faculty supervision, laboratory progress, and practical exams.
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Department Faculty</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{overview.facultyCount || 0}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Enrolled Students</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{overview.studentCount || 0}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Active Labs</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{overview.labCount || 0}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Avg Pass Rate</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{overview.passRate || 0}%</div>
          </div>
        </div>
      </div>

      {/* Department Laboratories & Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Department Laboratories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {labs.map((lab: any) => (
              <div key={lab.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {lab.language}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${lab.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {lab.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mt-3 leading-snug">{lab.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{lab.description || "No description provided."}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Instructor: {lab.createdBy?.name || "Faculty"}</span>
                  <Link to={`/labs/${lab.id}`} className="font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    Manage <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty Directory */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Faculty Directory</h2>
          <div className="space-y-3">
            {facultyList.map((f: any) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  {f.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-900">{f.name}</div>
                  <div className="text-[11px] text-slate-500">{f.email}</div>
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty Laboratory Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Author programming questions, configure automated test cases, enroll students, and schedule assessments.
          </p>
        </div>
      </div>

      {/* Labs Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">My Programming Laboratories</h2>
          <span className="text-xs font-semibold text-slate-500">{labs.length} Laboratories</span>
        </div>

        {labs.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <FlaskConical className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No Laboratories Created Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by creating your first laboratory from the sidebar button.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {labs.map((lab) => (
              <div
                key={lab.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {lab.language}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        lab.isPublished ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {lab.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {lab.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    {lab.description || "Practical laboratory assignments and coding assessments."}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="text-base font-bold text-slate-900">{lab._count?.questions || 0}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Questions</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="text-base font-bold text-slate-900">{lab._count?.enrollments || 0}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Students</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="text-base font-bold text-slate-900">{lab._count?.examinations || 0}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Exams</div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">
                    Key: <strong className="text-slate-800">{lab.enrollmentKey || "None"}</strong>
                  </span>
                  <Link
                    to={`/labs/${lab.id}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    Manage Lab <ArrowRight className="w-3.5 h-3.5" />
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
  const [labs, setLabs] = useState<Lab[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudentData() {
      try {
        const labsRes = await api.getLabs();
        setLabs(labsRes.labs);

        // Fetch published exams for each enrolled lab
        const examPromises = labsRes.labs.map((l) =>
          api.getLabExaminations(l.id).catch(() => ({ examinations: [], serverTime: "" }))
        );
        const examResults = await Promise.all(examPromises);
        const allExams = examResults.flatMap((r) => r.examinations);
        setExams(allExams);
      } catch (err) {
        console.error("Student dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Student Coding Workspace</h1>
        <p className="mt-1 text-slate-300 text-sm max-w-2xl">
          Access your assigned programming laboratories, write and debug solutions in Monaco Editor,
          and participate in timed assessment examinations.
        </p>
      </div>

      {/* Active Examinations Alert Banner */}
      {exams.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-base mb-3">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span>Scheduled & Active Laboratory Assessments</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => {
              const now = Date.now();
              const isStarted = new Date(exam.startTime).getTime() <= now;
              const isEnded = new Date(exam.endTime).getTime() <= now;
              return (
                <div key={exam.id} className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        {exam.durationMinutes} Minutes Assessment
                      </span>
                      {isStarted && !isEnded && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-600" />
                          LIVE NOW
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-2">{exam.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exam.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Marks: {exam.totalMarks}</span>
                    <Link
                      to={`/examinations/${exam.id}`}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      Enter Assessment Room
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enrolled Laboratories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Enrolled Laboratories</h2>
          <span className="text-xs text-slate-500 font-semibold">{labs.length} Courses</span>
        </div>

        {labs.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <FlaskConical className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">You are not enrolled in any laboratories yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Ask your course instructor for an enrollment key and click "Join Lab with Key" in the sidebar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {labs.map((lab) => (
              <div
                key={lab.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {lab.language}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{lab.code || "Lab"}</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900">{lab.title}</h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{lab.description || "Laboratory tasks."}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>{lab._count?.questions || 0} Questions Available</span>
                  </div>
                </div>

                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <Link
                    to={`/labs/${lab.id}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    Open Workspace <ArrowRight className="w-3.5 h-3.5" />
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

/* Helper Components */
const MetricCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}> = ({ label, value, icon, highlight }) => (
  <div className={`p-5 rounded-xl border shadow-sm ${highlight ? "bg-indigo-50/50 border-indigo-200" : "bg-white border-slate-200"}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      {icon}
    </div>
    <div className="text-2xl font-bold text-slate-900 mt-2">{value}</div>
  </div>
);

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-32 bg-slate-200 rounded-2xl" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="h-24 bg-slate-200 rounded-xl" />
      <div className="h-24 bg-slate-200 rounded-xl" />
      <div className="h-24 bg-slate-200 rounded-xl" />
      <div className="h-24 bg-slate-200 rounded-xl" />
    </div>
    <div className="h-64 bg-slate-200 rounded-xl" />
  </div>
);
