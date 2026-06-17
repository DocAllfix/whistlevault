# Product

## Register

product

## Users

Two audiences share the public surface:

- **Whistleblowers** (primary): employees, suppliers, or third parties reporting a
  wrongdoing. Often anxious, distrustful, possibly on a personal or monitored device,
  sometimes via Tor. They may be anonymous and have no account. Their job: file a report
  and later re-enter with a receipt code to follow up, without ever exposing their identity.
- **Buyers / compliance** (secondary): compliance officers and auditors at client
  organizations evaluating the platform against EU Directive 2019/1937, D.lgs. 24/2023,
  and GDPR. Their job: trust at a glance that this is serious, compliant, and safe.

The authenticated back-office (handlers, admins, custodian, analyst) is a separate product
surface, not covered by the public-facing personality here.

## Product Purpose

A secure, EU-compliant internal whistleblowing channel. A reporter submits a report through
a guided questionnaire, receives a one-time receipt code, and uses that code to hold an
encrypted two-way conversation with the case handlers. The platform is zero-knowledge on the
return channel (the server never sees the receipt and cannot decrypt the reporter's thread),
collects no IP / user-agent / PII, and encrypts content at rest. Success: a reporter
completes a submission and feels safe doing it; a compliance buyer trusts the product
without a sales call.

## Brand Personality

Sober, trustworthy, protective, with the calm confidence of a modern technology platform.

- **Voice**: plain, reassuring, precise. Explains what happens to the reporter's data before
  asking for anything. Never alarmist, never cold-corporate, never "hacker-cool".
- **Tone**: institutional but human. The reporter should feel protected; the auditor should
  feel the rigor. Legal references are present but never the loudest thing on the page.
- **Emotional goal**: lower the reporter's fear; raise the buyer's confidence.

## Anti-references

- **SaaS cliché**: purple/blue gradients, hero-metric template (giant numbers), identical
  icon+title+text card grids, marketing buzzwords, the "AI made this" look.
- **Dark-hacker / cyber**: dark "cyber-security" theme, matrix-green, aggressive padlocks,
  darknet aesthetics. Wrong signal for institutional trust.
- **Dated public-administration portal**: dense gray 2010-era gov look, tables everywhere,
  no hierarchy, hard to read.
- **Cold / impersonal corporate**: stock handshake photography, distant corporate tone that
  pushes away an already-vulnerable reporter.

## Design Principles

1. **Safety is the message.** Every screen makes the protection legible: what is encrypted,
   what is anonymous, what the server cannot see. Reassurance is content, not decoration.
2. **Practice what you preach.** A privacy product must leak nothing: self-hosted fonts and
   assets (no third-party CDN, Tor-friendly), no trackers, no external calls from the page.
3. **Calm over spectacle.** A vulnerable user is in flow; the interface disappears into the
   task. Motion conveys state, never performs.
4. **Earned trust, not claimed.** Show the mechanism (codes, encryption, legal basis) plainly
   instead of asserting "secure" with a badge. Specific beats adjectival.
5. **One vocabulary everywhere.** Same buttons, fields, surfaces, and rhythm across submit,
   check, and receipt, so nothing feels improvised on a high-stakes flow.

## Accessibility & Inclusion

- **WCAG 2.1 AAA target** (already a committed project constraint): body contrast ≥ 7:1 where
  feasible, ≥ 4.5:1 floor; large text ≥ 4.5:1.
- Full keyboard navigation, visible 3px+ focus rings, skip link, semantic landmarks, labelled
  controls, `aria-live` for async errors.
- `prefers-reduced-motion` honored on every animation (crossfade / instant fallback).
- Base text ≥ 16px; touch targets ≥ 44px. No meaning by color alone.
- Bilingual IT/EN today, RTL-ready structure.
