// Thin API client. The auth token (whistleblower session) is held in memory by
// callers and passed explicitly — no tracking, no persistent storage.

const BASE = "/api";

export interface PublicContext {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  questionnaire_id: string | null;
}

export interface FieldOption { id: string; label: Record<string, string>; order: number; }
export interface Field {
  id: string;
  label: Record<string, string>;
  hint: Record<string, string>;
  type: string;
  required: boolean;
  order: number;
  options: FieldOption[];
}
export interface Step { id: string; label: Record<string, string>; description: Record<string, string>; order: number; fields: Field[]; }
export interface Questionnaire { id: string; name: string; steps: Step[]; }

export interface ReportView {
  report_id: string;
  progressive: number;
  status_id: string | null;
  created_at: string;
  answers: Record<string, unknown>;
  comments: { id: string; author_kind: string; content: string; created_at: string }[];
  files: { id: string; name: string; content_type: string; size: number; author_kind: string }[];
}

async function req<T>(path: string, opts: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...opts, headers });
  if (!res.ok) {
    let detail = `Errore ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

function json(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const api = {
  publicConfig: () => req<{ branding: Record<string, unknown>; contexts: PublicContext[] }>("/public"),
  context: (id: string) =>
    req<{ id: string; name: Record<string, string>; description: Record<string, string>; questionnaire: Questionnaire | null }>(
      `/public/contexts/${id}`,
    ),
  submit: (contextId: string, answers: Record<string, unknown>, identity?: Record<string, string>) =>
    req<{ report_id: string; receipt: string; token: string }>(
      "/report",
      json({ context_id: contextId, answers, identity: identity ?? null }),
    ),
  receiptAuth: (receipt: string) =>
    req<{ token: string; report_id: string }>("/auth/receipt", json({ receipt })),
  myReport: (token: string) => req<ReportView>("/report/me", {}, token),
  addComment: (token: string, content: string) =>
    req<{ status: string }>("/report/me/comments", json({ content }), token),
  uploadFile: (token: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req<{ file_id: string }>("/report/me/files", { method: "POST", body: form }, token);
  },
};
