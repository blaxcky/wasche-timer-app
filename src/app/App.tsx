import { useEffect, useMemo, useRef, useState } from "react";
import { AppStateProvider, useAppState } from "./state";
import { buildBackupPayload, parseBackupPayload } from "../shared/storage/repository";
import { createId } from "../shared/lib/id";
import { elapsedSeconds, formatDateTime, formatDuration, fromDatetimeLocalInput, toDatetimeLocalInput } from "../shared/lib/time";
import { TabId, LaundryTemplate, LaundryTimer } from "../shared/types/models";

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "timers", label: "Timer", icon: "timer" },
  { id: "settings", label: "Einstellungen", icon: "settings" }
];

function parseMinutesInput(input: string): number[] {
  return input
    .split(",")
    .map((token) => Number(token.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.floor(value))
    .sort((a, b) => b - a);
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function AndroidIcon({ icon }: { icon: string }): JSX.Element {
  switch (icon) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10.8 12 4l8 6.8V20a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1v-9.2z" />
        </svg>
      );
    case "timer":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 2h6v2H9zM12 6a8 8 0 1 1-8 8 8 8 0 0 1 8-8zm1 3h-2v5l4 2 1-1.7-3-1.6z" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.4 13a7.9 7.9 0 0 0 .1-2l2-1.5-2-3.4-2.4 1a8.8 8.8 0 0 0-1.7-1l-.3-2.6h-4l-.4 2.6a8.5 8.5 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.9 7.9 0 0 0 .1 2l-2 1.5 2 3.4 2.4-1a8.8 8.8 0 0 0 1.7 1l.4 2.6h4l.3-2.6a8.5 8.5 0 0 0 1.7-1l2.4 1 2-3.4zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
        </svg>
      );
    default:
      return <span aria-hidden="true">•</span>;
  }
}

function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return Promise.resolve("denied");
  if (Notification.permission !== "default") return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}

function maybeNotify(title: string, body: string): void {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification(title, { body });
  } catch {
    // Ignore browser-specific notification failures.
  }
}

function triggerHaptics(enabled: boolean): void {
  if (!enabled) return;
  if (!("vibrate" in navigator)) return;
  navigator.vibrate([35, 30, 35]);
}

interface EditDraft {
  id: string;
  name: string;
  startAtInput: string;
  reminderEnabled: boolean;
  reminderOffsetsInput: string;
}

