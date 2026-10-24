import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Code2, AlertCircle, CheckCircle2, Users, Calendar, BarChart3, FileText, Building, Mail, Lock, User as UserIcon } from "lucide-react";

export const Register: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (password.length < 8) {
      return setError("Password must be at least 8 characters");
    }

    setLoading(true);
    try {
      await api.register(name, email, password);
      // Auto-login upon registration
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to register account");
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
    <div className="min-h-screen bg-white dark:bg-slate-950 flex transition-colors duration-200">
      {/* Left Pane - Branding & Features (same as Login) */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden bg-slate-900 dark:bg-slate-900/50 p-12 flex-col justify-between">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        
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
            <h2 className="text-3xl font-black text-white leading-tight mb-8">
              Join the future of <br /> Digital Laboratories
            </h2>
            
            <div className="space-y-6">
              {features.slice(0, 4).map((f, i) => (
                <div key={i} className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white mb-0.5">{f.title}</h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-bold text-slate-600 uppercase tracking-widest pt-8 border-t border-slate-800">
          Academic Management System
        </div>
      </div>

      {/* Right Pane - Register Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 lg:px-24 dark:bg-slate-950">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <Code2 className="w-10 h-10" />
            </div>
          </div>

          <div className="relative mb-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">
              <UserIcon className="w-3 h-3" />
              Student Registration
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
              Join your department's coding laboratories and assessments.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-colors duration-200">
            {error && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl text-xs text-rose-700 dark:text-rose-400 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                  Full Legal Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bhumika Pawar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                  University Email
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                    Password
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
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                    Confirm
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 tracking-wider uppercase"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Already have an account?{" "}
                <Link to="/login" className="font-black text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
