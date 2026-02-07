export const APP_SCHEMA_VERSION = 2;
export const APP_STORAGE_KEY = "wt.app.v2";
export const LEGACY_TIMERS_KEY = "laundryTimers";
export const LEGACY_WASHING_MACHINE_KEY = "washingMachineEndTime";

export type TabId = "dashboard" | "timers" | "settings";

export type TimerStatus = "active" | "done";

export interface LaundryTemplate {
  id: string;
  name: string;
  emoji: string;
  targetDurationSec: number;
  reminderOffsetsMin: number[];
}

export interface LaundryTimer {
  id: string;
  name: string;
  startAt: string;
  targetDurationSec: number;
  reminderEnabled: boolean;
  reminderOffsetsMin: number[];
  notifiedOffsetsMin: number[];
  status: TimerStatus;
}

export interface HistoryEntry {
  id: string;
  timerSnapshot: LaundryTimer;
  archivedAt: string;
  reason: "archived" | "deleted";
}

export interface WashingMachineTimer {
  active: boolean;
  endAt: string | null;
  presetMin: number;
}

export interface AppSettings {
  locale: "de-DE";
  hapticsEnabled: boolean;
  confirmationsEnabled: boolean;
  defaultReminderOffsetsMin: number[];
  defaultWashingPresetsMin: number[];
}

export interface AppStateV2 {
  schemaVersion: typeof APP_SCHEMA_VERSION;
  timers: LaundryTimer[];
  history: HistoryEntry[];
  templates: LaundryTemplate[];
  washingMachine: WashingMachineTimer;
  settings: AppSettings;
  installedAt: string;
  updatedAt: string;
}

export interface ExportedBackupV2 {
  schemaVersion: typeof APP_SCHEMA_VERSION;
  exportedAt: string;
  data: AppStateV2;
}

export interface LegacyTimer {
  id: number | string;
  name: string;
  startTime: string;
}
