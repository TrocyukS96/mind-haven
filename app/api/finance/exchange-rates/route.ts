import { NextResponse } from 'next/server';
import { fetchNbrbExchangeRates } from '@/shared/lib/finance/nbrb-exchange-service';

export async function GET() {
  try {
    const rates = await fetchNbrbExchangeRates();
    return NextResponse.json({ rates, source: 'nbrb' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load exchange rates';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
