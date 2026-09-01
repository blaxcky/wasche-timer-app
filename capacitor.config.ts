/// <reference types="@capacitor/local-notifications" />

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.github.blaxcky.waeschetimer",
  appName: "Wäsche-Timer",
  webDir: "dist",
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      style: "LIGHT"
    },
    LocalNotifications: {
      smallIcon: "ic_stat_washing_machine",
      iconColor: "#0D5F7F"
    }
  }
};

export default config;
