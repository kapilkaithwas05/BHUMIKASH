import React from "react";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Mail,
  Hash,
  Building2,
  ShieldCheck,
  GraduationCap,
  BookOpen,
} from "lucide-react";

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  VICE_CHANCELLOR: { label: "Vice Chancellor", color: "text-purple-700 bg-purple-50 border-purple-200" },
  HOD: { label: "Head of Department", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  FACULTY: { label: "Faculty", color: "text-blue-700 bg-blue-50 border-blue-200" },
  STUDENT: { label: "Student", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

export const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const roleInfo = ROLE_DISPLAY[user.role] || ROLE_DISPLAY.STUDENT;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "VICE_CHANCELLOR": return <ShieldCheck className="w-5 h-5 text-purple-600" />;
      case "HOD": return <Building2 className="w-5 h-5 text-indigo-600" />;
      case "FACULTY": return <GraduationCap className="w-5 h-5 text-blue-600" />;
      default: return <BookOpen className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your LabNEXUS account information. Profile details are managed by your
          institution administrator.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Avatar Banner */}
        <div className="h-24 bg-gradient-to-r from-indigo-600 to-violet-600" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleInfo.color}`}>
              {getRoleIcon(user.role)}
              {roleInfo.label}
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Account Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow
            icon={<User className="w-4 h-4 text-slate-400" />}
            label="Full Name"
            value={user.name}
          />
          <InfoRow
            icon={<Mail className="w-4 h-4 text-slate-400" />}
            label="Email Address"
            value={user.email}
          />
          {user.rollNumber && (
            <InfoRow
              icon={<Hash className="w-4 h-4 text-slate-400" />}
              label="Roll Number"
              value={user.rollNumber}
            />
          )}
          {(user as any).department?.name && (
            <InfoRow
              icon={<Building2 className="w-4 h-4 text-slate-400" />}
              label="Department"
              value={(user as any).department.name}
            />
          )}
        </div>
      </div>

      {/* Security Note */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Account Security</span> — Your password
          is hashed with bcrypt (cost factor 12) and never stored in plain text. For password
          or profile changes, contact your system administrator.
        </p>
      </div>
    </div>
  );
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
