interface VerificationEmailCopy {
  subject: string;
  preview: string;
  greeting: string;
  body: string;
  button: string;
  expiry: string;
  ignore: string;
}

export function getVerificationEmailCopy(
  locale: string,
  name: string | null
): VerificationEmailCopy {
  const displayName = name?.trim();

  if (locale === 'en') {
    return {
      subject: 'Confirm your Mind Haven registration',
      preview: 'Click the link to finish creating your account.',
      greeting: displayName ? `Hi ${displayName},` : 'Hi,',
      body: 'To finish registration, confirm your email address:',
      button: 'Confirm email',
      expiry: 'This link is valid for 24 hours.',
      ignore: 'If you did not create a Mind Haven account, you can ignore this email.',
    };
  }

  return {
    subject: 'Подтвердите регистрацию в Mind Haven',
    preview: 'Нажмите на ссылку, чтобы завершить создание аккаунта.',
    greeting: displayName ? `Здравствуйте, ${displayName}!` : 'Здравствуйте!',
    body: 'Чтобы завершить регистрацию, подтвердите адрес электронной почты:',
    button: 'Подтвердить email',
    expiry: 'Ссылка действует 24 часа.',
    ignore: 'Если вы не регистрировались в Mind Haven, просто проигнорируйте это письмо.',
  };
}

export function renderVerificationEmailHtml(copy: VerificationEmailCopy, verifyUrl: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e4e4e7;">
      <tr>
        <td>
          <p style="margin:0 0 16px;font-size:16px;">${escapeHtml(copy.greeting)}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">${escapeHtml(copy.body)}</p>
          <p style="margin:0 0 24px;">
            <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">
              ${escapeHtml(copy.button)}
            </a>
          </p>
          <p style="margin:0 0 12px;font-size:13px;color:#71717a;">${escapeHtml(copy.expiry)}</p>
          <p style="margin:0;font-size:13px;color:#71717a;word-break:break-all;">${escapeHtml(verifyUrl)}</p>
          <p style="margin:24px 0 0;font-size:13px;color:#71717a;">${escapeHtml(copy.ignore)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderVerificationEmailText(copy: VerificationEmailCopy, verifyUrl: string): string {
  return [
    copy.greeting,
    '',
    copy.body,
    verifyUrl,
    '',
    copy.expiry,
    copy.ignore,
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
