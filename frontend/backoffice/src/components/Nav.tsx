import {
  BarChart3,
  ClipboardList,
  HelpCircle,
  History,
  Inbox,
  ListChecks,
  LogOut,
  Moon,
  Palette,
  Settings,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { VaultMark } from "./icons";
import { cn } from "../lib/utils";
import { useBrand } from "../lib/useBrand";

export const ROLE_LABEL: Record<string, string> = {
  admin: "Amministratore",
  recipient: "Gestore",
  custodian: "Custode",
  analyst: "Analista",
};

const item =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
const active = "bg-wv-accent/10 text-wv-accent hover:bg-wv-accent/10 hover:text-wv-accent";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const brand = useBrand();
  const isAdmin = role === "admin";
  const isCustodian = role === "custodian";
  const isAnalyst = role === "analyst";

  const link = ({ isActive }: { isActive: boolean }) => cn(item, isActive && active);
  const close = () => onClose();

  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("wv-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-wv-navy/40 lg:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0 shadow-lg" : "-translate-x-full lg:shadow-none",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <VaultMark size={24} className="text-wv-accent" />
          <span className="font-bold tracking-tight text-foreground">{brand}</span>
        </div>

        <nav data-tour="nav" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <NavLink to="/" end className={link} onClick={close}>
            <Inbox size={18} /> Segnalazioni
          </NavLink>
          {isCustodian && (
            <NavLink to="/custodian" className={link} onClick={close}>
              <ShieldCheck size={18} /> Richieste identità
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin/users" className={link} onClick={close}>
              <Users size={18} /> Utenti
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin/questionnaires" className={link} onClick={close}>
              <ClipboardList size={18} /> Questionari
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin/workflow" className={link} onClick={close}>
              <ListChecks size={18} /> Workflow
            </NavLink>
          )}
          {(isAdmin || isAnalyst) && (
            <NavLink to="/stats" className={link} onClick={close}>
              <BarChart3 size={18} /> Statistiche
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin/audit" className={link} onClick={close}>
              <History size={18} /> Registro attività
            </NavLink>
          )}
          <NavLink to="/settings" className={link} onClick={close}>
            <Settings size={18} /> Impostazioni
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/organization" className={link} onClick={close}>
              <Palette size={18} /> Personalizza
            </NavLink>
          )}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-wv-navy text-sm font-semibold text-white">
              {(ROLE_LABEL[role ?? ""] ?? "?").charAt(0)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{ROLE_LABEL[role ?? ""] ?? role}</div>
              <div className="truncate text-xs text-muted-foreground">Backoffice</div>
            </div>
          </div>
          <button
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={toggleTheme}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />} {dark ? "Tema chiaro" : "Tema scuro"}
          </button>
          <button
            data-tour="help"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => window.dispatchEvent(new Event("wv:tour"))}
          >
            <HelpCircle size={18} /> Guida (tour)
          </button>
          <button
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-wv-danger"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut size={18} /> Esci
          </button>
        </div>
      </aside>
    </>
  );
}
