import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Code2,
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  Building,
  GraduationCap,
  User as UserIcon,
  CheckCircle2,
  BarChart3,
  Calendar,
  FileText,
  Settings,
  Users,
} from "lucide-react";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    setError(null);
    try {
      await login(demoEmail, demoPass);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in with demo account");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: "Coding Laboratories",
      desc: "Organize practical work in course-specific labs.",
      icon: <CheckCircle2 className="w-5 h-5 text-indigo-500" />,
    },
    {
      title: "Assessment Authoring",
      desc: "Create coding questions and timed assessments.",
      icon: <Calendar className="w-5 h-5 text-indigo-500" />,
    },
    {
      title: "Submission Review",
      desc: "Save code submissions for faculty review. Automatic grading is pending.",
      icon: <BarChart3 className="w-5 h-5 text-indigo-500" />,
    },
    {
      title: "Code Workspace",
      desc: "Write and submit code in the browser. Code execution is currently unavailable.",
      icon: <FileText className="w-5 h-5 text-indigo-500" />,
    },
    {
      title: "Department Analytics",
      desc: "Department-level laboratory and assessment insights.",
      icon: <Building className="w-5 h-5 text-indigo-500" />,
    },
    {
      title: "Student Management",
      desc: "Manage student profiles and academic records.",
      icon: <Users className="w-5 h-5 text-indigo-500" />,
    },
  ];

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-white dark:bg-slate-950 transition-colors duration-200 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      {/* Left Pane - Branding & Features */}
      <div className="hidden min-w-0 lg:flex relative overflow-hidden bg-slate-900 dark:bg-slate-900/50 p-8 xl:p-12 flex-col justify-between">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <Code2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">LabNEXUS</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em]">University Portal</p>
            </div>
          </div>

          <div className="max-w-xl">
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              University Laboratory <br /> Submission & Assessment Portal
            </h2>
            <p className="text-lg text-slate-400 font-medium mb-12">
              Madhav Institute of Technology & Science, <br /> Gwalior
            </p>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div key={i} className="flex min-w-0 gap-3 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-700">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-12 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-[11px]">
              <p className="text-slate-300 font-bold">LabNEXUS</p>
              <p className="text-slate-500">Laboratory submissions and assessments</p>
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Built for MITS, Gwalior</p>
        </div>
      </div>

      {/* Right Pane - Login Form */}
      <div className="w-full min-w-0 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 xl:px-12 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-md min-w-0">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <Code2 className="w-10 h-10" />
            </div>
          </div>

          <div className="relative mb-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
              <Lock className="w-3 h-3" />
              Secure Access
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
              Sign in with your LabNEXUS account email.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 sm:p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-colors duration-200">
            {error && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl text-xs text-rose-700 dark:text-rose-400 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="you@example.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                  Account Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 px-6 rounded-2xl shadow-xl shadow-indigo-500/20 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 tracking-wider uppercase"
              >
                {loading ? "Authenticating..." : "Sign In to Portal"}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em]">
                <span className="px-4 bg-white dark:bg-slate-900 text-slate-400">Quick Access</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "VC", role: "VICE_CHANCELLOR", email: "vc@labnexus.edu", password: "NexusPass123!", icon: <ShieldCheck className="w-3 h-3" />, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/50" },
                { label: "HOD", role: "HOD", email: "hod.csbs@labnexus.edu", password: "NexusPass123!", icon: <Building className="w-3 h-3" />, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50" },
                { label: "Faculty", role: "FACULTY", email: "demo.faculty@labnexus.test", password: "FacultyPass123!", icon: <GraduationCap className="w-3 h-3" />, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50" },
                { label: "Student", role: "STUDENT", email: "demo.student@labnexus.test", password: "StudentPass123!", icon: <UserIcon className="w-3 h-3" />, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50" },
              ].map((demo) => (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => handleQuickLogin(demo.email, demo.password)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border ${demo.color} text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <span className="shrink-0">{demo.icon}</span>
                  <span className="truncate">{demo.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Don't have an account?{" "}
                <Link to="/register" className="font-black text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-4">
                  Register as student
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
