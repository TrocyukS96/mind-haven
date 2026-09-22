import nodemailer from 'nodemailer';

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || process.env.SMTP_USER || 'Mind Haven <noreply@localhost>';
}

async function sendWithResend(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend rejected the email: ${details}`);
  }
}

async function sendWithSmtp(input: SendEmailInput): Promise<void> {
  const host = process.env.SMTP_HOST;

  if (!host) {
    return;
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });

  await transporter.sendMail({
    from: getFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (process.env.RESEND_API_KEY?.trim()) {
    await sendWithResend(input);
    return;
  }

  if (process.env.SMTP_HOST?.trim()) {
    await sendWithSmtp(input);
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[auth] email provider is not configured; skipping send in development');
    console.info('[auth] email would be sent to:', input.to);
    console.info('[auth] subject:', input.subject);
    return;
  }

  throw new Error('EMAIL_NOT_CONFIGURED');
}
