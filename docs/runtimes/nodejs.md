# Node.js

Select Node.js in the editor when its runtime probe is available. The stable ID `nodejs20` preserves saved-job compatibility; it does not force version 20.

Production uses the configured isolated Docker image (currently the Node 22 Bookworm image in `sandbox.ts`). The runtime endpoint reports its actual version. Development subprocess mode uses `process.execPath` and `--disallow-code-generation-from-strings`. There is no per-job npm installation step. Dependencies belong in a reviewed runtime image.

```js
console.log(`Automation ran at ${new Date().toISOString()}`);
```

Production requires approval and an isolated worker; execution is disabled until configured. See the [security model](../security/sandbox.md).
