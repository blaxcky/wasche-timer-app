import { createDefaultState, DEFAULT_SETTINGS, DEFAULT_TARGET_DURATION_SEC, DEFAULT_TEMPLATES } from "../lib/defaults";
import { createId } from "../lib/id";
import {
  AppStateV2,
  LegacyTimer,
  LEGACY_TIMERS_KEY,
  LEGACY_WASHING_MACHINE_KEY
} from "../types/models";

function parseLegacyTimers(raw: string | null): LegacyTimer[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is LegacyTimer => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as Partial<LegacyTimer>;
        return Boolean(candidate.name) && typeof candidate.startTime === "string";
      })
      .map((item) => ({
        id: item.id,
        name: item.name,
        startTime: item.startTime
      }));
  } catch {
    return [];
  }
}

export function migrateLegacyStorage(storage: Storage, nowIso = new Date().toISOString()): AppStateV2 | null {
  const legacyTimersRaw = storage.getItem(LEGACY_TIMERS_KEY);
  const legacyWashingEndAt = storage.getItem(LEGACY_WASHING_MACHINE_KEY);

  if (!legacyTimersRaw && !legacyWashingEndAt) {
    return null;
  }

  const migrated = createDefaultState(nowIso);
  const legacyTimers = parseLegacyTimers(legacyTimersRaw);

  migrated.timers = legacyTimers.map((timer) => ({
    id: typeof timer.id === "string" ? timer.id : createId("timer"),
    name: timer.name,
    startAt: new Date(timer.startTime).toISOString(),
    targetDurationSec: DEFAULT_TARGET_DURATION_SEC,
    reminderEnabled: true,
    reminderOffsetsMin: DEFAULT_SETTINGS.defaultReminderOffsetsMin,
    notifiedOffsetsMin: [],
    status: "active"
  }));

  if (legacyWashingEndAt) {
    const parsed = new Date(legacyWashingEndAt);
    if (!Number.isNaN(parsed.getTime())) {
      migrated.washingMachine = {
        active: parsed.getTime() > Date.now(),
        endAt: parsed.toISOString(),
        presetMin: 170
      };
    }
  }

  migrated.templates = DEFAULT_TEMPLATES;
  migrated.updatedAt = nowIso;

  return migrated;
}
