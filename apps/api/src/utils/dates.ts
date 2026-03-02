export function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

export function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

