import { NextResponse } from 'next/server';
import { fetchExchangeRates } from '@/shared/lib/finance/nbrb-exchange-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rates, source } = await fetchExchangeRates();
    return NextResponse.json(
      { rates, source },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load exchange rates';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
