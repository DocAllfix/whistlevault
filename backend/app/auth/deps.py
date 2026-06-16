"""FastAPI dependencies for authentication and RBAC."""

from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status

from app.auth.sessions import Session, store

SESSION_COOKIE = "wb_session"


def _extract_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return request.cookies.get(SESSION_COOKIE)


def get_current_session(request: Request) -> Session:
    session = store.get(_extract_token(request))
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return session


def require_roles(*roles: str) -> Callable[..., Session]:
    """Dependency factory: allow only the given handler roles."""

    def dependency(session: Session = Depends(get_current_session)) -> Session:
        if session.kind != "user" or session.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return session

    return dependency


def require_whistleblower(session: Session = Depends(get_current_session)) -> Session:
    if session.kind != "whistleblower":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return session


def require_permission(flag: str) -> Callable[..., Session]:
    """Dependency factory: require a granular permission flag on the session."""

    def dependency(session: Session = Depends(get_current_session)) -> Session:
        if not session.permissions.get(flag, False):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return session

    return dependency
