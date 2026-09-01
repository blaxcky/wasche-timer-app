import { Capacitor, registerPlugin } from "@capacitor/core";

interface AndroidBackupPlugin {
  exportBackup(options: { content: string; fileName: string }): Promise<{ cancelled: boolean }>;
}

export interface AndroidBackupDependencies {
  isNativePlatform(): boolean;
  getPlatform(): string;
  exportBackup(options: { content: string; fileName: string }): Promise<{ cancelled: boolean }>;
}

const AndroidBackup = registerPlugin<AndroidBackupPlugin>("AndroidBackup");

const nativeDependencies: AndroidBackupDependencies = {
  isNativePlatform: () => Capacitor.isNativePlatform(),
  getPlatform: () => Capacitor.getPlatform(),
  exportBackup: (options) => AndroidBackup.exportBackup(options)
};

export async function exportAndroidBackup(
  content: string,
  fileName: string,
  dependencies: AndroidBackupDependencies = nativeDependencies
): Promise<boolean> {
  if (!dependencies.isNativePlatform() || dependencies.getPlatform() !== "android") return false;

  const result = await dependencies.exportBackup({ content, fileName });
  return !result.cancelled;
}
