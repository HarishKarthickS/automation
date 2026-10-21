import { describe, expect, it } from "vitest";
import { executeAutomation } from "../src/executor/runner.js";
import type { RuntimeId } from "@automation/shared";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../src/config/env.js";
const runtime = (process.env.SANDBOX_RUNTIME ?? "nodejs20") as RuntimeId;
const programs: Record<RuntimeId, string> = {
  nodejs20: "console.log('sandbox-ok')", python312: "print('sandbox-ok')", cpp23: '#include <iostream>\nint main(){std::cout << "sandbox-ok";}',
  java21: 'public class Main { public static void main(String[] args) {System.out.println("sandbox-ok");}}',
  go122: 'package main\nimport "fmt"\nfunc main(){fmt.Println("sandbox-ok")}', rust183: 'fn main(){println!("sandbox-ok");}'
};
describe.skipIf(process.env.RUN_SANDBOX_TESTS !== "true")("real Docker boundary", () => {
  it(`executes ${runtime} in its advertised image`, async () => {
    const result = await executeAutomation({ runId: crypto.randomUUID(), runtime, code: programs[runtime], timeoutSeconds: 45, envVars: {} });
    expect(result.error).toBeNull(); expect(result.status).toBe("succeeded"); expect(result.output).toContain("sandbox-ok");
  }, 60_000);
  it.skipIf(runtime !== "nodejs20")("enforces host, user, network and kernel resource boundaries", async () => {
    const result = await executeAutomation({ runId: crypto.randomUUID(), runtime, timeoutSeconds: 10, envVars: { JOB_TOKEN: "only-job" }, code: `
      const fs = require('fs'); const net = require('net');
      if (process.getuid() === 0 || fs.existsSync('/var/run/docker.sock') || fs.existsSync('/host')) throw Error('host boundary missing');
      if (process.env.DATABASE_URL || process.env.JOB_TOKEN !== 'only-job') throw Error('environment boundary missing');
      if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
        if (fs.readFileSync('/sys/fs/cgroup/memory.max','utf8').trim() !== '536870912') throw Error('memory limit missing');
        if (fs.readFileSync('/sys/fs/cgroup/pids.max','utf8').trim() !== '64') throw Error('process limit missing');
        const [quota, period] = fs.readFileSync('/sys/fs/cgroup/cpu.max','utf8').trim().split(/\\s+/).map(Number);
        if (quota / period !== 1) throw Error('CPU limit missing');
      }
      try { fs.writeFileSync('/host-write-test', 'bad'); throw Error('root writable'); } catch(e) { if(e.message === 'root writable') throw e; }
      const s = net.connect({host:'1.1.1.1',port:443}); s.setTimeout(1000); s.on('connect',()=>{throw Error('egress permitted')}); s.on('error',()=>console.log('isolated')); s.on('timeout',()=>{s.destroy();console.log('isolated')});
    ` });
    expect(result.status).toBe("succeeded"); expect(result.output).toContain("isolated");
  }, 20_000);
  it.skipIf(runtime !== "nodejs20")("terminates the entire container on timeout", async () => {
    const result = await executeAutomation({ runId: crypto.randomUUID(), runtime, timeoutSeconds: 1, envVars: {}, code: "require('child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});setInterval(()=>{},1000)" });
    expect(result.status).toBe("timed_out");
    expect(result.durationMs).toBeLessThan(9000);
    const remaining = await promisify(execFile)("docker", ["ps", "-q", "--filter", "label=automiq.job=true"]);
    expect(remaining.stdout.trim()).toBe("");
  }, 15_000);
  it.skipIf(runtime !== "nodejs20")("bounds output flooding and reports the output limit instead of a timeout", async () => {
    const result = await executeAutomation({ runId: crypto.randomUUID(), runtime, timeoutSeconds: 10, envVars: {}, code: `process.stdout.write('x'.repeat(${env.MAX_OUTPUT_BYTES * 2}))` });
    expect(result.status).toBe("failed"); expect(result.error).toContain("Output truncated");
    expect(Buffer.byteLength(result.output)).toBeLessThanOrEqual(env.MAX_OUTPUT_BYTES);
  }, 20_000);
});
