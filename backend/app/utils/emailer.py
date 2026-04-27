from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.config import settings


def send_invite_email(
    *,
    recipient_email: str,
    organization_name: str,
    temp_password: str,
    login_url: str,
) -> tuple[bool, str | None]:
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        return False, "SMTP is not configured"

    message = EmailMessage()
    message["Subject"] = f"Your {organization_name} Talent Map account"
    message["From"] = settings.email_from
    message["To"] = recipient_email
    message.set_content(
        "\n".join(
            [
                f"Hello,",
                "",
                f"You were invited to {organization_name} on Talent Map.",
                f"Employee Login URL: {login_url}",
                f"Email: {recipient_email}",
                f"Temporary password: {temp_password}",
                "",
                "You will be asked to change this password after login.",
            ]
        )
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
        return True, None
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)
