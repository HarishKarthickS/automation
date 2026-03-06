# Sandbox Model

Every run executes in an isolated workspace with strict limits.

## Guarantees

- Per-run temp directory isolation.
- Environment variable sanitization before process spawn.
- Timeout enforcement with graceful kill followed by force kill.
- Output truncation to configured maximum bytes.

## Runtime process model

- Runtime adapters generate source files and invoke language tools.
- Compile/runtime errors are captured and stored in run logs.
- Workspace is deleted after completion.
