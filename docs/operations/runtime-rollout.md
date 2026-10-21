# Runtime Rollout

## Recommended rollout sequence

1. Deploy shared schema/runtime enum changes.
2. Deploy the executor dispatcher, retaining the existing Node.js runtime ID for saved jobs.
3. Enable runtime picker in web app.
4. Enable non-node runtimes by environment flag.
5. Monitor runtime-specific failures and timeout rates.

## Monitoring dimensions

- Success rate by runtime
- Timeout rate by runtime
- Compile failure rate by runtime
- Mean and P95 execution duration by runtime
