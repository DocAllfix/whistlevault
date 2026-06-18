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
    # M4: authenticate to the relay and use STARTTLS when configured (real relays
    # require credentials over TLS; dev MailHog has neither).
    use_tls = settings.smtp_starttls and settings.is_production
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        start_tls=use_tls,
        username=settings.smtp_username or None,
        password=settings.smtp_password or None,
    )
