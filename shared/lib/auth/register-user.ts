import { prisma } from '@/shared/lib/db';
import { sendEmail } from './mailer';
import {
  hashPassword,
  isValidEmail,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
} from './password';
import {
  getVerificationEmailCopy,
  renderVerificationEmailHtml,
  renderVerificationEmailText,
} from './verification-email';
import { createVerificationToken, hashVerificationToken, VERIFICATION_TOKEN_TTL_MS } from './verification-token';
import { buildEmailVerificationUrl } from './verification-url';

export type RegisterErrorCode =
  | 'INVALID_EMAIL'
  | 'WEAK_PASSWORD'
  | 'EMAIL_TAKEN'
  | 'EMAIL_NOT_CONFIGURED'
  | 'EMAIL_SEND_FAILED';

export class RegisterError extends Error {
  constructor(public code: RegisterErrorCode) {
    super(code);
    this.name = 'RegisterError';
  }
}

interface RegisterUserInput {
  email: string;
  password: string;
  name?: string;
  locale?: string;
  origin: string;
}

export async function registerUser(input: RegisterUserInput) {
  const email = normalizeEmail(input.email);
  const password = input.password;
  const name = input.name?.trim().slice(0, MAX_NAME_LENGTH) || null;
  const locale = input.locale === 'en' ? 'en' : 'ru';

  if (!isValidEmail(email)) {
    throw new RegisterError('INVALID_EMAIL');
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new RegisterError('WEAK_PASSWORD');
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new RegisterError('EMAIL_TAKEN');
  }

  await prisma.pendingRegistration.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  const token = createVerificationToken();
  const passwordHash = await hashPassword(password);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.pendingRegistration.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      tokenHash: hashVerificationToken(token),
      locale,
      expiresAt,
    },
    update: {
      name,
      passwordHash,
      tokenHash: hashVerificationToken(token),
      locale,
      expiresAt,
    },
  });

  const verifyUrl = buildEmailVerificationUrl(input.origin, locale, token);
  const copy = getVerificationEmailCopy(locale, name);

  if (process.env.NODE_ENV !== 'production') {
    console.info('[auth] verification url:', verifyUrl);
  }

  try {
    await sendEmail({
      to: email,
      subject: copy.subject,
      html: renderVerificationEmailHtml(copy, verifyUrl),
      text: renderVerificationEmailText(copy, verifyUrl),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_NOT_CONFIGURED') {
      throw new RegisterError('EMAIL_NOT_CONFIGURED');
    }

    console.error('[auth] failed to send verification email', error);
    throw new RegisterError('EMAIL_SEND_FAILED');
  }

  return { email };
}
