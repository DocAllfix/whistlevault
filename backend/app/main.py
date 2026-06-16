"""FastAPI application entrypoint.

Security headers and full hardening land in Fase 3; this is the bootstrap shell
with a health endpoint so the stack is verifiable end-to-end from day one.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.jobs import scheduler as job_scheduler
from app.admin.router import router as admin_router
from app.auth.router import router as auth_router
from app.cases import service as case_service
from app.cases.router import custodian_router
from app.cases.router import router as cases_router
from app.core.config import get_settings
from app.core.security import SecurityHeadersMiddleware
from app.public.router import router as public_router
from app.reports.router import router as reports_router

settings = get_settings()

@asynccontextmanager
async def lifespan(_: FastAPI):
    job_scheduler.start()
    try:
        yield
    finally:
        job_scheduler.shutdown()


app = FastAPI(
    title="WhistleBlower Platform API",
    version=__version__,
    # Disable interactive docs in production (no info leakage).
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(cases_router)
app.include_router(custodian_router)
app.include_router(admin_router)
app.include_router(public_router)


@app.exception_handler(case_service.CaseForbidden)
async def _forbidden(request: Request, exc: case_service.CaseForbidden) -> JSONResponse:
    return JSONResponse(status_code=403, content={"detail": str(exc)})


@app.exception_handler(case_service.CaseNotFound)
async def _not_found(request: Request, exc: case_service.CaseNotFound) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(case_service.CaseError)
async def _bad_request(request: Request, exc: case_service.CaseError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}
