import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAppRuntimeCaches } from "./pwa-reset";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("resetAppRuntimeCaches", () => {
  it("unregisters all service workers and deletes all caches", async () => {
    const unregisterA = vi.fn().mockResolvedValue(true);
    const unregisterB = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([
      { unregister: unregisterA },
      { unregister: unregisterB }
    ]);

    const cacheKeys = vi.fn().mockResolvedValue(["app-cache", "assets-cache"]);
    const cacheDelete = vi.fn().mockResolvedValue(true);

    vi.stubGlobal("navigator", {
      serviceWorker: { getRegistrations }
    });
    vi.stubGlobal("caches", {
      keys: cacheKeys,
      delete: cacheDelete
    });

    await resetAppRuntimeCaches();

    expect(getRegistrations).toHaveBeenCalledTimes(1);
    expect(unregisterA).toHaveBeenCalledTimes(1);
    expect(unregisterB).toHaveBeenCalledTimes(1);
    expect(cacheKeys).toHaveBeenCalledTimes(1);
    expect(cacheDelete).toHaveBeenCalledTimes(2);
    expect(cacheDelete).toHaveBeenCalledWith("app-cache");
    expect(cacheDelete).toHaveBeenCalledWith("assets-cache");
  });

  it("does not throw when browser APIs are unavailable", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("caches", undefined);

    await expect(resetAppRuntimeCaches()).resolves.toBeUndefined();
  });

  it("continues when unregister/delete operations fail", async () => {
    const unregisterFail = vi.fn().mockRejectedValue(new Error("no unregister"));
    const unregisterOk = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([
      { unregister: unregisterFail },
      { unregister: unregisterOk }
    ]);

    const cacheKeys = vi.fn().mockResolvedValue(["runtime-cache"]);
    const cacheDelete = vi.fn().mockRejectedValue(new Error("no delete"));

    vi.stubGlobal("navigator", {
      serviceWorker: { getRegistrations }
    });
    vi.stubGlobal("caches", {
      keys: cacheKeys,
      delete: cacheDelete
    });

    await expect(resetAppRuntimeCaches()).resolves.toBeUndefined();
    expect(unregisterFail).toHaveBeenCalledTimes(1);
    expect(unregisterOk).toHaveBeenCalledTimes(1);
    expect(cacheDelete).toHaveBeenCalledTimes(1);
  });
});
