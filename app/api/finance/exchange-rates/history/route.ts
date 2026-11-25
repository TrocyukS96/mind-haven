import { getHistoricalRateSeries } from '@/shared/lib/finance/historical-rate-service';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });
  }

  try {
    const series = await getHistoricalRateSeries(from, to);
    return NextResponse.json(
      { series },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load historical rates';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
