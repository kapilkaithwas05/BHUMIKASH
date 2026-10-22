import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Code2,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Building,
  GraduationCap,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "VICE_CHANCELLOR":
        return {
          label: "Vice Chancellor",
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
          color: "bg-purple-100 text-purple-800 border-purple-200",
        };
      case "HOD":
        return {
          label: "Head of Dept",
          icon: <Building className="w-3.5 h-3.5" />,
          color: "bg-indigo-100 text-indigo-800 border-indigo-200",
        };
      case "FACULTY":
        return {
          label: "Faculty",
          icon: <GraduationCap className="w-3.5 h-3.5" />,
          color: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "STUDENT":
      default:
        return {
          label: "Student",
          icon: <UserIcon className="w-3.5 h-3.5" />,
          color: "bg-emerald-100 text-emerald-800 border-emerald-200",
        };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:bg-indigo-700 transition-colors">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">LabNEXUS</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Integrated Assessment & Lab System</p>
          </div>
        </Link>

        {/* User profile & actions */}
        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-sm font-semibold text-slate-800">{user.name}</span>
              <span className="text-xs text-slate-500">{user.email}</span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleInfo.color}`}
            >
              {roleInfo.icon}
              <span>{roleInfo.label}</span>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
