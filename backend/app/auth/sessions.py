"""In-memory session store with TTL.

Secret material (unlocked private keys) lives ONLY here, in process memory,
never in the database. Single-instance for the MVP; a Redis-backed store can
replace this without changing call sites (Fase 11).
"""

import secrets
import time
from dataclasses import dataclass, field

from app.core.config import get_settings


@dataclass
class Session:
    kind: str  # "user" | "whistleblower"
    tenant_id: int
    role: str = ""  # user role, or "whistleblower"
    user_id: str | None = None
    report_id: str | None = None
    # Decrypted key material, kept in memory only.
    private_key: str = ""  # user private key (b64)
    report_key: str = ""  # report private key (b64), for whistleblower sessions
    permissions: dict = field(default_factory=dict)
    expires_at: float = 0.0


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

    def create(self, session: Session) -> str:
        ttl = get_settings().session_ttl_minutes * 60
        session.expires_at = time.time() + ttl
        token = secrets.token_urlsafe(32)
        self._sessions[token] = session
        return token

    def get(self, token: str | None) -> Session | None:
        if not token:
            return None
        session = self._sessions.get(token)
        if session is None:
            return None
        if session.expires_at < time.time():
            self._sessions.pop(token, None)
            return None
        return session

    def delete(self, token: str | None) -> None:
        if token:
            self._sessions.pop(token, None)

    def sweep(self) -> int:
        now = time.time()
        expired = [t for t, s in self._sessions.items() if s.expires_at < now]
        for t in expired:
            self._sessions.pop(t, None)
        return len(expired)


store = SessionStore()
