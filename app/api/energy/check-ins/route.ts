import type { EnergyAnswerInput, EnergyPeriodRange } from '@/entities/energy/model/types';
import { auth } from '@/shared/lib/auth/auth';
import {
  createEnergyCheckIn,
  getEnergyCheckIns,
} from '@/shared/lib/energy/energy-check-in-service';
import { NextResponse } from 'next/server';

function parseRange(request: Request): EnergyPeriodRange | undefined {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return undefined;
  }

  return { from, to };
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await getEnergyCheckIns(session.user.id, parseRange(request));
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load energy check-ins';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { answers?: EnergyAnswerInput[] };

  if (!Array.isArray(body.answers)) {
    return NextResponse.json({ error: 'Answers are required' }, { status: 400 });
  }

  try {
    const checkIn = await createEnergyCheckIn(session.user.id, body.answers);
    return NextResponse.json({ checkIn }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save energy check-in';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
