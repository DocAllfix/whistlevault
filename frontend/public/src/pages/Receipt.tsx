import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Copy } from "../components/icons";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Notice } from "../components/ui/notice";
import { useI18n } from "../i18n";

export function Receipt() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const receipt = (location.state as { receipt?: string } | null)?.receipt;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!receipt) {
      navigate("/", { replace: true });
      return;
    }
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, receipt, { width: 152, margin: 1 }).catch(() => {});
    }
  }, [receipt, navigate]);

  if (!receipt) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(receipt!);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      /* clipboard unavailable */
    }
  }

  function downloadQr() {
    const url = canvasRef.current?.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "ricevuta-qr.png";
    a.click();
  }

  return (
    <div className="mx-auto max-w-md px-5 py-12">
      <h1 className="text-3xl">{t("sent_title")}</h1>
      <div className="mt-4">
        <Notice variant="warn">
          <strong>{t("keep_code_strong")}</strong>
          {t("keep_code")}
        </Notice>
      </div>

      <Card className="mt-6 p-6">
        <div
          className="rounded-md bg-wv-navy px-4 py-5 text-center font-mono text-2xl font-semibold tracking-[0.28em] text-white"
          aria-label={t("code_label")}
        >
          {receipt}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <div className="rounded-md border bg-white p-3 leading-[0]">
            <canvas ref={canvasRef} aria-label={t("code_label")} />
          </div>
          <div className="no-print flex flex-wrap gap-3">
            <Button variant="secondary" onClick={copy}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? t("copied") : t("copy_code")}
            </Button>
            <Button variant="secondary" onClick={downloadQr}>
              {t("download_qr")}
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              {t("print_receipt")}
            </Button>
          </div>
        </div>
      </Card>

      <Button asChild className="no-print mt-6">
        <Link to="/controlla">
          {t("go_check")}
          <ArrowRight size={18} />
        </Link>
      </Button>
    </div>
  );
}
