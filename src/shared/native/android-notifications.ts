import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import {
  LocalNotifications,
  type PermissionStatus,
  type SettingsPermissionStatus
} from "@capacitor/local-notifications";

export const WASHING_MACHINE_NOTIFICATION_ID = 731_001;
export const WASHING_MACHINE_CHANNEL_ID = "washing-machine";

export type AndroidPermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";

export interface AndroidNotificationStatus {
  notificationPermission: AndroidPermissionState;
  exactAlarmPermission: AndroidPermissionState;
}

export interface ScheduleNotificationResult {
  scheduled: boolean;
  status: AndroidNotificationStatus;
  needsSettings: boolean;
}

interface AndroidSettingsPlugin {
  openAppNotificationSettings(): Promise<void>;
}

const AndroidSettings = registerPlugin<AndroidSettingsPlugin>("AndroidSettings");

export interface NotificationDependencies {
  isNativePlatform(): boolean;
  getPlatform(): string;
  createChannel(options: {
    id: string;
    name: string;
    description: string;
    importance: 4;
    visibility: 1;
    vibration: true;
    lights: true;
    lightColor: string;
  }): Promise<void>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
  checkExactNotificationSetting(): Promise<SettingsPermissionStatus>;
  changeExactNotificationSetting(): Promise<SettingsPermissionStatus>;
  schedule(options: Parameters<typeof LocalNotifications.schedule>[0]): ReturnType<typeof LocalNotifications.schedule>;
  cancel(options: Parameters<typeof LocalNotifications.cancel>[0]): Promise<void>;
  removeDeliveredNotificationsById(options: { ids: number[] }): Promise<void>;
  addActionListener(
    listener: () => void
  ): Promise<PluginListenerHandle>;
  openAppNotificationSettings(): Promise<void>;
}

const nativeDependencies: NotificationDependencies = {
  isNativePlatform: () => Capacitor.isNativePlatform(),
  getPlatform: () => Capacitor.getPlatform(),
  createChannel: (options) => LocalNotifications.createChannel(options),
  checkPermissions: () => LocalNotifications.checkPermissions(),
  requestPermissions: () => LocalNotifications.requestPermissions(),
  checkExactNotificationSetting: () => LocalNotifications.checkExactNotificationSetting(),
  changeExactNotificationSetting: () => LocalNotifications.changeExactNotificationSetting(),
  schedule: (options) => LocalNotifications.schedule(options),
  cancel: (options) => LocalNotifications.cancel(options),
  removeDeliveredNotificationsById: (options) => LocalNotifications.removeDeliveredNotificationsById(options),
  addActionListener: (listener) =>
    LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
      if (notification.id === WASHING_MACHINE_NOTIFICATION_ID) listener();
    }),
  openAppNotificationSettings: () => AndroidSettings.openAppNotificationSettings()
};

export function isNativeAndroid(dependencies: NotificationDependencies = nativeDependencies): boolean {
  return dependencies.isNativePlatform() && dependencies.getPlatform() === "android";
}

export function washingMachineNotificationDate(endAt: string): Date | null {
  const date = new Date(endAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function createWashingMachineChannel(dependencies: NotificationDependencies): Promise<void> {
  await dependencies.createChannel({
    id: WASHING_MACHINE_CHANNEL_ID,
    name: "Waschmaschine",
    description: "Meldung, sobald die Waschmaschine fertig ist.",
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: "#0D5F7F"
  });
}

export async function getAndroidNotificationStatus(
  dependencies: NotificationDependencies = nativeDependencies
): Promise<AndroidNotificationStatus | null> {
  if (!isNativeAndroid(dependencies)) return null;

  const [notification, exactAlarm] = await Promise.all([
    dependencies.checkPermissions(),
    dependencies.checkExactNotificationSetting()
  ]);

  return {
    notificationPermission: notification.display,
    exactAlarmPermission: exactAlarm.exact_alarm
  };
}

export async function scheduleWashingMachineNotification(
  endAt: string,
  requestPermission: boolean,
  dependencies: NotificationDependencies = nativeDependencies
): Promise<ScheduleNotificationResult | null> {
  if (!isNativeAndroid(dependencies)) return null;

  const at = washingMachineNotificationDate(endAt);
  if (!at || at.getTime() <= Date.now()) return null;

  await createWashingMachineChannel(dependencies);

  let displayPermission = await dependencies.checkPermissions();
  if (requestPermission && displayPermission.display !== "granted") {
    displayPermission = await dependencies.requestPermissions();
  }
  const exactAlarm = await dependencies.checkExactNotificationSetting();
  const status: AndroidNotificationStatus = {
    notificationPermission: displayPermission.display,
    exactAlarmPermission: exactAlarm.exact_alarm
  };

  if (displayPermission.display !== "granted") {
    return { scheduled: false, status, needsSettings: true };
  }

  await dependencies.cancel({ notifications: [{ id: WASHING_MACHINE_NOTIFICATION_ID }] });
  const scheduled = await dependencies.schedule({
    notifications: [
      {
        id: WASHING_MACHINE_NOTIFICATION_ID,
        channelId: WASHING_MACHINE_CHANNEL_ID,
        title: "Waschmaschine fertig",
        body: "Die Wäsche ist fertig.",
        schedule: {
          at,
          allowWhileIdle: true
        },
        isExactNotification: exactAlarm.exact_alarm === "granted",
        extra: { destination: "dashboard", kind: "washing-machine" }
      }
    ]
  });

  return {
    scheduled: true,
    status,
    needsSettings: exactAlarm.exact_alarm !== "granted" || Boolean(scheduled.warning)
  };
}

export async function cancelWashingMachineNotification(
  dependencies: NotificationDependencies = nativeDependencies
): Promise<void> {
  if (!isNativeAndroid(dependencies)) return;

  await Promise.all([
    dependencies.cancel({ notifications: [{ id: WASHING_MACHINE_NOTIFICATION_ID }] }),
    dependencies.removeDeliveredNotificationsById({ ids: [WASHING_MACHINE_NOTIFICATION_ID] })
  ]);
}

export async function openAndroidNotificationSettings(
  dependencies: NotificationDependencies = nativeDependencies
): Promise<void> {
  if (!isNativeAndroid(dependencies)) return;
  await dependencies.openAppNotificationSettings();
}

export async function openExactAlarmSettings(
  dependencies: NotificationDependencies = nativeDependencies
): Promise<void> {
  if (!isNativeAndroid(dependencies)) return;
  await dependencies.changeExactNotificationSetting();
}

export async function registerWashingMachineNotificationTap(
  listener: () => void,
  dependencies: NotificationDependencies = nativeDependencies
): Promise<PluginListenerHandle | null> {
  if (!isNativeAndroid(dependencies)) return null;
  return dependencies.addActionListener(listener);
}
