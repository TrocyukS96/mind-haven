import { getActiveEnergyTest } from '@/shared/lib/energy/energy-test-service';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const test = await getActiveEnergyTest();
    return NextResponse.json({ test });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load energy test';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
