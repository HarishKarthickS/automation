# Execution security model

Production execution is disabled by default. Creating an account does not grant execution permission. Administrators approve accounts; suspension and approval are checked when claiming, admitting, starting and renewing jobs.

When `EXECUTION_MODE=docker` is configured, each job runs in a fresh non-root container. It receives no host mounts, daemon socket or API credentials. Containers use a read-only root filesystem, no capabilities, no privilege escalation, no network, one CPU, 512 MiB memory, 64 processes and bounded per-job tmpfs. Runtime images must be preinstalled and pass actual toolchain probes. Code is streamed as encoded file data, not interpolated as shell commands. Package downloads are disabled. Timeout, cancellation and output overflow terminate the whole container; an internal deadline also limits jobs after an API crash.

Development `trusted-subprocess` mode shares the host OS user. It provides an environment allowlist, temporary directory, timeout/output bounds and best-effort process-group termination. It does not provide filesystem, network or memory isolation and is rejected in production. Python development installs use a job-local target directory.

Secrets are encrypted at rest with versioned AES-256-GCM keys. Jobs can access and print their own injected secrets; retained output is not automatically redacted. A container is not a guarantee against unpatched kernel/engine vulnerabilities. Keep the host patched and dedicated; do not treat a successful CI sandbox test as proof that a production daemon is configured.

See [setup and limits](../operations/isolated-execution.md), [durable recovery semantics](../operations/durable-scheduler.md), and [key rotation](../operations/key-rotation.md).
