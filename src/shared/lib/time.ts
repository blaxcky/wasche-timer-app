export function toSeconds(ms: number): number {
  return Math.max(0, Math.floor(ms / 1000));
}

export function elapsedSeconds(startAtIso: string, now: Date): number {
  return toSeconds(now.getTime() - new Date(startAtIso).getTime());
}

export function remainingSeconds(startAtIso: string, targetDurationSec: number, now: Date): number {
  const elapsed = elapsedSeconds(startAtIso, now);
  return Math.max(0, targetDurationSec - elapsed);
}

export function formatDuration(totalSeconds: number, withSeconds = true): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (withSeconds) {
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "0m";
}

export function formatDurationDaysHours(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const totalHours = Math.floor(safe / 3600);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) return `${days}d ${hours}h`;
  return `${totalHours}h`;
}

function joinWithUnd(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} und ${parts[1]}`;
  return `${parts[0]}, ${parts[1]} und ${parts[2]}`;
}

export function formatDurationDaysHoursWords(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const totalHours = Math.floor(safe / 3600);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} ${days === 1 ? "Tag" : "Tage"}`);
  if (totalHours > 0) parts.push(`${hours} ${hours === 1 ? "Stunde" : "Stunden"}`);

  if (parts.length === 0) return "unter 1 Stunde";
  return joinWithUnd(parts.slice(0, 2));
}

export function formatDurationWords(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} ${days === 1 ? "Tag" : "Tage"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "Stunde" : "Stunden"}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "Minute" : "Minuten"}`);

  if (parts.length === 0) return "0 Minuten";
  return joinWithUnd(parts.slice(0, 3));
}

export function formatDateTime(iso: string, locale = "de-DE"): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })} ${date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
}

export function toDatetimeLocalInput(iso: string): string {
  const date = new Date(iso);
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export function fromDatetimeLocalInput(input: string): string {
  return new Date(input).toISOString();
}
