"""Per-instance authoritative verification for demo tenants (branch demo-sales).

For each tenant in [START..COUNT] it exercises the EXACT app code paths a browser
hits (tenant resolution by Host, crypto, isolation), over localhost:8000 with the
per-tenant Host header — so it is independent of any ISP/DNS filtering:

  * submit a uniquely-marked report via the public host  -> arrives
  * log in as admin{n} (must be frictionless: 2FA not forced) -> credential OK
  * the report shows in the handler inbox and DECRYPTS to the marker
  * cross-tenant: admin{n} CANNOT read tenant {n+1}'s report (0 leak)

Run inside the api container AFTER provisioning:
  WB_DEMO_COUNT=20 WB_STRESS_START=11 python scripts/verify_demo.py
Reads passwords from WB_DEMO_CRED_FILE (default /data/demo-credentials.txt).
Creates one report per tenant — clean them afterwards (see deploy/DEMO-RUNBOOK.md).
"""

import json
import os
import urllib.error
import urllib.request

BASE = os.environ.get("WB_DEMO_BASE_DOMAIN", "wbapp.dedyn.io")
COUNT = int(os.environ.get("WB_DEMO_COUNT", "10"))
START = int(os.environ.get("WB_STRESS_START", "1"))
API = os.environ.get("WB_STRESS_API", "http://localhost:8000")
CRED_FILE = os.environ.get("WB_DEMO_CRED_FILE", "/data/demo-credentials.txt")


def http(method, path, host, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("Host", host)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def parse_creds(path):
    creds, cur = {}, None
    for line in open(path, encoding="utf-8"):
        s = line.strip()
        if s.startswith("## WBApp Demo "):
            cur = int(s.rsplit(" ", 1)[1])
        elif s.startswith("Password:") and cur:
            creds[cur] = s.split(":", 1)[1].strip()
    return creds


def main():
    creds = parse_creds(CRED_FILE)
    reports, ok = {}, True
    for n in range(START, COUNT + 1):
        pub, back = f"wbappdemo{n}-segnalazioni.{BASE}", f"wbappdemo{n}.{BASE}"
        _, raw = http("GET", "/api/public", pub)
        cid = json.loads(raw)["contexts"][0]["id"]
        _, raw = http("GET", f"/api/public/contexts/{cid}", pub)
        fields = {f["key"]: f for s in json.loads(raw)["questionnaire"]["steps"] for f in s["fields"]}
        marker = f"VERIFY-DEMO-{n}-MARKER"
        ans = {
            fields["categoria"]["id"]: fields["categoria"]["options"][0]["label"]["it"],
            fields["gravita"]["id"]: fields["gravita"]["options"][0]["label"]["it"],
            fields["descrizione"]["id"]: marker,
        }
        st, raw = http("POST", "/api/report", pub, {"context_id": cid, "answers": ans})
        if st != 200:
            print(f"Demo {n}: SUBMIT FAIL {st}"); ok = False; continue
        rid = json.loads(raw)["report_id"]; reports[n] = rid
        st, raw = http("POST", "/api/auth/login", back, {"username": f"admin{n}", "password": creds[n]})
        if st != 200:
            print(f"Demo {n}: LOGIN FAIL {st}"); ok = False; continue
        body = json.loads(raw); tok = body["token"]; twofa = body.get("two_factor_setup_required")
        _, raw = http("GET", "/api/cases", back, token=tok)
        arrived = any(c["report_id"] == rid for c in json.loads(raw))
        _, raw = http("GET", f"/api/cases/{rid}", back, token=tok)
        decrypted = marker in json.dumps(json.loads(raw).get("answers", {}))
        good = arrived and decrypted and twofa is False
        ok = ok and good
        print(f"Demo {n}: arrivo={'OK' if arrived else 'FAIL'} decifratura={'OK' if decrypted else 'FAIL'} "
              f"frictionless={'OK' if twofa is False else 'NO(2fa='+str(twofa)+')'}")

    print("--- isolamento cross-tenant ---")
    nums = sorted(reports)
    for i, n in enumerate(nums[:-1]):
        nxt = nums[i + 1]
        _, raw = http("POST", "/api/auth/login", f"wbappdemo{n}.{BASE}",
                      {"username": f"admin{n}", "password": creds[n]})
        tok = json.loads(raw)["token"]
        st, _ = http("GET", f"/api/cases/{reports[nxt]}", f"wbappdemo{n}.{BASE}", token=tok)
        leak = st not in (403, 404)
        print(f"admin{n} -> report Demo{nxt}: HTTP {st} {'LEAK!!' if leak else 'bloccato OK'}")
        if leak:
            ok = False

    print("\n=== RISULTATO:", "TUTTO OK" if ok else "ATTENZIONE: FALLIMENTI SOPRA", "===")


if __name__ == "__main__":
    main()
