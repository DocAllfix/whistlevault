# Brand — Whistlevault

Brand del **prodotto** (la nostra piattaforma). Distinto dal *white-label* dei clienti:
i portali dei clienti mostrano **il logo del cliente**; il marchio Whistlevault appare su
sito marketing, documentazione, dominio `whistlevault.eu` e (opzionale) header del backoffice.

## Significato
**Whistle** (dare voce, segnalare) + **Vault** (protezione, riservatezza). Il simbolo è uno
**scudo/caveau** con **onde di voce**: sicurezza + possibilità di parlare.

## Asset
| File | Uso |
|------|-----|
| [logo.svg](logo.svg) | Logo orizzontale su sfondo chiaro |
| [logo-inverse.svg](logo-inverse.svg) | Logo su sfondo scuro (es. topbar navy) |
| [logo-icon.svg](logo-icon.svg) | Solo simbolo (avatar, app icon) |
| [favicon.svg](favicon.svg) | Favicon (simbolo su tile navy arrotondata) |

Tutti **SVG vettoriali** → scalano senza perdita e si ricolorano via codice. Niente font esterni
(usano lo stack di sistema, coerente con la scelta privacy/no-CDN del prodotto).

## Palette (coerente con i token dell'app)
| Ruolo | HEX |
|------|-----|
| Primary (navy) | `#0F172A` |
| Accent (blu) | `#0369A1` |
| Accent chiaro (su scuro) | `#7FB2D6` |
| Sfondo | `#F8FAFC` |
| Errore | `#DC2626` |
| Successo | `#15803D` |

## Tipografia
- **Prodotto/app**: stack di sistema (nessuna richiesta esterna → privacy/Tor-friendly).
- **Marketing** (facoltativo): *Lexend* (titoli) + *Source Sans 3* (testo) — abbinamento
  istituzionale/accessibile.

## Tono di voce
Rassicurante, sobrio, istituzionale. Trasmette **fiducia e protezione**, mai allarmismo.
Tagline possibili: *"Segnala in sicurezza."* / *"Il canale di whistleblowing cifrato."*

## Uso del logo — do / don't
- ✅ Mantieni uno spazio di rispetto attorno al logo (≈ altezza della "W").
- ✅ Usa `logo-inverse.svg` su sfondi scuri.
- ❌ Non distorcere le proporzioni, non ruotare, non cambiare i colori arbitrariamente.
- ❌ Niente gradienti viola/rosa "AI" o effetti pesanti (fuori stile, anti-pattern).

## Nota white-label
Questo brand è **nostro**. Per ogni cliente, logo/colori/testi del portale arrivano da
`tenant.settings` e prevalgono nell'interfaccia rivolta ai segnalanti.
