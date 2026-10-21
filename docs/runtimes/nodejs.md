# Node.js

Node.js is available for new and existing automations alongside the other runtimes.
Select **Node.js** in the automation editor or send `"runtime": "nodejs20"` to the API.
The persistent ID is retained for saved-job compatibility; it is not a support-status
label or a guarantee that the host runs version 20.

The runner writes an `automation.js` file and executes it with the API process's
Node.js executable (`process.execPath`). Deployments must choose and maintain the
host version. Node's `--disallow-code-generation-from-strings` flag is applied.

```js
console.log(`Automation ran at ${new Date().toISOString()}`);
```

Node.js jobs use the same environment allowlist, secret injection, timeout, output
limits and temporary-directory cleanup as other jobs. They have no per-job npm
dependency installation step. Run trusted code only; see the
[subprocess execution model](../security/sandbox.md) for protection limits.
