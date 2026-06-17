import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { Sidebar } from "./components/Nav";
import { Tour } from "./components/Tour";
import { AuditLog } from "./pages/AuditLog";
import { CaseDetail } from "./pages/CaseDetail";
import { Custodian } from "./pages/Custodian";
import { Dashboard } from "./pages/Dashboard";
import { ForcePasswordChange } from "./pages/ForcePasswordChange";
import { Login } from "./pages/Login";
import { Settings } from "./pages/Settings";
import { Statistics } from "./pages/Statistics";
import { Organization } from "./pages/admin/Organization";
import { Questionnaires } from "./pages/admin/Questionnaires";
import { Users } from "./pages/admin/Users";

function Protected({ children }: { children: JSX.Element }) {
  const { token, pwdChangeNeeded } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (pwdChangeNeeded) return <ForcePasswordChange />;
  return children;
}

function Shell({ children }: { children: JSX.Element }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
      </main>
      <Tour />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Shell><Dashboard /></Shell></Protected>} />
          <Route path="/cases/:id" element={<Protected><Shell><CaseDetail /></Shell></Protected>} />
          <Route path="/custodian" element={<Protected><Shell><Custodian /></Shell></Protected>} />
          <Route path="/settings" element={<Protected><Shell><Settings /></Shell></Protected>} />
          <Route path="/stats" element={<Protected><Shell><Statistics /></Shell></Protected>} />
          <Route path="/admin/users" element={<Protected><Shell><Users /></Shell></Protected>} />
          <Route path="/admin/organization" element={<Protected><Shell><Organization /></Shell></Protected>} />
          <Route path="/admin/questionnaires" element={<Protected><Shell><Questionnaires /></Shell></Protected>} />
          <Route path="/admin/audit" element={<Protected><Shell><AuditLog /></Shell></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
