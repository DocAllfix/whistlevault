"""Fase 6 verification: admin CRUD, editable questionnaires, public config, RBAC."""

import pytest

from tests.test_cases import _answers, _login, _make_user
from app.db.enums import UserRole


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_public_config_and_context(client, engine):
    ac, _ = client
    cfg = (await ac.get("/api/public")).json()
    assert len(cfg["contexts"]) >= 1
    ctx_id = cfg["contexts"][0]["id"]
    ctx = (await ac.get(f"/api/public/contexts/{ctx_id}")).json()
    assert ctx["questionnaire"] is not None
    assert len(ctx["questionnaire"]["steps"]) == 3
    assert len(ctx["questionnaire"]["steps"][0]["fields"]) == 2


@pytest.mark.asyncio
async def test_admin_user_lifecycle(client, engine):
    ac, data = client
    token = await _login(ac, "admin", data["admin_password"])

    created = await ac.post(
        "/api/admin/users",
        json={"username": "mario", "password": "MarioPass1!", "role": "recipient", "name": "Mario"},
        headers=_auth(token),
    )
    assert created.status_code == 200
    user_id = created.json()["id"]

    users = (await ac.get("/api/admin/users", headers=_auth(token))).json()
    assert any(u["username"] == "mario" for u in users)

    # New user can log in
    assert (await ac.post("/api/auth/login", json={"username": "mario", "password": "MarioPass1!"})).status_code == 200

    # Update permission
    upd = await ac.patch(
        f"/api/admin/users/{user_id}",
        json={"permissions": {"can_redact_information": True}},
        headers=_auth(token),
    )
    assert upd.json()["permissions"]["can_redact_information"] is True

    # Delete
    assert (await ac.delete(f"/api/admin/users/{user_id}", headers=_auth(token))).status_code == 200


@pytest.mark.asyncio
async def test_admin_questionnaire_editor_drives_public_form(client, engine):
    ac, data = client
    token = await _login(ac, "admin", data["admin_password"])

    q = await ac.post(
        "/api/admin/questionnaires",
        json={
            "name": "custom",
            "steps": [
                {
                    "label": {"it": "Passo 1"},
                    "order": 0,
                    "fields": [
                        {"label": {"it": "Cosa"}, "type": "textarea", "required": True, "order": 0},
                        {
                            "label": {"it": "Gravità"},
                            "type": "select",
                            "required": False,
                            "order": 1,
                            "options": [{"label": {"it": "Alta"}, "order": 0}],
                        },
                    ],
                }
            ],
        },
        headers=_auth(token),
    )
    assert q.status_code == 200
    qid = q.json()["id"]
    assert len(q.json()["steps"][0]["fields"]) == 2

    ctx = await ac.post(
        "/api/admin/contexts",
        json={"name": {"it": "Canale custom"}, "questionnaire_id": qid, "tip_ttl_days": 30},
        headers=_auth(token),
    )
    assert ctx.status_code == 200
    ctx_id = ctx.json()["id"]

    # Public form reflects the custom questionnaire
    pub = (await ac.get(f"/api/public/contexts/{ctx_id}")).json()
    field_ids = [f["id"] for f in pub["questionnaire"]["steps"][0]["fields"]]
    assert len(field_ids) == 2

    # A report can be submitted against the custom context
    required_field = pub["questionnaire"]["steps"][0]["fields"][0]["id"]
    submit = await ac.post(
        "/api/report", json={"context_id": ctx_id, "answers": {required_field: "descrizione"}}
    )
    assert submit.status_code == 200


