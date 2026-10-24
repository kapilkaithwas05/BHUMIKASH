import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Bell,
  CheckCheck,
  Trash2,
  Clock,
  FlaskConical,
  FileCheck,
  AlertTriangle,
  Info,
  Inbox,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "ENROLLMENT": return <FlaskConical className="w-4 h-4 text-indigo-500" />;
    case "SUBMISSION": return <FileCheck className="w-4 h-4 text-emerald-500" />;
    case "EXAM": return <Clock className="w-4 h-4 text-amber-500" />;
    case "WARNING": return <AlertTriangle className="w-4 h-4 text-rose-500" />;
    default: return <Info className="w-4 h-4 text-slate-400" />;
  }
}

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteNotification(id);
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading
              ? "Loading..."
              : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}${
                  unreadCount > 0 ? `, ${unreadCount} unread` : ""
                }`}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-2 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700">No notifications yet</h3>
          <p className="text-sm text-slate-400 mt-1">
            You're all caught up! Notifications will appear here for enrollments,
            exam updates, and submission results.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`group relative bg-white rounded-xl border transition-all ${
                notification.isRead
                  ? "border-slate-200"
                  : "border-indigo-200 bg-indigo-50/30 shadow-sm shadow-indigo-500/5"
              }`}
            >
              <div className="flex gap-3 p-4">
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    notification.isRead ? "bg-slate-100" : "bg-white border border-slate-200"
                  }`}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        notification.isRead ? "text-slate-600" : "text-slate-900"
                      }`}
                    >
                      {notification.title}
                      {!notification.isRead && (
                        <span className="inline-block ml-2 w-1.5 h-1.5 bg-indigo-500 rounded-full align-middle" />
                      )}
                    </p>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkRead(notification.id)}
                          title="Mark as read"
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        title="Delete"
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {notification.message}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
