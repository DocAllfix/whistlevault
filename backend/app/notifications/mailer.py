"""SMTP sending via aiosmtplib. Kept thin so it is easy to mock in tests."""

from email.message import EmailMessage

import aiosmtplib

from app.core.config import get_settings


async def send(*, to: str, subject: str, body: str) -> None:
    settings = get_settings()
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        start_tls=settings.is_production,  # dev MailHog has no TLS
    )
