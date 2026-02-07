import { createContext, ReactNode, useContext, useEffect, useMemo, useReducer } from "react";
import { createId } from "../shared/lib/id";
import { DEFAULT_TARGET_DURATION_SEC } from "../shared/lib/defaults";
import { loadState, saveState, sanitizeState } from "../shared/storage/repository";
import { AppStateV2, HistoryEntry, LaundryTimer, LaundryTemplate } from "../shared/types/models";

type Action =
  | { type: "ADD_TIMER"; payload: { name: string; template?: LaundryTemplate } }
  | { type: "UPDATE_TIMER"; payload: { id: string; name: string; startAt: string } }
  | { type: "DELETE_TIMER"; payload: { id: string; archiveReason?: HistoryEntry["reason"] } }
  | { type: "SET_TIMER_STATUS"; payload: { id: string; status: LaundryTimer["status"] } }
  | { type: "START_WASHING_MACHINE"; payload: { minutes: number } }
  | { type: "STOP_WASHING_MACHINE" }
  | { type: "UPDATE_SETTINGS"; payload: Partial<AppStateV2["settings"]> }
  | { type: "REPLACE_STATE"; payload: AppStateV2 }
  | { type: "ARCHIVE_TIMER"; payload: { id: string; reason: HistoryEntry["reason"] } }
  | { type: "RESTORE_HISTORY"; payload: { historyId: string } }
  | { type: "ADD_TEMPLATE"; payload: { name: string; emoji: string; targetDurationSec?: number } };

function reducer(state: AppStateV2, action: Action): AppStateV2 {
  switch (action.type) {
    case "ADD_TIMER": {
      const trimmed = action.payload.name.trim();
      if (!trimmed) return state;

      const template = action.payload.template;

      const timer: LaundryTimer = {
        id: createId("timer"),
        name: trimmed,
        startAt: new Date().toISOString(),
        targetDurationSec: template?.targetDurationSec ?? DEFAULT_TARGET_DURATION_SEC,
        status: "active"
      };

      return { ...state, timers: [...state.timers, timer] };
    }

    case "UPDATE_TIMER": {
      const { id, name, startAt } = action.payload;
      return {
        ...state,
        timers: state.timers.map((timer) => {
          if (timer.id !== id) return timer;
          return {
            ...timer,
            name: name.trim() || timer.name,
            startAt: new Date(startAt).toISOString()
          };
        })
      };
    }

    case "DELETE_TIMER": {
      const deleted = state.timers.find((timer) => timer.id === action.payload.id);
      if (!deleted) return state;

      const nextHistory =
        action.payload.archiveReason === undefined
          ? state.history
          : [
              {
                id: createId("hist"),
                timerSnapshot: deleted,
                archivedAt: new Date().toISOString(),
                reason: action.payload.archiveReason
              },
              ...state.history
            ];

      return {
        ...state,
        timers: state.timers.filter((timer) => timer.id !== action.payload.id),
        history: nextHistory
      };
    }

    case "ARCHIVE_TIMER": {
      const archived = state.timers.find((timer) => timer.id === action.payload.id);
      if (!archived) return state;

      return {
        ...state,
        timers: state.timers.filter((timer) => timer.id !== action.payload.id),
        history: [
          {
            id: createId("hist"),
            timerSnapshot: { ...archived, status: "done" },
            archivedAt: new Date().toISOString(),
            reason: action.payload.reason
          },
          ...state.history
        ]
      };
    }

    case "SET_TIMER_STATUS": {
      return {
        ...state,
        timers: state.timers.map((timer) =>
          timer.id === action.payload.id ? { ...timer, status: action.payload.status } : timer
        )
      };
    }

    case "START_WASHING_MACHINE": {
      const mins = Math.max(1, Math.floor(action.payload.minutes));
      const endAt = new Date(Date.now() + mins * 60 * 1000).toISOString();

      return {
        ...state,
        washingMachine: {
          active: true,
          endAt,
          presetMin: mins
        }
      };
    }

    case "STOP_WASHING_MACHINE": {
      return {
        ...state,
        washingMachine: {
          ...state.washingMachine,
          active: false,
          endAt: null
        }
      };
    }

    case "UPDATE_SETTINGS": {
      const merged = {
        ...state.settings,
        ...action.payload
      };

      return {
        ...state,
        settings: {
          ...merged,
          defaultWashingPresetsMin: Array.from(
            new Set(
              merged.defaultWashingPresetsMin
            .map((value) => Math.floor(value))
                .filter((value) => value > 0)
            )
          ).sort((a, b) => a - b)
        }
      };
    }

    case "REPLACE_STATE": {
      return sanitizeState(action.payload);
    }

    case "RESTORE_HISTORY": {
      const entry = state.history.find((item) => item.id === action.payload.historyId);
      if (!entry) return state;

      const restored: LaundryTimer = {
        ...entry.timerSnapshot,
        id: createId("timer"),
        status: "active"
      };

      return {
        ...state,
        timers: [restored, ...state.timers],
        history: state.history.filter((item) => item.id !== action.payload.historyId)
      };
    }

    case "ADD_TEMPLATE": {
      const trimmed = action.payload.name.trim();
      if (!trimmed) return state;

      const template: LaundryTemplate = {
        id: createId("tpl"),
        name: trimmed,
        emoji: action.payload.emoji || "🧺",
        targetDurationSec: action.payload.targetDurationSec ?? DEFAULT_TARGET_DURATION_SEC
      };

      return {
        ...state,
        templates: [...state.templates, template]
      };
    }

    default:
      return state;
  }
}

interface AppStateContextValue {
  state: AppStateV2;
  dispatch: React.Dispatch<Action>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState muss innerhalb von AppStateProvider verwendet werden.");
  }

  return ctx;
}
