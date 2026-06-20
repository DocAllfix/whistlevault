#!/usr/bin/env bash
# Generate the DEMO Caddyfile: N neutral tenants x 2 hosts under one deSEC base.
# Branch demo-sales only (production keeps the templated deploy/Caddyfile on main).
#
# Usage:
#   deploy/gen-demo-caddyfile.sh <base-domain> [count] > deploy/Caddyfile
#   e.g. deploy/gen-demo-caddyfile.sh wbapp.dedyn.io 10 > deploy/Caddyfile
#
# Each environment N:
#   public (segnalazioni): wbappN-seg.<base>   -> /srv/public      (mic enabled for voice)
#   backoffice (gestione): wbappN.<base>       -> /srv/backoffice
# Per-host automatic HTTPS via Let's Encrypt HTTP-01 (the deSEC wildcard A record
# makes every host resolve to this server). Access logging stays OFF (Caddy
# default) so reporter IPs are never written to disk.
set -euo pipefail

BASE="${1:?base domain richiesto, es. wbapp.dedyn.io}"
COUNT="${2:-10}"

pub=""
back=""
for n in $(seq 1 "$COUNT"); do
  if [ -z "$pub" ]; then sep=""; else sep=", "; fi
  pub="${pub}${sep}wbapp${n}-seg.${BASE}"
  back="${back}${sep}wbapp${n}.${BASE}"
done

cat <<EOF
# AUTO-GENERATED demo Caddyfile (branch demo-sales) — non modificare a mano.
# Rigenera con: deploy/gen-demo-caddyfile.sh ${BASE} ${COUNT} > deploy/Caddyfile
# ${COUNT} ambienti demo neutri. HTTPS automatico per host (HTTP-01).
# Privacy: access log OFF (default Caddy) -> nessun IP del segnalante su disco.

# --- Portali pubblici di segnalazione (mic abilitato per il campo vocale) -----
${pub} {
	encode gzip
	root * /srv/public
	handle /api/* {
		reverse_proxy api:8000
	}
	handle {
		try_files {path} /index.html
		file_server
	}
	header {
		Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "no-referrer"
		Cross-Origin-Opener-Policy "same-origin"
		Permissions-Policy "geolocation=(), camera=(), microphone=(self)"
		Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
	}
}

# --- Backoffice gestori -------------------------------------------------------
${back} {
	encode gzip
	root * /srv/backoffice
	handle /api/* {
		reverse_proxy api:8000
	}
	handle {
		try_files {path} /index.html
		file_server
	}
	header {
		Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "no-referrer"
		Cross-Origin-Opener-Policy "same-origin"
		Permissions-Policy "geolocation=(), camera=(), microphone=()"
		Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
	}
}
EOF
