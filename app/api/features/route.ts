import { NextResponse } from 'next/server';
import { getFeatureFlags } from '@/shared/lib/features/feature-service';

export async function GET() {
  const flags = await getFeatureFlags();

  return NextResponse.json({ flags });
}
