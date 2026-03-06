# Automiq Runtime Documentation

This documentation covers multi-runtime automation execution for cron + timezone workloads.

## Supported runtimes

- C++23 (`cpp23`)
- Java 21 (`java21`)
- Python 3.12 (`python312`)
- Go 1.22 (`go122`)
- Rust 1.83 (`rust183`)
- Node.js 20 (`nodejs20`, legacy compatibility)

## Core behavior

- Scheduling is unchanged: cron expression + timezone.
- Runtime is selected per automation.
- Secrets are injected as environment variables at runtime.
- Output and timeout limits are enforced for all runtimes.
