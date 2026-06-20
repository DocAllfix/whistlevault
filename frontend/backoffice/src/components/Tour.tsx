import { driver, type DriveStep } from "driver.js";
import "../lib/driver-theme.css";
import { useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";

const DONE_KEY = "wv_tour_done";

const reducedMotion =
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type Side = "top" | "right" | "bottom" | "left";

function intro(title: string, description: string): DriveStep {
  return { popover: { title, description } };
}
function at(selector: string, title: string, description: string, side: Side = "right"): DriveStep {
  return { element: selector, popover: { title, description, side, align: "start" } };
}

function stepsFor(path: string): DriveStep[] {
  if (path === "/") {
    return [
      intro("Benvenuto", "Questa è l'area gestori. In pochi passi ti mostriamo le funzioni principali. Potrai rivedere la guida quando vuoi."),
      at('[data-tour="nav"]', "Navigazione", "Da qui raggiungi Segnalazioni, Personalizzazione, Questionari, Utenti, Statistiche e Registro attività (le voci dipendono dal tuo ruolo)."),
      at('[data-tour="dash-tools"]', "Ricerca e filtri", "Cerca per testo o numero, ordina per data o scadenza e filtra per canale.", "bottom"),
      at('[data-tour="dash-list"]', "Le segnalazioni", "Raggruppate per data. Vedi stato, badge «Novità» e scadenza; clicca una riga per aprire il caso.", "top"),
      at('[data-tour="help"]', "Riapri la guida", "Da questo pulsante puoi rilanciare il tour della pagina in qualsiasi momento.", "right"),
    ];
  }
  if (path.startsWith("/cases/")) {
    return [
      intro("Dettaglio segnalazione", "Qui gestisci una singola segnalazione: contenuto, stato, messaggi e azioni."),
      at('[data-tour="case-status"]', "Stato e identità", "Aggiorna lo stato del caso e, se previsto, richiedi al custode l'accesso all'identità.", "bottom"),
      at('[data-tour="case-content"]', "Contenuto", "Le risposte del segnalante, decifrate solo per te. Puoi oscurare testi sensibili.", "top"),
      at('[data-tour="case-messages"]', "Messaggi", "Dialoga in modo cifrato col segnalante; scegli la visibilità di ogni messaggio.", "top"),
      at('[data-tour="case-export"]', "Esporta", "Scarica il caso completo (risposte + allegati) in un archivio ZIP.", "left"),
    ];
  }
  if (path.startsWith("/admin/organization")) {
    return [
      intro("Personalizzazione", "Configura l'aspetto pubblico e i parametri dei canali."),
      at('[data-tour="org-branding"]', "Branding", "Nome, colore e logo mostrati nel portale pubblico dei segnalanti.", "bottom"),
      at('[data-tour="org-canali"]', "Canali", "Conservazione, promemoria (SLA) e soglie di rischio per ogni canale.", "top"),
      at('[data-tour="org-notifiche"]', "Notifiche", "Attiva/disattiva e personalizza le email ai gestori (sempre senza contenuti).", "top"),
    ];
  }
  if (path.startsWith("/admin/questionnaires")) {
    return [
      intro("Questionari", "Crea e modifica i moduli di segnalazione."),
      at('[data-tour="qx-new"]', "Nuovo questionario", "Aggiungi passi e domande, imposta tipo, obbligatorietà, logica condizionale e peso di rischio.", "left"),
    ];
  }
  if (path.startsWith("/admin/users")) return [intro("Utenti", "Crea gestori, custodi e analisti, gestisci ruoli e recupero account (escrow).")];
  if (path.startsWith("/admin/audit")) return [intro("Registro attività", "Eventi di sistema e azioni dei gestori. Mai contenuti delle segnalazioni né dati personali.")];
  if (path.startsWith("/stats")) return [intro("Statistiche", "Numeri aggregati: per stato, canale e mese. Nessun contenuto, nessun PII.")];
  if (path.startsWith("/settings")) return [intro("Impostazioni", "Cambia la tua password e attiva l'autenticazione a due fattori (2FA).")];
  if (path.startsWith("/custodian")) return [intro("Richieste identità", "Approva o nega le richieste di accesso all'identità dei segnalanti.")];
  return [];
}

export function Tour() {
  const { pathname } = useLocation();

  const run = useCallback(() => {
    const steps = stepsFor(pathname);
    if (steps.length === 0) return;
    const d = driver({
      animate: !reducedMotion,
      showProgress: steps.length > 1,
      allowClose: true,
      smoothScroll: true,
      disableActiveInteraction: true,
      stagePadding: 8,
      stageRadius: 10,
      popoverClass: "wv-popover",
      overlayColor: "rgb(15 23 42 / 0.55)",
      nextBtnText: "Avanti →",
      prevBtnText: "← Indietro",
      doneBtnText: "Fatto",
      progressText: "{{current}} di {{total}}",
      onCloseClick: (_el, _step, opts) => opts.driver.destroy(),
      steps,
    });
    d.drive();
  }, [pathname]);

  // Auto-start once per browser session: resets each new session so a first-time
  // visitor (e.g. a demo reviewer) always sees the tour on entry, without nagging
  // on every page within the same session. Re-runnable anytime via the "?" button.
  useEffect(() => {
    if (sessionStorage.getItem(DONE_KEY)) return;
    const t = setTimeout(() => {
      sessionStorage.setItem(DONE_KEY, "1");
      run();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-trigger from the "?" button (dispatched as a window event).
  useEffect(() => {
    const h = () => run();
    window.addEventListener("wv:tour", h);
    return () => window.removeEventListener("wv:tour", h);
  }, [run]);

  return null;
}