function AppContent(): JSX.Element {
  const { state, dispatch } = useAppState();
  const now = useNow();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [newTimerName, setNewTimerName] = useState("");
  const [templateSelection, setTemplateSelection] = useState<string>(state.templates[0]?.id ?? "");
  const [machineMinutes, setMachineMinutes] = useState(state.washingMachine.presetMin.toString());
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateEmoji, setNewTemplateEmoji] = useState("🧺");
  const [newTemplateReminders, setNewTemplateReminders] = useState("1440,360,60");
  const [defaultReminderInput, setDefaultReminderInput] = useState(state.settings.defaultReminderOffsetsMin.join(","));
  const [defaultPresetInput, setDefaultPresetInput] = useState(state.settings.defaultWashingPresetsMin.join(","));
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );
  const washingDoneRef = useRef(false);

  useEffect(() => {
    setDefaultReminderInput(state.settings.defaultReminderOffsetsMin.join(","));
  }, [state.settings.defaultReminderOffsetsMin]);

  useEffect(() => {
    setDefaultPresetInput(state.settings.defaultWashingPresetsMin.join(","));
  }, [state.settings.defaultWashingPresetsMin]);

  useEffect(() => {
    if (!templateSelection && state.templates.length > 0) {
      setTemplateSelection(state.templates[0].id);
    }
  }, [state.templates, templateSelection]);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const sortedTimers = useMemo(
    () => [...state.timers].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [state.timers]
  );

  const activeCount = state.timers.filter((timer) => timer.status === "active").length;
  const doneCount = state.timers.filter((timer) => elapsedSeconds(timer.startAt, now) >= timer.targetDurationSec).length;
  const reminderCount = state.timers.filter((timer) => timer.reminderEnabled).length;
  const avgElapsed =
    state.timers.length === 0
      ? 0
      : Math.round(
          state.timers.reduce((sum, timer) => sum + elapsedSeconds(timer.startAt, now), 0) / Math.max(1, state.timers.length)
        );

  const washingRemaining = useMemo(() => {
    if (!state.washingMachine.active || !state.washingMachine.endAt) return 0;
    return Math.max(0, Math.floor((new Date(state.washingMachine.endAt).getTime() - now.getTime()) / 1000));
  }, [now, state.washingMachine]);

  const washingEndDate = state.washingMachine.endAt ? new Date(state.washingMachine.endAt) : null;
  const isWashingDone = state.washingMachine.active && washingEndDate !== null && now.getTime() >= washingEndDate.getTime();

  useEffect(() => {
    for (const timer of state.timers) {
      if (!timer.reminderEnabled || timer.status !== "active") continue;

      const targetTimeMs = new Date(timer.startAt).getTime() + timer.targetDurationSec * 1000;
      const dueOffset = timer.reminderOffsetsMin
        .filter((offset) => !timer.notifiedOffsetsMin.includes(offset))
        .sort((a, b) => a - b)
        .find((offset) => now.getTime() >= targetTimeMs - offset * 60 * 1000);

      if (dueOffset === undefined) continue;

      maybeNotify("Wäsche-Timer", `${timer.name}: noch ${formatDuration(dueOffset * 60, false)} bis Ziel.`);
      triggerHaptics(state.settings.hapticsEnabled);
      dispatch({ type: "MARK_REMINDER_SENT", payload: { id: timer.id, offsetMin: dueOffset } });
    }

    if (isWashingDone && !washingDoneRef.current) {
      maybeNotify("Waschmaschine fertig", "Dein Waschgang ist fertig und bereit zum Aufhängen.");
      triggerHaptics(state.settings.hapticsEnabled);
      washingDoneRef.current = true;
    }

    if (!isWashingDone) {
      washingDoneRef.current = false;
    }
  }, [dispatch, isWashingDone, now, state.settings.hapticsEnabled, state.timers]);

  const confirmAction = (text: string): boolean => {
    if (!state.settings.confirmationsEnabled) return true;
    return window.confirm(text);
  };

  const selectedTemplate = state.templates.find((tpl) => tpl.id === templateSelection);

  const addTimer = (nameOverride?: string, templateOverride?: LaundryTemplate): void => {
    const name = (nameOverride ?? newTimerName).trim();
    if (!name) return;

    dispatch({
      type: "ADD_TIMER",
      payload: {
        name,
        template: templateOverride ?? selectedTemplate
      }
    });
    setNewTimerName("");
    triggerHaptics(state.settings.hapticsEnabled);
    setTab("timers");
  };

  const openEditor = (timer: LaundryTimer): void => {
    setEditDraft({
      id: timer.id,
      name: timer.name,
      startAtInput: toDatetimeLocalInput(timer.startAt),
      reminderEnabled: timer.reminderEnabled,
      reminderOffsetsInput: timer.reminderOffsetsMin.join(",")
    });
  };

  const saveEditor = (): void => {
    if (!editDraft) return;

    const offsets = parseMinutesInput(editDraft.reminderOffsetsInput);
    let startAtIso: string;

    try {
      startAtIso = fromDatetimeLocalInput(editDraft.startAtInput);
    } catch {
      window.alert("Bitte ein gültiges Startdatum eingeben.");
      return;
    }

    dispatch({
      type: "UPDATE_TIMER",
      payload: {
        id: editDraft.id,
        name: editDraft.name,
        startAt: startAtIso
      }
    });

    dispatch({
      type: "SET_TIMER_REMINDERS",
      payload: {
        id: editDraft.id,
        enabled: editDraft.reminderEnabled,
        offsets: offsets.length > 0 ? offsets : state.settings.defaultReminderOffsetsMin
      }
    });

    triggerHaptics(state.settings.hapticsEnabled);
    setEditDraft(null);
  };

  const deleteTimer = (id: string): void => {
    if (!confirmAction("Timer wirklich löschen?")) return;
    dispatch({ type: "DELETE_TIMER", payload: { id } });
  };

  const startWashingMachine = (): void => {
    const minutes = Number(machineMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    dispatch({ type: "START_WASHING_MACHINE", payload: { minutes: Math.floor(minutes) } });
    triggerHaptics(state.settings.hapticsEnabled);
  };

  const stopWashingMachine = (): void => {
    if (!confirmAction("Waschmaschinen-Timer stoppen?")) return;
    dispatch({ type: "STOP_WASHING_MACHINE" });
  };

  const askNotificationPermission = async (): Promise<void> => {
    const permission = await requestPermission();
    setNotificationPermission(permission);
  };

  const exportBackup = async (): Promise<void> => {
    const payload = buildBackupPayload(state);
    const json = JSON.stringify(payload, null, 2);

    try {
      if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: `wäsche-timer-backup-${new Date().toISOString().slice(0, 10)}.json`,
          types: [
            {
              description: "Wäsche-Timer Backup",
              accept: { "application/json": [".json"] }
            }
          ]
        });

        const writable = await fileHandle.createWritable();
        await writable.write(json);
        await writable.close();
      } else {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `wäsche-timer-backup-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      window.alert("Backup konnte nicht exportiert werden.");
    }
  };

  const openBackupFile = (): Promise<File | null> => {
    if (window.showOpenFilePicker) {
      return window
        .showOpenFilePicker({
          types: [
            {
              description: "Wäsche-Timer Backup",
              accept: { "application/json": [".json"] }
            }
          ]
        })
        .then(async (handles) => {
          if (handles.length === 0) return null;
          return handles[0].getFile();
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === "AbortError") return null;
          throw error;
        });
    }

    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = () => {
        resolve(input.files?.[0] ?? null);
      };
      input.click();
    });
  };

  const importBackup = async (): Promise<void> => {
    try {
      const file = await openBackupFile();
      if (!file) return;

      const raw = await file.text();
      const importedState = parseBackupPayload(raw);
      if (!confirmAction(`Import ${importedState.timers.length} Timer?`)) return;

      dispatch({ type: "REPLACE_STATE", payload: importedState });
      window.alert("Backup erfolgreich importiert.");
    } catch {
      window.alert("Backup-Datei ist ungültig oder nicht lesbar.");
    }
  };

  const addTemplate = (): void => {
    const reminders = parseMinutesInput(newTemplateReminders);
    if (newTemplateName.trim().length === 0 || reminders.length === 0) {
      window.alert("Vorlage braucht Namen und mindestens einen Reminder-Wert.");
      return;
    }

    dispatch({
      type: "ADD_TEMPLATE",
      payload: {
        name: newTemplateName,
        emoji: newTemplateEmoji,
        reminders
      }
    });
    setNewTemplateName("");
  };

  const applyDefaults = (): void => {
    const reminders = parseMinutesInput(defaultReminderInput);
    const presets = parseMinutesInput(defaultPresetInput).sort((a, b) => a - b);

    if (reminders.length === 0 || presets.length === 0) {
      window.alert("Bitte gültige Minutenlisten eingeben.");
      return;
    }

    dispatch({
      type: "UPDATE_SETTINGS",
      payload: {
        defaultReminderOffsetsMin: reminders,
        defaultWashingPresetsMin: presets
      }
    });
  };

  const installApp = async (): Promise<void> => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  return (
    <div className="app-root">
      <div className="ambient-bg" aria-hidden="true" />
      <header className="top-bar">
        <div>
          <p className="eyebrow">Android PWA</p>
          <h1>Wäsche-Timer</h1>
        </div>
        <span className="status-pill">v2 Overhaul</span>
      </header>

      <main className="main-pane">
        {tab === "dashboard" && (
          <section className="tab-screen">
            <div className="card hero-card">
              <div>
                <p className="eyebrow">Schnellüberblick</p>
                <h2>{activeCount} aktiv, {doneCount} fertig</h2>
              </div>
              <p className="muted">Durchschnittliche Laufzeit: {formatDuration(avgElapsed, false)}</p>
              <div className="quick-actions">
                <button className="btn btn-tonal" onClick={() => setTab("timers")}>Timer verwalten</button>
                <button className="btn btn-tonal" onClick={() => addTimer("Neue Ladung")}>Schnellstart</button>
              </div>
            </div>

            <div className="kpi-grid">
              <article className="card kpi-card">
                <p>Aktive Timer</p>
                <strong>{activeCount}</strong>
              </article>
              <article className="card kpi-card">
                <p>Ziel erreicht</p>
                <strong>{doneCount}</strong>
              </article>
              <article className="card kpi-card">
                <p>Mit Reminder</p>
                <strong>{reminderCount}</strong>
              </article>
            </div>

            <article className="card">
              <div className="section-head">
                <h3>Waschmaschine</h3>
                {state.washingMachine.active ? (
                  <button className="btn btn-text" onClick={stopWashingMachine}>Stopp</button>
                ) : null}
              </div>

              {state.washingMachine.active && washingEndDate ? (
                <>
                  <p className="big-timer">{isWashingDone ? "Fertig" : formatDuration(washingRemaining)}</p>
                  <p className="muted">Ende: {washingEndDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</p>
                </>
              ) : (
                <p className="muted">Kein Waschmaschinen-Timer aktiv.</p>
              )}

              <div className="inline-form">
                <select value={machineMinutes} onChange={(event) => setMachineMinutes(event.target.value)}>
                  {state.settings.defaultWashingPresetsMin.map((value) => (
                    <option key={value} value={value}>{value} Min</option>
                  ))}
                  <option value={machineMinutes}>{machineMinutes} Min (Custom)</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={machineMinutes}
                  onChange={(event) => setMachineMinutes(event.target.value)}
                />
                <button className="btn btn-primary" onClick={startWashingMachine}>Start</button>
              </div>
            </article>

          </section>
        )}

        {tab === "timers" && (
          <section className="tab-screen">
            <article className="card">
              <div className="section-head">
                <h3>Neue Wäscheladung</h3>
              </div>
              <div className="stacked-form">
                <input
                  type="text"
                  placeholder="z.B. Buntwäsche, Handtücher, Bettwäsche"
                  value={newTimerName}
                  onChange={(event) => setNewTimerName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addTimer();
                  }}
                />
                <div className="template-row">
                  {state.templates.map((template) => (
                    <button
                      key={template.id}
                      className={`chip ${template.id === templateSelection ? "chip-active" : ""}`}
                      onClick={() => setTemplateSelection(template.id)}
                    >
                      <span>{template.emoji}</span> {template.name}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={() => addTimer()}>Timer starten</button>
              </div>
            </article>

            {sortedTimers.length === 0 ? (
              <article className="card empty-card">
                <h3>Keine aktiven Timer</h3>
                <p>Lege deine erste Ladung an, um den Trocknungsfortschritt zu tracken.</p>
              </article>
            ) : (
              <div className="timer-list">
                {sortedTimers.map((timer, index) => {
                  const elapsed = elapsedSeconds(timer.startAt, now);
                  const remaining = Math.max(0, timer.targetDurationSec - elapsed);
                  const progress = Math.min(100, Math.round((elapsed / timer.targetDurationSec) * 100));
                  const reached = elapsed >= timer.targetDurationSec;

                  return (
                    <article key={timer.id} className="card timer-card" style={{ animationDelay: `${index * 40}ms` }}>
                      <div className="timer-head">
                        <div>
                          <h3>{timer.name}</h3>
                          <p>Seit {formatDateTime(timer.startAt)}</p>
                        </div>
                        <span className={`badge ${reached ? "badge-success" : "badge-info"}`}>
                          {reached ? "Ziel erreicht" : "Aktiv"}
                        </span>
                      </div>

                      <p className="big-timer">{formatDuration(elapsed)}</p>
                      <p className="muted">{reached ? "Trocknungsziel ist erreicht." : `Noch ${formatDuration(remaining, false)}`}</p>
                      <div className="progress-track">
                        <div className="progress-bar" style={{ width: `${progress}%` }} />
                      </div>

                      <div className="timer-meta">
                        <span>Reminder: {timer.reminderEnabled ? timer.reminderOffsetsMin.join(",") + " Min" : "Aus"}</span>
                        <span>{progress}%</span>
                      </div>

                      <div className="timer-actions">
                        <button className="btn btn-text" onClick={() => openEditor(timer)}>Bearbeiten</button>
                        <button className="btn btn-danger" onClick={() => deleteTimer(timer.id)}>Löschen</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "settings" && (
          <section className="tab-screen">
            <article className="card">
              <div className="section-head">
                <h3>Backup</h3>
              </div>
              <div className="quick-actions">
                <button className="btn btn-tonal" onClick={exportBackup}>Backup exportieren</button>
                <button className="btn btn-tonal" onClick={importBackup}>Backup importieren</button>
              </div>
            </article>

            <article className="card">
              <div className="section-head">
                <h3>Reminder und Haptik</h3>
              </div>
              <label className="switch-row">
                <span>Haptisches Feedback</span>
                <input
                  type="checkbox"
                  checked={state.settings.hapticsEnabled}
                  onChange={(event) =>
                    dispatch({ type: "UPDATE_SETTINGS", payload: { hapticsEnabled: event.target.checked } })
                  }
                />
              </label>

              <label className="switch-row">
                <span>Bestätigungsdialoge</span>
                <input
                  type="checkbox"
                  checked={state.settings.confirmationsEnabled}
                  onChange={(event) =>
                    dispatch({ type: "UPDATE_SETTINGS", payload: { confirmationsEnabled: event.target.checked } })
                  }
                />
              </label>

              <div className="inline-form">
                <input
                  type="text"
                  value={defaultReminderInput}
                  onChange={(event) => setDefaultReminderInput(event.target.value)}
                  placeholder="1440,360,60"
                />
                <input
                  type="text"
                  value={defaultPresetInput}
                  onChange={(event) => setDefaultPresetInput(event.target.value)}
                  placeholder="60,90,120,170"
                />
                <button className="btn btn-primary" onClick={applyDefaults}>Defaults setzen</button>
              </div>

              <div className="section-head compact">
                <h4>Benachrichtigungen</h4>
                <span className="muted">Status: {notificationPermission}</span>
              </div>
              <button className="btn btn-tonal" onClick={askNotificationPermission}>Berechtigung anfragen</button>
            </article>

            <article className="card">
              <div className="section-head">
                <h3>Vorlagen erweitern</h3>
              </div>
              <div className="inline-form">
                <input
                  type="text"
                  value={newTemplateEmoji}
                  onChange={(event) => setNewTemplateEmoji(event.target.value)}
                  placeholder="Emoji"
                />
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(event) => setNewTemplateName(event.target.value)}
                  placeholder="Name"
                />
              </div>
              <div className="inline-form">
                <input
                  type="text"
                  value={newTemplateReminders}
                  onChange={(event) => setNewTemplateReminders(event.target.value)}
                  placeholder="Reminder in Min, z.B. 1440,360,60"
                />
                <button className="btn btn-primary" onClick={addTemplate}>Vorlage speichern</button>
              </div>
            </article>

            <article className="card">
              <div className="section-head">
                <h3>Installation</h3>
              </div>
              <p className="muted">
                {isStandalone
                  ? "App läuft bereits im Standalone-Modus."
                  : installPrompt
                  ? "App kann jetzt auf dem Homescreen installiert werden."
                  : "Install-Prompt aktuell nicht verfügbar. Auf Android über Browser-Menü installierbar."}
              </p>
              {installPrompt ? (
                <button className="btn btn-primary" onClick={installApp}>Jetzt installieren</button>
              ) : null}
            </article>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Hauptnavigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${tab === item.id ? "nav-item-active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            <AndroidIcon icon={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {editDraft ? (
        <div className="dialog-backdrop" role="dialog" aria-modal="true">
          <div className="dialog card">
            <div className="section-head">
              <h3>Timer bearbeiten</h3>
            </div>
            <div className="stacked-form">
              <input
                type="text"
                value={editDraft.name}
                onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
              />
              <input
                type="datetime-local"
                value={editDraft.startAtInput}
                onChange={(event) => setEditDraft({ ...editDraft, startAtInput: event.target.value })}
              />
              <label className="switch-row">
                <span>Reminder aktiv</span>
                <input
                  type="checkbox"
                  checked={editDraft.reminderEnabled}
                  onChange={(event) => setEditDraft({ ...editDraft, reminderEnabled: event.target.checked })}
                />
              </label>
              <input
                type="text"
                value={editDraft.reminderOffsetsInput}
                onChange={(event) => setEditDraft({ ...editDraft, reminderOffsetsInput: event.target.value })}
                placeholder="Reminder-Minuten, z.B. 1440,360,60"
              />
              <div className="quick-actions">
                <button className="btn btn-tonal" onClick={() => setEditDraft(null)}>Abbrechen</button>
                <button className="btn btn-primary" onClick={saveEditor}>Speichern</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button className="fab" onClick={() => addTimer(newTimerName || `Ladung ${createId("n").slice(-4)}`)}>
        +
      </button>
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}

