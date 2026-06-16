import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export function Nav() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const isCustodian = role === "custodian";

  return (
    <header className="topbar">
      <span className="brand">Backoffice</span>
      <nav>
        <NavLink to="/" end>
          Segnalazioni
        </NavLink>
        {isCustodian && <NavLink to="/custodian">Richieste identità</NavLink>}
        {isAdmin && <NavLink to="/admin/users">Utenti</NavLink>}
        {isAdmin && <NavLink to="/admin/questionnaires">Questionari</NavLink>}
      </nav>
      <span className="spacer" />
      <span className="muted" style={{ color: "#cbd5e1" }}>
        {role}
      </span>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        Esci
      </button>
    </header>
  );
}
