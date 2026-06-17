import { Menu } from "lucide-react";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { Sidebar } from "./components/Nav";
import { Tour } from "./components/Tour";
import { VaultMark } from "./components/icons";
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
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <button
            aria-label="Apri menu"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
          >
            <Menu size={20} />
          </button>
          <span className="flex items-center gap-2 font-bold text-foreground">
            <VaultMark size={20} className="text-wv-accent" /> Whistlevault
          </span>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">{children}</div>
        </main>
      </div>
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
