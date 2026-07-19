import { getDisplayModeSettings } from '@/shared/lib/display-modes/display-mode-service';
import { NextResponse } from 'next/server';

export async function GET() {
  const settings = await getDisplayModeSettings();
  return NextResponse.json({ settings });
}
