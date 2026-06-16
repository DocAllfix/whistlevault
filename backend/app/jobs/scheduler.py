"""APScheduler wiring for background jobs (started by the app lifespan)."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.base import get_sessionmaker
from app.jobs import tasks

_scheduler: AsyncIOScheduler | None = None


async def _with_session(coro):
    async with get_sessionmaker()() as db:
        await coro(db)


async def _notifications_job() -> None:
    await _with_session(tasks.run_notifications)


async def _retention_job() -> None:
    await _with_session(tasks.run_retention)


async def _reminders_job() -> None:
    await _with_session(tasks.run_reminders)


def start() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_notifications_job, "interval", minutes=1, id="notifications")
    scheduler.add_job(_retention_job, "interval", hours=6, id="retention")
    scheduler.add_job(_reminders_job, "interval", hours=24, id="reminders")
    scheduler.add_job(tasks.run_session_sweep, "interval", minutes=5, id="session_sweep")
    scheduler.start()
    _scheduler = scheduler
    return scheduler


def shutdown() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
