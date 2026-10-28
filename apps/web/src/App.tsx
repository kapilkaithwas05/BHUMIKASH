import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { PortalDashboard } from "./pages/PortalDashboard";
import { AssessmentCatalog } from "./pages/AssessmentCatalog";
import { LabDetail } from "./pages/LabDetail";
import { QuestionWorkspace } from "./pages/QuestionWorkspace";
import { ExaminationRoom } from "./pages/ExaminationRoom";
import { ExaminationResults } from "./pages/ExaminationResults";
import { Profile } from "./pages/Profile";
import { Notifications } from "./pages/Notifications";
import { Developer } from "./pages/Developer";
import { Students } from "./pages/Students";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading LabNEXUS...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export const App: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Smooth-scroll to the section referenced by the URL hash (sidebar navigation).
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  // Fullscreen pages: coding workspace and exam room (but NOT exam results)
  const isFullscreenWorkspace =
    location.pathname.startsWith("/questions/") ||
    (location.pathname.startsWith("/examinations/") && !location.pathname.endsWith("/results"));

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 ${!isAuthPage && !isFullscreenWorkspace ? "portal-app" : ""}`}>
      {!isAuthPage && !isFullscreenWorkspace && <Navbar />}

      {isAuthPage || isFullscreenWorkspace ? (
        <main className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/questions/:questionId"
              element={
                <ProtectedRoute>
                  <QuestionWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/examinations/:examinationId"
              element={
                <ProtectedRoute>
                  <ExaminationRoom />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      ) : (
        <div className="portal-layout flex flex-1 max-w-[1600px] w-full mx-auto">
          {user && <Sidebar />}
          <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <PortalDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/labs/:labId"
                element={
                  <ProtectedRoute>
                    <LabDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/labs"
                element={
                  <ProtectedRoute>
                    <AssessmentCatalog kind="labs" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/examinations"
                element={
                  <ProtectedRoute>
                    <AssessmentCatalog kind="examinations" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/examinations/:examinationId/results"
                element={
                  <ProtectedRoute>
                    <ExaminationResults />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/developer"
                element={
                  <ProtectedRoute>
                    <Developer />
                  </ProtectedRoute>
                }
              />
              <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;
