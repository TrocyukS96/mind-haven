import {
  DISPLAY_MODES,
  DISPLAY_SECTIONS,
  type DisplayMode,
  type DisplayModeSettings,
  type DisplaySection,
} from '@/shared/config/display-modes';
import { hasMinRole } from '@/entities/user';
import { auth } from '@/shared/lib/auth/auth';
import { updateDisplayModeSettings } from '@/shared/lib/display-modes/display-mode-service';
import { NextResponse } from 'next/server';

function isDisplaySection(value: string): value is DisplaySection {
  return DISPLAY_SECTIONS.includes(value as DisplaySection);
}

function isDisplayMode(value: string): value is DisplayMode {
  return DISPLAY_MODES.includes(value as DisplayMode);
}

function parseSettingsUpdate(body: unknown): Partial<DisplayModeSettings> | null {
  if (!body || typeof body !== 'object' || !('settings' in body)) {
    return null;
  }

  const raw = (body as { settings: unknown }).settings;
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const updates: Partial<DisplayModeSettings> = {};

  for (const [section, modes] of Object.entries(raw)) {
    if (!isDisplaySection(section) || !modes || typeof modes !== 'object') {
      continue;
    }

    updates[section] = {} as Record<DisplayMode, boolean>;

    for (const [mode, enabled] of Object.entries(modes)) {
      if (isDisplayMode(mode) && typeof enabled === 'boolean') {
        updates[section]![mode] = enabled;
      }
    }
  }

  return updates;
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !hasMinRole(session.user.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates = parseSettingsUpdate(await request.json());

  if (!updates) {
    return NextResponse.json({ error: 'Missing settings' }, { status: 400 });
  }

  const settings = await updateDisplayModeSettings(updates, session.user.id);

  return NextResponse.json({ settings });
}
