import { Link } from "react-router-dom";

export function Landing() {
  return (
    <>
      <h1>Segnala in modo sicuro e riservato</h1>
      <p className="lead">
        Questo canale ti permette di segnalare illeciti o irregolarità in modo confidenziale. La
        tua identità è protetta e nessuna ritorsione è ammessa.
      </p>

      <div className="notice">
        <strong>Prima di iniziare</strong>
        <ul>
          <li>Non usare un dispositivo o una rete dell'organizzazione, se possibile.</li>
          <li>Non sei obbligato a fornire il tuo nome né un indirizzo email.</li>
          <li>
            Al termine riceverai un <strong>codice di 16 cifre</strong>: conservalo, è l'unico modo
            per rientrare e seguire la tua segnalazione.
          </li>
        </ul>
      </div>

      <div className="btn-row">
        <Link className="btn btn-primary" to="/segnala">
          Invia una segnalazione
        </Link>
        <Link className="btn btn-secondary" to="/controlla">
          Controlla la tua segnalazione
        </Link>
      </div>

      <h2>Come funziona</h2>
      <p>
        Le segnalazioni vengono cifrate e rese leggibili solo ai gestori autorizzati. Puoi
        comunicare con loro in forma anonima tramite un canale di messaggi protetto, allegare
        documenti e ricevere aggiornamenti sullo stato del caso.
      </p>
    </>
  );
}
