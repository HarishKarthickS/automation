# Subprocess execution model

Jobs use subprocess execution with env allowlist, timeouts and output limits.
Each run receives a temporary working directory. This is workspace separation,
not a security sandbox or operating-system isolation boundary.

## Implemented controls

- Per-run temporary working directory and cleanup after completion/failure.
- Environment variable sanitization before process spawn.
- Timeout enforcement with graceful kill followed by force kill.
- Output truncation to configured maximum bytes.

## Runtime process model

- Runtime adapters generate source files and invoke language tools.
- Compile/runtime errors are captured and stored in run logs.
- Workspace is deleted after completion.

## Limits of protection

- Jobs run under the API host's OS user. They can access files readable/writable
  by that user outside their working directory and make outbound network requests.
- There are no per-job CPU, memory, disk, network, container or namespace limits.
- Timeout/output enforcement targets the direct child process; descendant process
  trees are not reliably terminated. Dependency installation runs on the host too.
- The env allowlist prevents automatic inheritance of application credentials;
  it does not stop code reading host files or accessing injected job secrets.
- Encrypted storage does not stop a job printing or transmitting its own secrets.
  Output is retained in run logs without automatic secret redaction.

Run only code and dependencies you trust. A hostile multi-user service requires
an isolated worker/container boundary, restricted filesystem and network access,
resource quotas and process-tree cleanup before accepting untrusted jobs.

Resume wording: "Built subprocess execution with env allowlist, timeouts and
output limits, plus encrypted per-automation secrets and run history."
