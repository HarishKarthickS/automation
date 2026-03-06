# Overview

Automiq executes user code on schedule with a selected runtime and timezone-aware cron configuration.

## Automation payload shape

- `code`: source code
- `runtime`: runtime ID (`cpp23`, `java21`, `python312`, `go122`, `rust183`, `nodejs20`)
- `cronExpr`: cron expression
- `timezone`: IANA timezone
- `timeoutSeconds`: execution timeout

## Execution lifecycle

1. Scheduler claims due automations.
2. Runner creates an isolated temp workspace.
3. Runtime adapter writes code and executes compile/run command.
4. Output and errors are captured with size limits.
5. Run record is finalized and retried per policy when needed.
