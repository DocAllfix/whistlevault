// Backoffice API client. Token is provided per call (held in AuthContext).

const BASE = "/api";

async function req<T>(path: string, opts: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...opts, headers });
  if (!res.ok) {
    let detail = `Errore ${res.status}`;
    try {
      const b = await res.json();
      if (b.detail) detail = typeof b.detail === "string" ? b.detail : JSON.stringify(b.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

function j(body: unknown, method = "POST"): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export interface CaseSummary {
  report_id: string;
  progressive: number;
  status_id: string | null;
  context_id: string;
  important: boolean;
  label: string;
  new: boolean;
  created_at: string;
  updated_at: string;
  expiration_date: string | null;
}

export interface CaseDetail {
  report_id: string;
  progressive: number;
  status_id: string | null;
  important: boolean;
  score: number;
  label: string;
  created_at: string;
  expiration_date: string | null;
  identity_available: boolean;
  identity_granted: boolean;
  identity: Record<string, unknown> | null;
  identity_request_status: string | null;
  answers: Record<string, unknown>;
  comments: { id: string; author_kind: string; visibility: string; content: string; created_at: string }[];
  files: { id: string; name: string; content_type: string; size: number; author_kind: string; visibility: string }[];
}

export const api = {
  login: (username: string, password: string, totp_code?: string) =>
    req<{ token: string; role: string; password_change_needed: boolean }>(
      "/auth/login",
      j({ username, password, totp_code }),
    ),

  twofaInit: (t: string) =>
    req<{ secret: string; otpauth_uri: string }>("/auth/2fa/init", { method: "POST" }, t),
  twofaConfirm: (t: string, secret: string, code: string) =>
    req<{ status: string; recovery_codes: string[] }>("/auth/2fa/confirm", j({ secret, code }), t),
  twofaDisable: (t: string, code: string) => req("/auth/2fa/disable", j({ code }), t),
  forgotPassword: (username: string) => req("/auth/password/forgot", j({ username })),
  resetPassword: (token: string, new_password: string) =>
    req("/auth/password/reset", j({ token, new_password })),

  // Cases
  cases: (t: string, statusId?: string) =>
    req<CaseSummary[]>(`/cases${statusId ? `?status_id=${statusId}` : ""}`, {}, t),
  caseDetail: (t: string, id: string) => req<CaseDetail>(`/cases/${id}`, {}, t),
  addComment: (t: string, id: string, content: string, visibility: string) =>
    req(`/cases/${id}/comments`, j({ content, visibility }), t),
  changeStatus: (t: string, id: string, status_id: string) =>
    req(`/cases/${id}/status`, j({ status_id }), t),
  requestIdentity: (t: string, id: string, motivation: string) =>
    req<{ identity_request_id: string }>(`/cases/${id}/identity-requests`, j({ motivation }), t),
  fileUrl: (id: string, fileId: string) => `${BASE}/cases/${id}/files/${fileId}`,
  exportUrl: (id: string) => `${BASE}/cases/${id}/export`,
  createRedaction: (t: string, id: string, reference: string, mask: string[], permanent: boolean) =>
    req(`/cases/${id}/redactions`, j({ reference, mask, permanent }), t),
  grantAccess: (t: string, id: string, user_id: string) =>
    req(`/cases/${id}/grant`, j({ user_id }), t),
  transferAccess: (t: string, id: string, user_id: string) =>
    req(`/cases/${id}/transfer`, j({ user_id }), t),
  revokeAccess: (t: string, id: string, user_id: string) =>
    req(`/cases/${id}/revoke`, j({ user_id }), t),

  // Statuses (for the dropdown)
  statuses: (t: string) =>
    req<{ id: string; label: Record<string, string>; order: number }[]>("/admin/statuses", {}, t),

  // Custodian
  pendingIdentity: (t: string) =>
    req<{ id: string; report_id: string; motivation: string; request_date: string }[]>(
      "/custodian/identity-requests",
      {},
      t,
    ),
  resolveIdentity: (t: string, iarId: string, grant: boolean, motivation: string) =>
    req(`/custodian/identity-requests/${iarId}`, j({ grant, motivation }), t),

  // Admin: users
  users: (t: string) => req<any[]>("/admin/users", {}, t),
  createUser: (t: string, body: Record<string, unknown>) => req<any>("/admin/users", j(body), t),
  deleteUser: (t: string, id: string) => req(`/admin/users/${id}`, { method: "DELETE" }, t),

  // Admin: questionnaires
  questionnaires: (t: string) => req<any[]>("/admin/questionnaires", {}, t),
  createQuestionnaire: (t: string, body: unknown) => req<any>("/admin/questionnaires", j(body), t),
  updateQuestionnaire: (t: string, id: string, body: unknown) =>
    req<any>(`/admin/questionnaires/${id}`, j(body, "PUT"), t),

  // Admin: audit log
  auditLog: (t: string) => req<any[]>("/admin/audit-log", {}, t),

  // Analyst statistics
  stats: (t: string) =>
    req<{
      total: number;
      important: number;
      by_status: { status_id: string | null; label: string; count: number }[];
      by_context: { context_id: string; name: string; count: number }[];
      by_month: Record<string, number>;
    }>("/analyst/stats", {}, t),
};
