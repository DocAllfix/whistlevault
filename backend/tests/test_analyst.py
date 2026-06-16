"""R12 verification: analyst aggregate statistics + RBAC."""

import pytest

from app.db.enums import UserRole
from tests.test_cases import _answers, _auth, _login, _make_user


@pytest.mark.asyncio
async def test_stats_aggregates(client, engine):
    ac, data = client
    answers = await _answers(engine)
    await ac.post("/api/report", json={"answers": answers})
    await ac.post("/api/report", json={"answers": answers})

    tok = await _login(ac, "admin", data["admin_password"])
    s = (await ac.get("/api/analyst/stats", headers=_auth(tok))).json()
    assert s["total"] >= 2
    assert sum(x["count"] for x in s["by_status"]) >= 2
    assert sum(x["count"] for x in s["by_context"]) >= 2
    assert sum(s["by_month"].values()) >= 2


@pytest.mark.asyncio
async def test_stats_requires_analyst_or_admin(client, engine):
    ac, _ = client
    await _make_user(engine, "recp", UserRole.recipient, "RecpPass1!")
    tok = await _login(ac, "recp", "RecpPass1!")
    assert (await ac.get("/api/analyst/stats", headers=_auth(tok))).status_code == 403


@pytest.mark.asyncio
async def test_stats_analyst_allowed(client, engine):
    ac, _ = client
    await _make_user(engine, "ana", UserRole.analyst, "AnaPass1!")
    tok = await _login(ac, "ana", "AnaPass1!")
    assert (await ac.get("/api/analyst/stats", headers=_auth(tok))).status_code == 200
