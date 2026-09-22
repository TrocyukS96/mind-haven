import { RegisterError, registerUser } from '@/shared/lib/auth/register-user';
import { getRequestOrigin } from '@/shared/lib/auth/verification-url';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; name?: unknown; locale?: unknown };

  try {
    body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      name?: unknown;
      locale?: unknown;
    };
  } catch {
    return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name : undefined;
  const locale = typeof body.locale === 'string' ? body.locale : 'ru';

  try {
    const result = await registerUser({
      email,
      password,
      name,
      locale,
      origin: getRequestOrigin(request),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof RegisterError) {
      const status = error.code === 'EMAIL_TAKEN' ? 409 : 400;
      return NextResponse.json({ error: error.code }, { status });
    }

    return NextResponse.json({ error: 'GENERIC' }, { status: 500 });
  }
}
