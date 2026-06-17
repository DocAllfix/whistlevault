import {
  BarChart3,
  ClipboardList,
  HelpCircle,
  History,
  Inbox,
  LogOut,
  Palette,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { VaultMark } from "./icons";
import { cn } from "../lib/utils";

export const ROLE_LABEL: Record<string, string> = {
  admin: "Amministratore",
  recipient: "Gestore",
  custodian: "Custode",
  analyst: "Analista",
};

const item =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-wv-surface2 hover:text-wv-navy";
const active = "bg-wv-accent-tint text-wv-accent-strong hover:bg-wv-accent-tint hover:text-wv-accent-strong";

export function Sidebar() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const isCustodian = role === "custodian";
  const isAnalyst = role === "analyst";

  const link = ({ isActive }: { isActive: boolean }) => cn(item, isActive && active);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <VaultMark size={24} className="text-wv-accent" />
        <span className="font-semibold tracking-tight text-wv-navy">Whistlevault</span>
      </div>

      <nav data-tour="nav" className="flex flex-1 flex-col gap-1 p-3">
        <NavLink to="/" end className={link}>
          <Inbox size={18} /> Segnalazioni
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin/organization" className={link}>
            <Palette size={18} /> Personalizza
          </NavLink>
        )}
        {isCustodian && (
          <NavLink to="/custodian" className={link}>
            <ShieldCheck size={18} /> Richieste identità
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/users" className={link}>
            <Users size={18} /> Utenti
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/questionnaires" className={link}>
            <ClipboardList size={18} /> Questionari
          </NavLink>
        )}
        {(isAdmin || isAnalyst) && (
          <NavLink to="/stats" className={link}>
            <BarChart3 size={18} /> Statistiche
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/audit" className={link}>
            <History size={18} /> Registro attività
          </NavLink>
        )}
        <NavLink to="/settings" className={link}>
          <Settings size={18} /> Impostazioni
        </NavLink>
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-wv-navy text-sm font-semibold text-white">
            {(ROLE_LABEL[role ?? ""] ?? "?").charAt(0)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-wv-navy">{ROLE_LABEL[role ?? ""] ?? role}</div>
            <div className="truncate text-xs text-muted-foreground">Backoffice</div>
          </div>
        </div>
        <button
          data-tour="help"
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-wv-surface2 hover:text-wv-navy"
          onClick={() => window.dispatchEvent(new Event("wv:tour"))}
        >
          <HelpCircle size={18} /> Guida (tour)
        </button>
        <button
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-wv-surface2 hover:text-wv-danger"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogOut size={18} /> Esci
        </button>
      </div>
    </aside>
  );
}
