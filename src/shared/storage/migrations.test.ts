import { describe, expect, it } from "vitest";
import { migrateLegacyStorage } from "./migrations";
import { APP_STORAGE_KEY, LEGACY_TIMERS_KEY, LEGACY_WASHING_MACHINE_KEY } from "../types/models";
import { loadState, sanitizeState } from "./repository";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe("storage migrations", () => {
  it("migrates legacy timer payload", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LEGACY_TIMERS_KEY,
      JSON.stringify([
        {
          id: 1,
          name: "Handtücher",
          startTime: "2026-02-01T08:00:00.000Z"
        }
      ])
    );

    const migrated = migrateLegacyStorage(storage, "2026-02-07T12:00:00.000Z");
    expect(migrated).not.toBeNull();
    expect(migrated?.timers).toHaveLength(1);
    expect(migrated?.timers[0].name).toBe("Handtücher");
    expect(migrated?.schemaVersion).toBe(2);
  });

  it("keeps washing machine legacy value", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_WASHING_MACHINE_KEY, "2026-02-08T10:00:00.000Z");

    const migrated = migrateLegacyStorage(storage, "2026-02-07T12:00:00.000Z");
    expect(migrated?.washingMachine.endAt).toBe("2026-02-08T10:00:00.000Z");
  });

  it("loads modern state when present", () => {
    const storage = new MemoryStorage();
    const payload = sanitizeState({
      schemaVersion: 2,
      timers: [],
      history: [],
      templates: [],
      washingMachine: { active: false, endAt: null, presetMin: 170 },
      settings: {
        locale: "de-DE",
        hapticsEnabled: true,
        confirmationsEnabled: true,
        defaultWashingPresetsMin: [60, 90, 120]
      },
      installedAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z"
    });

    storage.setItem(APP_STORAGE_KEY, JSON.stringify(payload));
    const loaded = loadState(storage);
    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.settings.defaultWashingPresetsMin).toEqual([60, 90, 120]);
  });
});

