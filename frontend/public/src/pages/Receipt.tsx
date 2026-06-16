import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function Receipt() {
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
      <h1>Segnalazione inviata</h1>
      <div className="notice warn">
        <strong>Conserva questo codice.</strong> È l'unico modo per rientrare, leggere le risposte e
        aggiungere informazioni. Non potrà essere recuperato se lo perdi.
      </div>

      <div className="card">
        <div className="receipt-code" aria-label="Codice della segnalazione">
          {receipt}
        </div>
        <div className="btn-row">
          <button className="btn btn-secondary" onClick={copy}>
            {copied ? "Copiato ✓" : "Copia codice"}
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          <canvas ref={canvasRef} aria-label="Codice QR della segnalazione" />
        </div>
      </div>

      <div className="btn-row">
        <Link className="btn btn-primary" to="/controlla">
          Vai a "Controlla la tua segnalazione"
        </Link>
      </div>
    </>
  );
}
