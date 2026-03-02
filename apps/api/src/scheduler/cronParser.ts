import parser from "cron-parser";

export function computeNextRun(cronExpr: string, timezone: string, fromDate = new Date()): Date {
  const interval = parser.parseExpression(cronExpr, {
    currentDate: fromDate,
    tz: timezone
  });

  return interval.next().toDate();
}

