import { createDefaultState, DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from "../lib/defaults";
import { createId } from "../lib/id";
import { migrateLegacyStorage } from "./migrations";
import {
  APP_SCHEMA_VERSION,
  APP_STORAGE_KEY,
  AppStateV2,
  ExportedBackupV2,
  HistoryEntry,
  LaundryTemplate,
  LaundryTimer,
  TimerStatus
} from "../types/models";

function sanitizePresetMinutes(offsets: unknown, fallback: number[]): number[] {
  if (!Array.isArray(offsets)) return fallback;

  const cleaned = offsets
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.floor(value));

  return cleaned.length > 0 ? Array.from(new Set(cleaned)).sort((a, b) => a - b) : fallback;
}

function sanitizeStatus(status: unknown): TimerStatus {
  return status === "done" ? "done" : "active";
}

function sanitizeTimer(input: unknown): LaundryTimer | null {
  if (!input || typeof input !== "object") return null;

  const item = input as Partial<LaundryTimer>;
  if (typeof item.name !== "string" || typeof item.startAt !== "string") return null;

  const startAt = new Date(item.startAt);
  if (Number.isNaN(startAt.getTime())) return null;

  const targetDurationSec = Number(item.targetDurationSec);

  return {
    id: typeof item.id === "string" ? item.id : createId("timer"),
    name: item.name.trim() || "Unbenannt",
    startAt: startAt.toISOString(),
    targetDurationSec: Number.isFinite(targetDurationSec) && targetDurationSec > 0 ? Math.floor(targetDurationSec) : 259200,
    status: sanitizeStatus(item.status)
  };
}

function sanitizeTemplate(input: unknown): LaundryTemplate | null {
  if (!input || typeof input !== "object") return null;

  const item = input as Partial<LaundryTemplate>;
  if (typeof item.name !== "string") return null;

  const targetDurationSec = Number(item.targetDurationSec);
  return {
    id: typeof item.id === "string" ? item.id : createId("tpl"),
    name: item.name.trim() || "Vorlage",
    emoji: typeof item.emoji === "string" ? item.emoji : "🧺",
    targetDurationSec: Number.isFinite(targetDurationSec) && targetDurationSec > 0 ? Math.floor(targetDurationSec) : 259200
  };
}

function sanitizeHistory(input: unknown): HistoryEntry[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const candidate = entry as Partial<HistoryEntry>;
      const timerSnapshot = sanitizeTimer(candidate.timerSnapshot);
      if (!timerSnapshot) return null;
      const archivedAt = new Date(candidate.archivedAt ?? "");
      if (Number.isNaN(archivedAt.getTime())) return null;

      return {
        id: typeof candidate.id === "string" ? candidate.id : createId("hist"),
        timerSnapshot,
        archivedAt: archivedAt.toISOString(),
        reason: candidate.reason === "deleted" ? "deleted" : "archived"
      } satisfies HistoryEntry;
    })
    .filter((entry): entry is HistoryEntry => Boolean(entry));
}

export function sanitizeState(input: unknown): AppStateV2 {
  const nowIso = new Date().toISOString();
  const fallback = createDefaultState(nowIso);

  if (!input || typeof input !== "object") return fallback;

  const data = input as Partial<AppStateV2>;

  const templates = Array.isArray(data.templates)
    ? data.templates.map((item) => sanitizeTemplate(item)).filter((item): item is LaundryTemplate => Boolean(item))
    : [];

  const timers = Array.isArray(data.timers)
    ? data.timers.map((item) => sanitizeTimer(item)).filter((item): item is LaundryTimer => Boolean(item))
    : [];

  const state: AppStateV2 = {
    schemaVersion: APP_SCHEMA_VERSION,
    timers,
    history: sanitizeHistory(data.history),
    templates: templates.length > 0 ? templates : DEFAULT_TEMPLATES,
    washingMachine: {
      active: data.washingMachine?.active === true,
      endAt: typeof data.washingMachine?.endAt === "string" ? data.washingMachine.endAt : null,
      presetMin: Number.isFinite(Number(data.washingMachine?.presetMin))
        ? Math.floor(Number(data.washingMachine?.presetMin))
        : 170
    },
    settings: {
      locale: "de-DE",
      hapticsEnabled: data.settings?.hapticsEnabled !== false,
      confirmationsEnabled: data.settings?.confirmationsEnabled !== false,
      defaultWashingPresetsMin: sanitizePresetMinutes(
        data.settings?.defaultWashingPresetsMin,
        DEFAULT_SETTINGS.defaultWashingPresetsMin
      )
    },
    installedAt:
      typeof data.installedAt === "string" && !Number.isNaN(new Date(data.installedAt).getTime())
        ? new Date(data.installedAt).toISOString()
        : nowIso,
    updatedAt: nowIso
  };

  return state;
}

export function loadState(storage: Storage = window.localStorage): AppStateV2 {
  const existing = storage.getItem(APP_STORAGE_KEY);

  if (existing) {
    try {
      const parsed = JSON.parse(existing) as unknown;
      return sanitizeState(parsed);
    } catch {
      return createDefaultState(new Date().toISOString());
    }
  }

  const migrated = migrateLegacyStorage(storage);
  if (migrated) {
    saveState(migrated, storage);
    return migrated;
  }

  return createDefaultState(new Date().toISOString());
}

export function saveState(state: AppStateV2, storage: Storage = window.localStorage): void {
  const payload: AppStateV2 = {
    ...state,
    schemaVersion: APP_SCHEMA_VERSION,
    updatedAt: new Date().toISOString()
  };

  storage.setItem(APP_STORAGE_KEY, JSON.stringify(payload));
}

export function buildBackupPayload(state: AppStateV2): ExportedBackupV2 {
  return {
    schemaVersion: APP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: sanitizeState(state)
  };
}

export function parseBackupPayload(raw: string): AppStateV2 {
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    const nowIso = new Date().toISOString();
    const migrated = createDefaultState(nowIso);

    const migratedTimers: LaundryTimer[] = [];
    for (const timer of parsed) {
      if (!timer || typeof timer !== "object") continue;

      const item = timer as { id?: string | number; name?: string; startTime?: string };
      if (!item.name || !item.startTime) continue;

      const parsedDate = new Date(item.startTime);
      if (Number.isNaN(parsedDate.getTime())) continue;

      migratedTimers.push({
        id: typeof item.id === "string" ? item.id : createId("timer"),
        name: item.name,
        startAt: parsedDate.toISOString(),
        targetDurationSec: 259200,
        status: "active"
      });
    }

    migrated.timers = migratedTimers;

    return migrated;
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Ungültiges Backup-Format");
  }

  const record = parsed as Partial<ExportedBackupV2>;
  if (!record.data) {
    throw new Error("Backup-Daten fehlen");
  }

  return sanitizeState(record.data);
}

