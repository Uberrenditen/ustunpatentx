export type BerlinDateParts = {
  dateKey: string;
  hour: number;
  minute: number;
};

export function getBerlinParts(now = new Date()): BerlinDateParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function isPublishHour(now = new Date()): boolean {
  const hour = getBerlinParts(now).hour;
  return hour >= 7 && hour <= 22;
}
