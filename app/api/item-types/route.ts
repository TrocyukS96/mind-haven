import { getItemTypes } from '@/shared/lib/item-types/item-type-service';
import { NextResponse } from 'next/server';

export async function GET() {
  const types = await getItemTypes();
  return NextResponse.json({ types });
}
