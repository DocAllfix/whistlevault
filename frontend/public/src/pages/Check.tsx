import { useState } from "react";
import { api, ReportView } from "../api";
import { FileIcon, KeyRound } from "../components/icons";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Notice } from "../components/ui/notice";
import { Textarea } from "../components/ui/textarea";
import { cn } from "../lib/utils";
import { useI18n } from "../i18n";
import { decryptToString, initZk, lookupValue, unsealReportPrv, WbKeypair, wbKeypair } from "../zk";

export function Check() {
  const { t } = useI18n();
  const [receipt, setReceipt] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [kp, setKp] = useState<WbKeypair | null>(null);
  const [report, setReport] = useState<ReportView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");

  function decryptView(view: ReportView, keypair: WbKeypair): ReportView {
    if (!view.zk || !view.sealed_report_prv) return view;
    const prv = unsealReportPrv(view.sealed_report_prv, keypair);
    return {
      ...view,
      comments: view.comments.map((c) => ({ ...c, content: c.content_ct ? decryptToString(c.content_ct, prv) : "" })),
      files: view.files.map((f) => ({ ...f, name: f.name_ct ? decryptToString(f.name_ct, prv) : "" })),
    };
  }

  async function loadDecrypt(tk: string, keypair: WbKeypair) {
    setReport(decryptView(await api.myReport(tk), keypair));
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await initZk();
      const keypair = await wbKeypair(receipt.trim());
      const res = await api.receiptAuth({ lookup: lookupValue(keypair) });
      setToken(res.token);
      setKp(keypair);
      await loadDecrypt(res.token, keypair);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invalid_code"));
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !kp || !reply.trim()) return;
    setBusy(true);
    try {
      await api.addComment(token, reply.trim());
      setReply("");
      await loadDecrypt(token, kp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!token || !kp || !e.target.files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(e.target.files)) await api.uploadFile(token, f);
      await loadDecrypt(token, kp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!report)
    return (
      <div className="mx-auto max-w-md px-5 py-12">
        <Badge className="mb-5">
          <KeyRound size={14} />
          {t("code_label")}
        </Badge>
        <h1 className="text-3xl">{t("check_title")}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{t("check_sub")}</p>
        <Card className="mt-6 p-6">
          <form onSubmit={login}>
            <Label htmlFor="receipt">{t("code_label")}</Label>
            <Input
              id="receipt"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className="font-mono text-lg tracking-[0.12em]"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
            />
            {error && (
              <p className="mt-3 text-sm font-semibold text-wv-danger" role="alert" aria-live="polite">
                {error}
              </p>
            )}
            <Button className="mt-5 w-full" type="submit" disabled={busy || receipt.trim().length === 0}>
              {busy ? t("verifying") : t("access")}
            </Button>
          </form>
        </Card>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-3xl">{t("your_report")}</h1>
      <div className="mt-4">
        <Notice variant="ok">
          {t("report_n")} {report.progressive} — {t("received_managed")}
        </Notice>
      </div>

      <h2 className="mt-10 text-2xl">{t("messages")}</h2>
      {report.comments.length === 0 && <p className="mt-2 text-muted-foreground">{t("no_messages")}</p>}
      <div className="mt-4 flex flex-col gap-3">
        {report.comments.map((c) => {
          const mine = c.author_kind !== "recipient";
          return (
            <div
              key={c.id}
              className={cn(
                "max-w-[85%] rounded-lg border p-3.5",
                mine ? "self-end border-[#cbe3f0] bg-wv-accent-tint" : "self-start border-border bg-wv-surface2",
              )}
            >
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {mine ? t("you") : t("handler")}
              </div>
              <div className="text-sm leading-relaxed">{c.content}</div>
            </div>
          );
        })}
      </div>

      <Card className="mt-6 p-6">
        <form onSubmit={sendReply}>
          <Label htmlFor="reply">{t("add_message")}</Label>
          <Textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} />
          <Button className="mt-4" type="submit" disabled={busy || !reply.trim()}>
            {t("send_message")}
          </Button>
        </form>
      </Card>

      <h2 className="mt-10 text-2xl">{t("attachments")}</h2>
      {report.files.length === 0 && <p className="mt-2 text-muted-foreground">{t("no_attachments")}</p>}
      <ul className="mt-3 grid gap-2">
        {report.files.map((f) => (
          <li key={f.id} className="flex items-center gap-3 rounded-md border bg-white px-4 py-3 text-sm">
            <FileIcon size={18} className="shrink-0 text-muted-foreground" />
            <span>{f.name}</span>
            <span className="ml-auto text-muted-foreground">{Math.round(f.size / 1024)} KB</span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <Label htmlFor="upload">{t("add_attachment")}</Label>
        <Input id="upload" type="file" multiple onChange={upload} disabled={busy} />
      </div>

      {error && (
        <p className="mt-4 text-sm font-semibold text-wv-danger" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
