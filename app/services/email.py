import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import get_settings

settings = get_settings()

def send_reset_password_email(email_to: str, token: str):
    """
    Send a password reset email to the user.
    Uses SMTP settings from the configuration.
    """
    if not settings.SMTP_HOST:
        print(f"⚠️ SMTP not configured. Reset link for {email_to}:")
        print(f"🔗 {settings.FRONTEND_URL}/reset-password?token={token}")
        return

    subject = f"{settings.APP_NAME} - Password Reset"
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    message = MIMEMultipart()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = email_to
    message["Subject"] = subject

    html_content = f"""
    <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your account at {settings.APP_NAME}.</p>
            <p>Please click the link below to set a new password. This link will expire in 15 minutes.</p>
            <p><a href="{reset_link}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>If you did not request this, please ignore this email.</p>
            <hr>
            <p><small>This is an automated message, please do not reply.</small></p>
        </body>
    </html>
    """
    
    message.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_PASSWORD:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
        print(f"✅ Reset email sent to {email_to}")
    except Exception as e:
        print(f"❌ Failed to send email to {email_to}: {e}")
        # In a real app, we might want to log this but still return success to the user 
        # to avoid email enumeration.
