import { describe, expect, it, vi } from "vitest";
import { exportAndroidBackup, type AndroidBackupDependencies } from "./android-backup";

function dependencies(overrides: Partial<AndroidBackupDependencies> = {}): AndroidBackupDependencies {
  return {
    isNativePlatform: () => true,
    getPlatform: () => "android",
    exportBackup: vi.fn().mockResolvedValue({ cancelled: false }),
    ...overrides
  };
}

describe("Android backup export", () => {
  it("passes backup content and filename to the native plugin", async () => {
    const exportBackup = vi.fn().mockResolvedValue({ cancelled: false });
    const result = await exportAndroidBackup("{\"schemaVersion\":2}", "backup.json", dependencies({ exportBackup }));

    expect(result).toBe(true);
    expect(exportBackup).toHaveBeenCalledWith({ content: "{\"schemaVersion\":2}", fileName: "backup.json" });
  });

  it("reports a cancelled Android file dialog", async () => {
    const result = await exportAndroidBackup(
      "{}",
      "backup.json",
      dependencies({ exportBackup: vi.fn().mockResolvedValue({ cancelled: true }) })
    );

    expect(result).toBe(false);
  });

  it("does not invoke the plugin outside native Android", async () => {
    const exportBackup = vi.fn().mockResolvedValue({ cancelled: false });
    const result = await exportAndroidBackup("{}", "backup.json", dependencies({ getPlatform: () => "web", exportBackup }));

    expect(result).toBe(false);
    expect(exportBackup).not.toHaveBeenCalled();
  });
});
