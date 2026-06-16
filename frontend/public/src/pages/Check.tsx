import { useState } from "react";
import { api, ReportView } from "../api";
import { useI18n } from "../i18n";

export function Check() {
  const { t } = useI18n();
  const [receipt, setReceipt] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [report, setReport] = useState<ReportView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.receiptAuth(receipt.trim());
      setToken(res.token);
      setReport(await api.myReport(res.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invalid_code"));
    } finally {
      setBusy(false);
    }
  }

  async function refresh(tk: string) {
    setReport(await api.myReport(tk));
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !reply.trim()) return;
    setBusy(true);
    try {
      await api.addComment(token, reply.trim());
      setReply("");
      await refresh(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!token || !e.target.files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(e.target.files)) await api.uploadFile(token, f);
      await refresh(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!report)
    return (
      <>
        <h1>{t("check_title")}</h1>
        <p>{t("check_sub")}</p>
        <form onSubmit={login}>
          <label htmlFor="receipt">{t("code_label")}</label>
          <input
            id="receipt"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={receipt}
            onChange={(e) => setReceipt(e.target.value)}
          />
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={busy || receipt.trim().length === 0}>
              {busy ? t("verifying") : t("access")}
            </button>
          </div>
        </form>
      </>
    );

  return (
    <>
      <h1>{t("your_report")}</h1>
      <div className="notice ok">
        {t("report_n")} {report.progressive} — {t("received_managed")}
      </div>

      <h2>{t("messages")}</h2>
      {report.comments.length === 0 && <p className="muted">{t("no_messages")}</p>}
      {report.comments.map((c) => (
        <div key={c.id} className={`thread-msg ${c.author_kind === "recipient" ? "from-handler" : ""}`}>
          <div className="who">{c.author_kind === "recipient" ? t("handler") : t("you")}</div>
          <div>{c.content}</div>
        </div>
      ))}

      <form onSubmit={sendReply}>
        <label htmlFor="reply">{t("add_message")}</label>
        <textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} />
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={busy || !reply.trim()}>
            {t("send_message")}
          </button>
        </div>
      </form>

      <h2>{t("attachments")}</h2>
      {report.files.length === 0 && <p className="muted">{t("no_attachments")}</p>}
      <ul>
        {report.files.map((f) => (
          <li key={f.id}>
            {f.name} <span className="muted">({Math.round(f.size / 1024)} KB)</span>
          </li>
        ))}
      </ul>
      <label htmlFor="upload">{t("add_attachment")}</label>
      <input id="upload" type="file" multiple onChange={upload} disabled={busy} />

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
