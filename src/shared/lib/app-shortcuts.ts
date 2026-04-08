export const WASHING_MACHINE_THREE_HOURS_SHORTCUT = "washing-machine-3h";

export type AppShortcutAction = typeof WASHING_MACHINE_THREE_HOURS_SHORTCUT;

export function parseAppShortcutAction(urlLike: string, baseUrl = "https://app.local/"): AppShortcutAction | null {
  try {
    const url = new URL(urlLike, baseUrl);
    const shortcut = url.searchParams.get("shortcut");
    return shortcut === WASHING_MACHINE_THREE_HOURS_SHORTCUT ? shortcut : null;
  } catch {
    return null;
  }
}

export function stripAppShortcutParam(urlLike: string, baseUrl = "https://app.local/"): string | null {
  try {
    const url = new URL(urlLike, baseUrl);
    if (!url.searchParams.has("shortcut")) return null;
    url.searchParams.delete("shortcut");
    return url.toString();
  } catch {
    return null;
  }
}
