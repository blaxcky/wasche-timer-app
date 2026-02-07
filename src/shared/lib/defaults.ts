import { AppSettings, AppStateV2, LaundryTemplate } from "../types/models";

export const DEFAULT_TARGET_DURATION_SEC = 3 * 24 * 60 * 60;

export const DEFAULT_TEMPLATES: LaundryTemplate[] = [
  {
    id: "tpl-colored",
    name: "Buntwäsche",
    emoji: "🌈",
    targetDurationSec: DEFAULT_TARGET_DURATION_SEC,
    reminderOffsetsMin: [1440, 360, 60]
  },
  {
    id: "tpl-towels",
    name: "Handtücher",
    emoji: "🧺",
    targetDurationSec: DEFAULT_TARGET_DURATION_SEC,
    reminderOffsetsMin: [1440, 480, 90]
  },
  {
    id: "tpl-bedding",
    name: "Bettwäsche",
    emoji: "🛏️",
    targetDurationSec: DEFAULT_TARGET_DURATION_SEC,
    reminderOffsetsMin: [1440, 360, 120]
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  locale: "de-DE",
  hapticsEnabled: true,
  confirmationsEnabled: true,
  defaultReminderOffsetsMin: [1440, 360, 60],
  defaultWashingPresetsMin: [60, 90, 120, 170, 180]
};

export function createDefaultState(nowIso: string): AppStateV2 {
  return {
    schemaVersion: 2,
    timers: [],
    history: [],
    templates: DEFAULT_TEMPLATES,
    washingMachine: {
      active: false,
      endAt: null,
      presetMin: 170
    },
    settings: DEFAULT_SETTINGS,
    installedAt: nowIso,
    updatedAt: nowIso
  };
}

