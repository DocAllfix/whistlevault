FROM python:3.12-slim

# Non-root user for runtime hardening.
RUN useradd --create-home --uid 1000 appuser

WORKDIR /app

# Install deps first for layer caching. The lock file (M8) pins every runtime
# dependency to an audited version (reproducible builds); used as a constraints
# file so only the project's runtime deps are installed, at the locked versions.
COPY pyproject.toml requirements.lock ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -c requirements.lock .

COPY . .

# Writable, persistable directory for encrypted attachments (mounted as a volume).
RUN mkdir -p /data && chown appuser:appuser /data

USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
