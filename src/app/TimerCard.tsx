import { IonButton, IonCard, IonIcon, IonProgressBar } from "@ionic/react";
import { createOutline, trashOutline } from "ionicons/icons";
import { elapsedSeconds, formatDateTime, formatDurationDaysHours } from "../shared/lib/time";
import type { LaundryTimer } from "../shared/types/models";

export interface TimerCardProps {
  timer: LaundryTimer;
  now: Date;
  listIndex: number;
  onEdit: (timer: LaundryTimer) => void;
  onDelete: (id: string) => void;
}

export function TimerCard({ timer, now, listIndex, onEdit, onDelete }: TimerCardProps): JSX.Element {
  const elapsed = elapsedSeconds(timer.startAt, now);
  const remaining = Math.max(0, timer.targetDurationSec - elapsed);
  const reached = elapsed >= timer.targetDurationSec;
  const progress = reached ? 100 : Math.min(100, Math.round((elapsed / timer.targetDurationSec) * 100));

  return (
    <IonCard
      className={`timer-card${reached ? " timer-card-done" : ""}`}
      style={{ animationDelay: `${listIndex * 40}ms` }}
    >
      <div className="timer-head">
        <div className="timer-title-block">
          <h3>{timer.name}</h3>
          <p>Seit {formatDateTime(timer.startAt)}</p>
        </div>

        <div className="timer-actions" aria-label={`Aktionen für ${timer.name}`}>
          <IonButton
            className="timer-icon-button timer-edit-button"
            fill="clear"
            mode="md"
            aria-label={`${timer.name} bearbeiten`}
            title="Bearbeiten"
            onClick={() => onEdit(timer)}
          >
            <IonIcon slot="icon-only" icon={createOutline} aria-hidden="true" />
          </IonButton>
          <IonButton
            className="timer-icon-button timer-delete-button"
            fill="clear"
            mode="md"
            aria-label={`${timer.name} löschen`}
            title="Löschen"
            onClick={() => onDelete(timer.id)}
          >
            <IonIcon slot="icon-only" icon={trashOutline} aria-hidden="true" />
          </IonButton>
        </div>
      </div>

      <p className="big-timer">{formatDurationDaysHours(elapsed)}</p>
      <p className="muted">{reached ? "Trocknungsziel erreicht." : `Noch ${formatDurationDaysHours(remaining)}`}</p>

      <IonProgressBar
        className="timer-progress"
        value={progress / 100}
        aria-label={`Trocknungsfortschritt: ${progress} Prozent`}
      />

      <div className="timer-meta">
        <span>Ziel: {formatDurationDaysHours(timer.targetDurationSec)}</span>
        <span>{progress}%</span>
      </div>
    </IonCard>
  );
}
