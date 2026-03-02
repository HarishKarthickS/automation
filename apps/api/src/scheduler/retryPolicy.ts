export function getRetryDelayMs(attempt: number): number {
  if (attempt <= 1) {
    return 30_000;
  }

  return 0;
}

