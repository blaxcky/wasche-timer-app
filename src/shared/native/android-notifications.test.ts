import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginListenerHandle } from "@capacitor/core";
import {
  cancelWashingMachineNotification,
  isNativeAndroid,
  scheduleWashingMachineNotification,
  washingMachineNotificationDate,
  WASHING_MACHINE_CHANNEL_ID,
  WASHING_MACHINE_NOTIFICATION_ID,
  type NotificationDependencies
} from "./android-notifications";

function dependencies(
  overrides: Partial<NotificationDependencies> = {}
): NotificationDependencies {
  return {
    isNativePlatform: () => true,
    getPlatform: () => "android",
    createChannel: vi.fn().mockResolvedValue(undefined),
    checkPermissions: vi.fn().mockResolvedValue({ display: "granted" }),
    requestPermissions: vi.fn().mockResolvedValue({ display: "granted" }),
    checkExactNotificationSetting: vi.fn().mockResolvedValue({ exact_alarm: "granted" }),
    changeExactNotificationSetting: vi.fn().mockResolvedValue({ exact_alarm: "granted" }),
    schedule: vi.fn().mockResolvedValue({ notifications: [{ id: WASHING_MACHINE_NOTIFICATION_ID }] }),
    cancel: vi.fn().mockResolvedValue(undefined),
    removeDeliveredNotificationsById: vi.fn().mockResolvedValue(undefined),
    addActionListener: vi.fn().mockResolvedValue({ remove: vi.fn() } as PluginListenerHandle),
    openAppNotificationSettings: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Android washing-machine notifications", () => {
  it("uses one stable notification ID and parses the exact end time", () => {
    expect(WASHING_MACHINE_NOTIFICATION_ID).toBe(731001);
    expect(washingMachineNotificationDate("2026-08-24T12:34:56.000Z")?.toISOString())
      .toBe("2026-08-24T12:34:56.000Z");
    expect(washingMachineNotificationDate("invalid")).toBeNull();
  });

  it("distinguishes Android native from web and other native platforms", () => {
    expect(isNativeAndroid(dependencies())).toBe(true);
    expect(isNativeAndroid(dependencies({ isNativePlatform: () => false }))).toBe(false);
    expect(isNativeAndroid(dependencies({ getPlatform: () => "ios" }))).toBe(false);
  });

  it("schedules at endAt on the high-priority channel with idle delivery", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T10:00:00.000Z"));
    const deps = dependencies();

    const result = await scheduleWashingMachineNotification("2026-08-24T10:30:00.000Z", true, deps);

    expect(result).toMatchObject({ scheduled: true, needsSettings: false });
    expect(deps.createChannel).toHaveBeenCalledWith(expect.objectContaining({
      id: WASHING_MACHINE_CHANNEL_ID,
      importance: 4,
      vibration: true
    }));
    expect(deps.schedule).toHaveBeenCalledWith({
      notifications: [expect.objectContaining({
        id: WASHING_MACHINE_NOTIFICATION_ID,
        title: "Waschmaschine fertig",
        body: "Die Wäsche ist fertig.",
        channelId: WASHING_MACHINE_CHANNEL_ID,
        isExactNotification: true,
        schedule: {
          at: new Date("2026-08-24T10:30:00.000Z"),
          allowWhileIdle: true
        }
      })]
    });
  });

  it("requests display permission and keeps an inexact fallback when exact alarms are denied", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T10:00:00.000Z"));
    const requestPermissions = vi.fn().mockResolvedValue({ display: "granted" });
    const deps = dependencies({
      checkPermissions: vi.fn().mockResolvedValue({ display: "prompt" }),
      requestPermissions,
      checkExactNotificationSetting: vi.fn().mockResolvedValue({ exact_alarm: "denied" })
    });

    const result = await scheduleWashingMachineNotification("2026-08-24T11:00:00.000Z", true, deps);

    expect(requestPermissions).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ scheduled: true, needsSettings: true });
    expect(deps.schedule).toHaveBeenCalledWith({
      notifications: [expect.objectContaining({ isExactNotification: false })]
    });
  });

  it("does not schedule when display permission remains denied", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T10:00:00.000Z"));
    const deps = dependencies({
      checkPermissions: vi.fn().mockResolvedValue({ display: "denied" }),
      requestPermissions: vi.fn().mockResolvedValue({ display: "denied" })
    });

    const result = await scheduleWashingMachineNotification("2026-08-24T11:00:00.000Z", true, deps);

    expect(result).toMatchObject({ scheduled: false, needsSettings: true });
    expect(deps.schedule).not.toHaveBeenCalled();
  });

  it("removes both pending and already delivered notifications on stop", async () => {
    const deps = dependencies();

    await cancelWashingMachineNotification(deps);

    expect(deps.cancel).toHaveBeenCalledWith({ notifications: [{ id: WASHING_MACHINE_NOTIFICATION_ID }] });
    expect(deps.removeDeliveredNotificationsById).toHaveBeenCalledWith({ ids: [WASHING_MACHINE_NOTIFICATION_ID] });
  });
});
