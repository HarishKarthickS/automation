# Isolated execution

Production defaults to `EXECUTION_MODE=disabled`. Signup does not grant execution access. An administrator must approve each user in Admin → Users. Approval is stored in PostgreSQL and cannot be set by signup input. Revocation and suspension are checked again by workers.

For execution, use a dedicated Docker-capable Linux host or a TLS-authenticated Docker daemon reachable by the API. Render's native Node service does not provide a Docker daemon. Installing the Docker CLI alone does not create one. Keep the site in disabled mode until a suitable host is configured and verified; do not enable development subprocess mode in production.

1. Deploy the API on the execution host, with Docker CLI and a current Docker Engine, or configure its Docker client with mutually authenticated TLS (`DOCKER_HOST`, `DOCKER_TLS_VERIFY`, `DOCKER_CERT_PATH`). Never expose an unauthenticated Docker API. The API is a trusted control plane; containers receive no daemon socket, host bind mounts or API configuration files.
2. Pre-pull the images listed in `apps/api/src/executor/sandbox.ts`. Record their content digests in deployment records and update them through reviewed image builds. Jobs use `--pull=never`; a missing image makes its runtime unavailable. Runtime probes report the actual interpreter/compiler version rather than trusting an ID's historical suffix.
3. Set `EXECUTION_MODE=docker`, run every runtime smoke test and verify readiness. Only then approve demo accounts for execution.

Every job uses a fresh container as UID/GID 65534, a read-only root filesystem, no capabilities, no privilege escalation, no network, one CPU, 512 MiB memory with no additional swap, 64 processes, and bounded writable tmpfs storage. Source is streamed through stdin, never interpolated as shell code. No host directory is mounted. Secrets are passed only by explicit job environment keys; Docker/client and interpreter control variables are reserved. Output is bounded. Timeout, cancellation and output overflow remove the whole container. An in-container deadline also bounds execution if the API process dies.

The default isolated runner deliberately blocks external network access and package downloads. Include approved dependencies in reviewed images instead of downloading packages during a job. If network-enabled jobs become necessary, introduce an authenticated egress proxy with an explicit destination allowlist and tests before changing that policy. This configuration does not claim protection against an unpatched container-engine/kernel vulnerability; keep the host patched and dedicated to execution.

`trusted-subprocess` remains available only in development/tests for code you trust. It is rejected when `NODE_ENV=production`. Python dependencies in this mode use a per-job target directory. It is not a production isolation mechanism.

CI executes all six runtime smoke jobs on Linux Docker, plus Node checks for non-root execution, host-file boundaries, denied egress and timeout cleanup. A green CI run proves those image/runner checks on CI; it does not prove a separate production daemon has been provisioned.
