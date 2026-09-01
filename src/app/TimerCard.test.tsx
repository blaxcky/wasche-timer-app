import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { LaundryTimer } from "../shared/types/models";
import { TimerCard } from "./TimerCard";

function renderTimerCard(timer: LaundryTimer, now: Date): string {
  return renderToStaticMarkup(
    <TimerCard timer={timer} now={now} listIndex={2} onEdit={vi.fn()} onDelete={vi.fn()} />
  );
}

describe("TimerCard", () => {
  it("renders a running timer without status badges and with a dynamic target", () => {
    const markup = renderTimerCard(
      {
        id: "timer-running",
        name: "Sehr lange Bezeichnung für den Wäscheständer im Gästezimmer",
        startAt: "2026-09-01T10:00:00.000Z",
        targetDurationSec: 4 * 24 * 60 * 60,
        status: "active"
      },
      new Date("2026-09-02T10:00:00.000Z")
    );

    expect(markup).toContain("Ziel: 4d");
    expect(markup).toContain("25%");
    expect(markup).toContain("Noch 3d");
    expect(markup).not.toContain("&gt;Aktiv&lt;");
    expect(markup).not.toContain("Ziel erreicht");
    expect(markup).toContain('aria-label="Sehr lange Bezeichnung für den Wäscheständer im Gästezimmer bearbeiten"');
    expect(markup).toContain('aria-label="Sehr lange Bezeichnung für den Wäscheständer im Gästezimmer löschen"');
  });

  it("renders a completed timer as a full success state", () => {
    const markup = renderTimerCard(
      {
        id: "timer-done",
        name: "Bettwäsche",
        startAt: "2026-08-29T10:00:00.000Z",
        targetDurationSec: 2 * 24 * 60 * 60,
        status: "active"
      },
      new Date("2026-09-01T10:00:00.000Z")
    );

    expect(markup).toContain("Trocknungsziel erreicht.");
    expect(markup).toContain("Ziel: 2d");
    expect(markup).toContain("100%");
    expect(markup).toContain("Trocknungsfortschritt: 100 Prozent");
    expect(markup).not.toContain("Noch ");
  });
});
