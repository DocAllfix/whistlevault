import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
      QRCode.toCanvas(canvasRef.current, receipt, { width: 168, margin: 1 }).catch(() => {});
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

  return (
    <>
      <h1>{t("sent_title")}</h1>
      <div className="notice warn">
        <strong>{t("keep_code_strong")}</strong>
        {t("keep_code")}
      </div>

      <div className="card">
        <div className="receipt-code" aria-label={t("code_label")}>
          {receipt}
        </div>
        <div className="btn-row">
          <button className="btn btn-secondary" onClick={copy}>
            {copied ? t("copied") : t("copy_code")}
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          <canvas ref={canvasRef} aria-label={t("code_label")} />
        </div>
      </div>

      <div className="btn-row">
        <Link className="btn btn-primary" to="/controlla">
          {t("go_check")}
        </Link>
      </div>
    </>
  );
}
