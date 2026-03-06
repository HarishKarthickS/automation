# Common Failures

## Unsupported runtime

- Error: `Unsupported runtime`
- Fix: verify runtime is in shared runtime enum and enabled for API/web.

## Command not found

- Cause: runtime toolchain missing in sandbox image.
- Fix: install required compiler/interpreter in runtime environment.

## Timeout exceeded

- Cause: long compile time or infinite loop.
- Fix: optimize code or increase timeout within configured max.

## Output truncated

- Cause: run exceeded `MAX_OUTPUT_BYTES`.
- Fix: reduce logs or stream concise output.
