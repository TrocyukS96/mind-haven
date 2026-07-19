import type { ReflectionPeriod } from '@/entities/journal/model/types';
import { REFLECTION_PERIODS } from '@/entities/journal/model/types';
import { hasMinRole } from '@/entities/user';
import { auth } from '@/shared/lib/auth/auth';
import { updateReflectionQuestion } from '@/shared/lib/reflection-questions/reflection-question-service';
import { NextResponse } from 'next/server';

function isReflectionPeriod(value: string): value is ReflectionPeriod {
  return REFLECTION_PERIODS.includes(value as ReflectionPeriod);
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !hasMinRole(session.user.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    period?: string;
    sortOrder?: number;
    textRu?: string;
    textEn?: string;
    enabled?: boolean;
  };

  if (
    !body.period ||
    body.sortOrder === undefined ||
    !isReflectionPeriod(body.period)
  ) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const questions = await updateReflectionQuestion(
      body.period,
      body.sortOrder,
      {
        textRu: body.textRu,
        textEn: body.textEn,
        enabled: body.enabled,
      },
      session.user.id
    );
    return NextResponse.json({ questions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update question';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
