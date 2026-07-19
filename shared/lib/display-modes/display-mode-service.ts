import {
  DISPLAY_MODES,
  DISPLAY_SECTIONS,
  getDefaultDisplayModeSettings,
  type DisplayMode,
  type DisplayModeSettings,
  type DisplaySection,
} from '@/shared/config/display-modes';
import { prisma } from '@/shared/lib/db';

function isDisplaySection(value: string): value is DisplaySection {
  return DISPLAY_SECTIONS.includes(value as DisplaySection);
}

function isDisplayMode(value: string): value is DisplayMode {
  return DISPLAY_MODES.includes(value as DisplayMode);
}

function toDisplayModeKey(section: DisplaySection, mode: DisplayMode): string {
  return `${section}:${mode}`;
}

function parseDisplayModeKey(key: string): { section: DisplaySection; mode: DisplayMode } | null {
  const [section, mode] = key.split(':');
  if (!section || !mode || !isDisplaySection(section) || !isDisplayMode(mode)) {
    return null;
  }
  return { section, mode };
}

export async function ensureDisplayModeFlagsSeeded(): Promise<void> {
  const existing = await prisma.displayModeFlag.findMany({
    select: { key: true },
  });

  const existingKeys = new Set(existing.map((item: { key: string }) => item.key));
  const defaults = getDefaultDisplayModeSettings();
  const missing: Array<{ key: string; enabled: boolean }> = [];

  for (const section of DISPLAY_SECTIONS) {
    for (const mode of DISPLAY_MODES) {
      const key = toDisplayModeKey(section, mode);
      if (!existingKeys.has(key)) {
        missing.push({ key, enabled: defaults[section][mode] });
      }
    }
  }

  if (missing.length === 0) {
    return;
  }

  await prisma.displayModeFlag.createMany({
    data: missing,
    skipDuplicates: true,
  });
}

export async function getDisplayModeSettings(): Promise<DisplayModeSettings> {
  const defaults = getDefaultDisplayModeSettings();

  try {
    await ensureDisplayModeFlagsSeeded();

    const flags = await prisma.displayModeFlag.findMany();
    const result = structuredClone(defaults);

    for (const flag of flags) {
      const parsed = parseDisplayModeKey(flag.key);
      if (parsed) {
        result[parsed.section][parsed.mode] = flag.enabled;
      }
    }

    return result;
  } catch {
    return defaults;
  }
}

export async function updateDisplayModeFlag(
  section: DisplaySection,
  mode: DisplayMode,
  enabled: boolean,
  updatedBy?: string
): Promise<void> {
  const key = toDisplayModeKey(section, mode);

  await prisma.displayModeFlag.upsert({
    where: { key },
    create: { key, enabled, updatedBy },
    update: { enabled, updatedBy },
  });
}

export async function updateDisplayModeSettings(
  updates: Partial<DisplayModeSettings>,
  updatedBy?: string
): Promise<DisplayModeSettings> {
  const tasks: Promise<void>[] = [];

  for (const [section, modes] of Object.entries(updates)) {
    if (!isDisplaySection(section) || !modes) {
      continue;
    }

    for (const [mode, enabled] of Object.entries(modes)) {
      if (isDisplayMode(mode) && typeof enabled === 'boolean') {
        tasks.push(updateDisplayModeFlag(section, mode, enabled, updatedBy));
      }
    }
  }

  await Promise.all(tasks);

  return getDisplayModeSettings();
}
