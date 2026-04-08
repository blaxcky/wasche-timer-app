import { describe, expect, it } from "vitest";
import {
  parseAppShortcutAction,
  stripAppShortcutParam,
  WASHING_MACHINE_THREE_HOURS_SHORTCUT
} from "./app-shortcuts";

describe("app shortcuts", () => {
  it("parses the washing machine shortcut action from the launch url", () => {
    const action = parseAppShortcutAction(
      `/?shortcut=${WASHING_MACHINE_THREE_HOURS_SHORTCUT}&source=homescreen`,
      "https://example.com/"
    );

    expect(action).toBe(WASHING_MACHINE_THREE_HOURS_SHORTCUT);
  });

  it("removes the shortcut query parameter after handling", () => {
    const cleanedUrl = stripAppShortcutParam(
      `https://example.com/?shortcut=${WASHING_MACHINE_THREE_HOURS_SHORTCUT}&source=homescreen`
    );

    expect(cleanedUrl).toBe("https://example.com/?source=homescreen");
  });
});
