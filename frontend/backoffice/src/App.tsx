import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { Nav } from "./components/Nav";
import { CaseDetail } from "./pages/CaseDetail";
import { Custodian } from "./pages/Custodian";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Questionnaires } from "./pages/admin/Questionnaires";
import { Users } from "./pages/admin/Users";

function Protected({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function Shell({ children }: { children: JSX.Element }) {
  return (
    <>
      <Nav />
      <div className="wrap">{children}</div>
    </>
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
          <Route path="/admin/users" element={<Protected><Shell><Users /></Shell></Protected>} />
          <Route path="/admin/questionnaires" element={<Protected><Shell><Questionnaires /></Shell></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
