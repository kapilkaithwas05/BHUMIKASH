import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";
import {
  Code2,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Building,
  GraduationCap,
  Bell,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load unread notification count
  useEffect(() => {
    if (!user) return;
    api.getNotifications().then((res) => {
      setUnreadCount(res.unreadCount);
    }).catch(() => {});
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
          color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
        };
      case "HOD":
        return {
          label: "Head of Dept",
          icon: <Building className="w-3.5 h-3.5" />,
          color: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
        };
      case "FACULTY":
        return {
          label: "Faculty",
          icon: <GraduationCap className="w-3.5 h-3.5" />,
          color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
        };
      case "STUDENT":
      default:
        return {
          label: "Student",
          icon: <UserIcon className="w-3.5 h-3.5" />,
          color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
        };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const pageTitle = location.pathname === "/"
    ? "Dashboard"
    : location.pathname.startsWith("/labs/")
      ? "Laboratory details"
      : location.pathname === "/labs"
        ? "Laboratories"
        : location.pathname === "/examinations"
          ? "Examinations"
          : location.pathname.endsWith("/results")
            ? "Assessment results"
            : location.pathname === "/students"
              ? "Students"
              : location.pathname === "/notifications"
                ? "Notifications"
                : location.pathname === "/profile"
                  ? "Profile"
                  : "Workspace";

  return (
    <header className="portal-topbar sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-6 shrink-0">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="portal-brand-mark w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:rotate-6 transition-all duration-300">
              <Code2 className="w-6 h-6" />
            </div>
            <div className="block">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">LabNEXUS</span>
              </div>
              <span className="portal-brand-subtitle">MITS · Gwalior</span>
            </div>
          </Link>
        </div>

        {/* Navigation for LabNEXUS assessment workflows */}
        {user && (
          <div className="portal-breadcrumb hidden sm:flex"><span>Workspace</span><span className="portal-breadcrumb-separator">/</span><strong>{pageTitle}</strong></div>
        )}

        {/* User profile & actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:rotate-12"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 p-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left mr-1">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none">{user.name.split(' ')[0]}</p>
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter mt-1">{user.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden ring-1 ring-black ring-opacity-5">
                    <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 mb-1 bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate uppercase">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                        </div>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border mt-3 w-full justify-center ${roleInfo.color}`}>
                        {roleInfo.icon}
                        <span>{roleInfo.label}</span>
                      </div>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                      Account Settings
                    </Link>
                    <Link
                      to="/notifications"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Bell className="w-4 h-4 text-slate-400" />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-auto w-5 h-5 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors border-t border-slate-100 dark:border-slate-800 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                Join Nexus
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
 );
};
