"""Stress / concurrency harness for the demo (branch demo-sales, throwaway).

Dependency-free (stdlib only): runs inside the api container and hits the app on
localhost:8000, setting the Host header per tenant so the SAME tenant-resolution +
isolation code paths as real traffic are exercised. Threads + a Barrier fire
requests in the SAME instant.

Scenarios:
  A) SPREAD  : PER_TENANT submits on EACH of the N tenants, all fired together.
               -> throughput, status tally, per-tenant success (isolation is then
                  confirmed out-of-band via `SELECT tenant_id, count(*) ...`).
  B) BURST   : BURST submits onto ONE tenant at once -> rate-limit holds (429s),
               no 5xx, no crash, progressive integrity.
  C) LOGINS  : LOGIN_ROUNDS concurrent admin logins per tenant (Argon2 storm).

Usage (in container):
  WB_DEMO_BASE_DOMAIN=wbapp.dedyn.io WB_DEMO_COUNT=10 python scripts/stress_demo.py
"""

import json
import os
import threading
import time
import urllib.error
import urllib.request
from collections import Counter

from app import crypto

BASE = os.environ.get("WB_DEMO_BASE_DOMAIN", "wbapp.dedyn.io")
COUNT = int(os.environ.get("WB_DEMO_COUNT", "10"))
API = os.environ.get("WB_STRESS_API", "http://localhost:8000")
PER_TENANT = int(os.environ.get("WB_STRESS_PER_TENANT", "20"))
BURST = int(os.environ.get("WB_STRESS_BURST", "50"))
LOGIN_ROUNDS = int(os.environ.get("WB_STRESS_LOGIN_ROUNDS", "3"))
CRED_FILE = os.environ.get("WB_DEMO_CRED_FILE", "/data/demo-credentials.txt")


def pub_host(n: int) -> str:
    return f"wbappdemo{n}-segnalazioni.{BASE}"


def back_host(n: int) -> str:
    return f"wbappdemo{n}.{BASE}"


def http(method: str, path: str, host: str, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data, method=method)
    req.add_header("Host", host)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, resp.read(), time.perf_counter() - t0
    except urllib.error.HTTPError as e:
        return e.code, e.read(), time.perf_counter() - t0
    except Exception as e:  # noqa: BLE001
        return -1, str(e).encode(), time.perf_counter() - t0


def load_questionnaire(n: int):
    host = pub_host(n)
    st, raw, _ = http("GET", "/api/public", host)
    cfg = json.loads(raw)
    ctx = cfg["contexts"][0]
    cid = ctx["id"]
    st2, raw2, _ = http("GET", f"/api/public/contexts/{cid}", host)
    q = json.loads(raw2)["questionnaire"]
    fields = {f["key"]: f for s in q["steps"] for f in s["fields"]}
    return cid, fields, (cfg.get("branding") or {}).get("name")


def opt(field, want):
    for o in field["options"]:
        if o["label"].get("it") == want:
            return o["label"]["it"]
    return field["options"][0]["label"]["it"]


def build_answers(fields, n, i):
    return {
        fields["categoria"]["id"]: opt(fields["categoria"], "Corruzione"),
        fields["gravita"]["id"]: opt(fields["gravita"], "Alta"),
        fields["descrizione"]["id"]: f"Stress tenant {n} #{i}",
    }


def submit(n, cid, answers, barrier, out):
    pub, _ = crypto.generate_keypair()
    body = {"context_id": cid, "answers": answers, "identity": None, "wb_pub": pub}
    barrier.wait()
    st, _, dt = http("POST", "/api/report", pub_host(n), body)
    out.append((n, st, dt))


def login(n, password, barrier, out):
    barrier.wait()
    st, _, dt = http("POST", "/api/auth/login", back_host(n),
                     {"username": "admin", "password": password})
    out.append((n, st, dt))


def run_jobs(jobs):
    """jobs: list of (callable) ; fire all simultaneously via a barrier."""
    barrier = threading.Barrier(len(jobs))
    out: list = []
    threads = [threading.Thread(target=j, args=(barrier, out)) for j in jobs]
    t0 = time.perf_counter()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return out, time.perf_counter() - t0


def parse_creds():
    creds = {}
    cur = None
    try:
        for line in open(CRED_FILE, encoding="utf-8"):
            line = line.strip()
            if line.startswith("## WBApp Demo "):
                cur = int(line.rsplit(" ", 1)[1])
            elif line.startswith("Password:") and cur:
                creds[cur] = line.split(":", 1)[1].strip()
    except OSError:
        pass
    return creds


def main():
    tenants = {}
    for n in range(1, COUNT + 1):
        cid, fields, brand = load_questionnaire(n)
        tenants[n] = (cid, fields, brand)
    print(f"Tenants caricati: {COUNT}  (brand es. tenant1={tenants[1][2]})")

    # --- A) SPREAD: PER_TENANT submit su OGNI tenant, tutti nello stesso istante
    jobs = []
    for n, (cid, fields, _) in tenants.items():
        for i in range(PER_TENANT):
            ans = build_answers(fields, n, i)
            jobs.append(lambda b, o, n=n, cid=cid, ans=ans: submit(n, cid, ans, b, o))
    out, dt = run_jobs(jobs)
    codes = Counter(st for _, st, _ in out)
    per_tenant_ok = Counter(n for n, st, _ in out if st == 200)
    print(f"\n[A] SPREAD: {len(jobs)} submit simultanei in {dt:.2f}s "
          f"({len(jobs)/dt:.0f} req/s)")
    print(f"    status: {dict(codes)}")
    print(f"    2xx per-tenant: {dict(sorted(per_tenant_ok.items()))}")
    print(f"    5xx: {sum(v for k, v in codes.items() if isinstance(k, int) and 500 <= k < 600)}")

    # --- B) BURST: BURST submit su UN tenant -> il rate-limit deve reggere
    cid, fields, _ = tenants[1]
    jobs = [lambda b, o, i=i: submit(1, cid, build_answers(fields, 1, 1000 + i), b, o)
            for i in range(BURST)]
    out, dt = run_jobs(jobs)
    codes = Counter(st for _, st, _ in out)
    print(f"\n[B] BURST su tenant 1: {BURST} simultanei in {dt:.2f}s")
    print(f"    status: {dict(codes)}  (atteso: ~30x200 poi 429; 0x5xx)")

    # --- C) LOGIN storm (Argon2) su tutti i tenant
    creds = parse_creds()
    jobs = []
    for n in range(1, COUNT + 1):
        if n not in creds:
            continue
        for _ in range(LOGIN_ROUNDS):
            jobs.append(lambda b, o, n=n: login(n, creds[n], b, o))
    if jobs:
        out, dt = run_jobs(jobs)
        codes = Counter(st for _, st, _ in out)
        lat = sorted(d for _, _, d in out)
        p50 = lat[len(lat) // 2]
        p95 = lat[int(len(lat) * 0.95)]
        print(f"\n[C] LOGIN storm: {len(jobs)} login simultanei in {dt:.2f}s "
              f"({len(jobs) / dt:.1f} login/s, Argon2 interactive)")
        print(f"    status: {dict(codes)}  latenza p50={p50:.2f}s p95={p95:.2f}s")
    print("\nFatto. Verifica conteggi per-tenant via psql per l'isolamento.")


if __name__ == "__main__":
    main()
