export type DayPeriod = "madrugada" | "manha" | "tarde" | "noite";

export const ARACAJU_TIME_ZONE = "America/Maceio";

const hourFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  hour12: false,
  timeZone: ARACAJU_TIME_ZONE,
});

export function getHourInAracaju(date: Date = new Date()): number {
  const parts = hourFormatter.formatToParts(date);
  const hourPart = parts.find((part) => part.type === "hour")?.value ?? "0";
  return Number(hourPart);
}

export function getDayPeriodByHour(hour: number): DayPeriod {
  if (hour >= 6 && hour <= 11) return "manha";
  if (hour >= 12 && hour <= 17) return "tarde";
  if (hour >= 18 && hour <= 23) return "noite";
  return "madrugada";
}

export function getCurrentDayPeriod(date: Date = new Date()): DayPeriod {
  return getDayPeriodByHour(getHourInAracaju(date));
}