@pytest.mark.asyncio
async def test_admin_statuses_and_settings(client, engine):
    ac, data = client
    token = await _login(ac, "admin", data["admin_password"])

    statuses = (await ac.get("/api/admin/statuses", headers=_auth(token))).json()
    assert len(statuses) == 3
    # System-defined statuses cannot be deleted
    sys_id = statuses[0]["id"]
    assert (await ac.delete(f"/api/admin/statuses/{sys_id}", headers=_auth(token))).status_code == 400

    # Settings round-trip
    await ac.put(
        "/api/admin/settings",
        json={"settings": {"primary_color": "#0a3d62", "intro": {"it": "Benvenuto"}}},
        headers=_auth(token),
    )
    s = (await ac.get("/api/admin/settings", headers=_auth(token))).json()
    assert s["primary_color"] == "#0a3d62"


@pytest.mark.asyncio
async def test_status_and_substatus_crud(client, engine):
    """WI-1: configurable workflow — status + sub-status CRUD, assignment to a case."""
    ac, data = client
    token = await _login(ac, "admin", data["admin_password"])

    # Create a custom status, then edit its label/order.
    created = await ac.post(
        "/api/admin/statuses",
        json={"label": {"it": "In valutazione", "en": "Under review"}, "order": 5},
        headers=_auth(token),
    )
    assert created.status_code == 200
    status_id = created.json()["id"]
    assert created.json()["substatuses"] == []

    upd = await ac.patch(
        f"/api/admin/statuses/{status_id}",
        json={"label": {"it": "In esame", "en": "Reviewing"}},
        headers=_auth(token),
    )
    assert upd.status_code == 200 and upd.json()["label"]["it"] == "In esame"

    # Add + edit a sub-status; list_statuses must include it.
    sub = await ac.post(
        f"/api/admin/statuses/{status_id}/substatuses",
        json={"label": {"it": "Archiviata", "en": "Archived"}, "order": 0},
        headers=_auth(token),
    )
    assert sub.status_code == 200
    sub_id = sub.json()["id"]

    statuses = (await ac.get("/api/admin/statuses", headers=_auth(token))).json()
    target = next(s for s in statuses if s["id"] == status_id)
    assert len(target["substatuses"]) == 1 and target["substatuses"][0]["label"]["it"] == "Archiviata"

    await ac.patch(f"/api/admin/substatuses/{sub_id}", json={"label": {"it": "Spam"}}, headers=_auth(token))

    # Deleting a system-defined status is refused; a custom one is allowed.
    sys_id = next(s["id"] for s in statuses if s["system_defined"])
    assert (await ac.delete(f"/api/admin/statuses/{sys_id}", headers=_auth(token))).status_code == 400

    # Assign status + sub-status to a real case and verify it persists in the detail.
    report_id = (await ac.post("/api/report", json={"answers": await _answers(engine)})).json()["report_id"]
    r = await ac.post(
        f"/api/cases/{report_id}/status",
        json={"status_id": status_id, "substatus_id": sub_id},
        headers=_auth(token),
    )
    assert r.status_code == 200
    detail = (await ac.get(f"/api/cases/{report_id}", headers=_auth(token))).json()
    assert detail["status_id"] == status_id and detail["substatus_id"] == sub_id

    # Tenant isolation: a substatus id that doesn't exist → 404.
    import uuid as _uuid

    miss = await ac.patch(
        f"/api/admin/substatuses/{_uuid.uuid4()}", json={"label": {"it": "x"}}, headers=_auth(token)
    )
    assert miss.status_code == 404


@pytest.mark.asyncio
async def test_admin_endpoints_require_admin_role(client, engine):
    ac, _ = client
    await _make_user(engine, "rec", UserRole.recipient, "RecPass1!")
    token = await _login(ac, "rec", "RecPass1!")
    assert (await ac.get("/api/admin/users", headers=_auth(token))).status_code == 403


@pytest.mark.asyncio
async def test_audit_log_view(client, engine):
    ac, data = client
    token = await _login(ac, "admin", data["admin_password"])
    # generate an auditable action
    await ac.post(
        "/api/admin/users",
        json={"username": "x", "password": "Xpass123!", "role": "analyst"},
        headers=_auth(token),
    )
    log = (await ac.get("/api/admin/audit-log", headers=_auth(token))).json()
    assert any(e["type"] == "user_create" for e in log)
