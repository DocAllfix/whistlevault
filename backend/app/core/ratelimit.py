"""Minimal in-memory token-bucket rate limiter (anti-bruteforce).

Keyed by an opaque string (e.g. "login:<username>"). The key is hashed so we
never retain raw identifiers. Single-instance for the MVP.
"""

import hashlib
import time

_buckets: dict[str, tuple[float, float]] = {}  # key -> (tokens, last_refill)


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def allow(key: str, *, limit: int, window_seconds: int) -> bool:
    """Return True if the action is allowed; consume a token if so."""
    capacity = float(limit)
    refill_rate = capacity / window_seconds
    h = _hash_key(key)
    now = time.time()
    tokens, last = _buckets.get(h, (capacity, now))
    tokens = min(capacity, tokens + (now - last) * refill_rate)
    if tokens >= 1.0:
        _buckets[h] = (tokens - 1.0, now)
        return True
    _buckets[h] = (tokens, now)
    return False


def reset() -> None:
    _buckets.clear()
