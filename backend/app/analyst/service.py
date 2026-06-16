"""Aggregate statistics for the analyst role.

Returns ONLY counts/aggregates — never report content or PII.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.sessions import Session
from app.db.models import Context, Report, SubmissionStatus


def _label(d: dict) -> str:
    return d.get("it") or d.get("en") or (next(iter(d.values()), "") if d else "")


async def compute_stats(db: AsyncSession, session: Session) -> dict:
    tid = session.tenant_id

    total = await db.scalar(select(func.count()).select_from(Report).where(Report.tenant_id == tid)) or 0
    important = (
        await db.scalar(
            select(func.count()).select_from(Report).where(
                Report.tenant_id == tid, Report.important.is_(True)
            )
        )
        or 0
    )

    statuses = (await db.scalars(select(SubmissionStatus).where(SubmissionStatus.tenant_id == tid))).all()
    status_label = {str(s.id): _label(s.label) for s in statuses}
    srows = (
        await db.execute(
            select(Report.status_id, func.count()).where(Report.tenant_id == tid).group_by(Report.status_id)
        )
    ).all()
    by_status = [
        {"status_id": str(sid) if sid else None, "label": status_label.get(str(sid), "—"), "count": c}
        for sid, c in srows
    ]

    contexts = (await db.scalars(select(Context).where(Context.tenant_id == tid))).all()
    ctx_label = {str(c.id): _label(c.name) for c in contexts}
    crows = (
        await db.execute(
            select(Report.context_id, func.count()).where(Report.tenant_id == tid).group_by(Report.context_id)
        )
    ).all()
    by_context = [
        {"context_id": str(cid), "name": ctx_label.get(str(cid), "—"), "count": c} for cid, c in crows
    ]

    # Portable monthly bucketing (avoids dialect-specific date formatting).
    dates = (await db.scalars(select(Report.created_at).where(Report.tenant_id == tid))).all()
    by_month: dict[str, int] = {}
    for d in dates:
        ym = d.strftime("%Y-%m")
        by_month[ym] = by_month.get(ym, 0) + 1

    return {
        "total": total,
        "important": important,
        "by_status": by_status,
        "by_context": by_context,
        "by_month": dict(sorted(by_month.items())),
    }
