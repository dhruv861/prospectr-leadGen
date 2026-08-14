const TIME_ZONE = "Asia/Kolkata";

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: TIME_ZONE }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

// Compares calendar days in TIME_ZONE (not exact timestamps), so "today" means
// today in that timezone regardless of the reader's local clock.
function toDateOnlyMs(iso: string): number {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE })
    .format(new Date(iso))
    .split("-")
    .map(Number);
  return Date.UTC(y, m - 1, d);
}

export type FollowUpUrgency = "overdue" | "today" | "upcoming";

export function getFollowUpUrgency(followUpAtIso: string): FollowUpUrgency {
  const followUpDay = toDateOnlyMs(followUpAtIso);
  const todayDay = toDateOnlyMs(new Date().toISOString());
  if (followUpDay < todayDay) return "overdue";
  if (followUpDay === todayDay) return "today";
  return "upcoming";
}

export function formatFollowUpLabel(followUpAtIso: string): string {
  const MS_PER_DAY = 86400000;
  const diffDays = Math.round((toDateOnlyMs(followUpAtIso) - toDateOnlyMs(new Date().toISOString())) / MS_PER_DAY);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays <= 7) return `In ${diffDays}d`;
  return formatDate(followUpAtIso);
}
