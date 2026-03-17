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
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise ValueError("SMTP is not configured. Cannot send password reset email via Gmail.")

    subject = f"{settings.APP_NAME} - Password Reset"
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    message = MIMEMultipart()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = email_to
    message["Subject"] = subject

    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #3b82f6;">Password Reset Request</h2>
                <p>You requested a password reset for your account at <strong>{settings.APP_NAME}</strong>.</p>
                <p>Please click the button below to set a new password. This link will expire in 15 minutes.</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </p>
                <p>If you did not request this, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="font-size: 12px; color: #6b7280; text-align: center;">This is an automated message, please do not reply.</p>
            </div>
        </body>
    </html>
    """
    
    message.attach(MIMEText(html_content, "html"))

    _send_smtp_message(message, email_to)


def send_otp_email(email_to: str, otp: str):
    """
    Send a 6-digit OTP verification email to the user.
    """
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise ValueError("SMTP is not configured. Cannot send OTP verification email via Gmail.")

    subject = f"{settings.APP_NAME} - Verification Code"
    
    message = MIMEMultipart()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = email_to
    message["Subject"] = subject

    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #3b82f6;">Verify Your Account</h2>
                <p>Welcome to <strong>{settings.APP_NAME}</strong>! Use the verification code below to activate your account:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="display: inline-block; padding: 15px 30px; background-color: #f3f4f6; color: #1e3a8a; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; border: 1px solid #d1d5db;">
                        {otp}
                    </span>
                </div>
                <p>This code will expire in 10 minutes. If you did not sign up for an account, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="font-size: 12px; color: #6b7280; text-align: center;">This is an automated message, please do not reply.</p>
            </div>
        </body>
    </html>
    """
    
    message.attach(MIMEText(html_content, "html"))

    _send_smtp_message(message, email_to)


def _send_smtp_message(message: MIMEMultipart, email_to: str):
    """Helper to send message via SMTP."""
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
        print(f"✅ Email successfully sent to {email_to} via Gmail")
    except Exception as e:
        print(f"❌ Failed to send email to {email_to}: {e}")
        # Re-raise to let the caller handle the failure
        raise e
