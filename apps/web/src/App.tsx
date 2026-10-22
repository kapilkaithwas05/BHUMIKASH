import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { LabDetail } from "./pages/LabDetail";
import { QuestionWorkspace } from "./pages/QuestionWorkspace";
import { ExaminationRoom } from "./pages/ExaminationRoom";
import { ExaminationResults } from "./pages/ExaminationResults";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading LabNEXUS...</span>
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

  const isFullscreenWorkspace =
    location.pathname.startsWith("/questions/") ||
    location.pathname.startsWith("/examinations/") && !location.pathname.endsWith("/results");

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {!isAuthPage && <Navbar />}

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
        <div className="flex flex-1 max-w-7xl w-full mx-auto">
          {user && <Sidebar />}
          <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
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
                path="/examinations/:examinationId/results"
                element={
                  <ProtectedRoute>
                    <ExaminationResults />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;
