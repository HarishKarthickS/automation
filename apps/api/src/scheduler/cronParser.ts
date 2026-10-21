import { CronExpressionParser } from "cron-parser";

export function computeNextRun(cronExpr: string, timezone: string, fromDate = new Date()): Date {
  const interval = CronExpressionParser.parse(cronExpr, {
    currentDate: fromDate,
    tz: timezone
  });

  return interval.next().toDate();
}

