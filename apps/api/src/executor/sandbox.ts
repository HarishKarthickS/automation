import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import type { RunnerInput, RunnerResult, RuntimeCommand } from "./runner.js";

export const SANDBOX_IMAGES: Record<string, string> = {
  nodejs20: "node:22-bookworm-slim@sha256:3ed98443660ff48413b5af19ecefce3b9d50845a901a43420d47cc63a9fddbe9", python312: "python:3.12-slim-bookworm@sha256:5d9e6adc9abd558bc0ce05f9ab16cef71328916fc9728f6b81e337af86a737e2", go122: "golang:1.22-bookworm@sha256:3d699e4d15d0f8f13c9195c0632a16702b8cbdece2955af1c23b37ae5d55a253",
  rust183: "rust:1.83-slim-bookworm@sha256:540c902e99c384163b688bbd8b5b8520e94e7731b27f7bd0eaa56ae1960627ab", java21: "eclipse-temurin:21-jdk-jammy@sha256:742daacb9316be4b6fc60258f6e4ac2a11882f6c597373c92290a57bfad0d2e0", cpp23: "gcc:14-bookworm@sha256:5e927c284bf55a7dc796262e311a0703344f62f41f5621eb56843111b1d37e15"
};
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export function sandboxCommand(input: RunnerInput, command: RuntimeCommand, hostDirectory: string) {
  if (command.steps.some((step) => step.kind === "install")) throw new Error("Install dependencies in the approved runtime image; network package installation is disabled in isolated jobs");
  const image = SANDBOX_IMAGES[input.runtime];
  const name = `automiq-${crypto.randomUUID()}`;
  const files = { [command.fileName]: input.code, ...command.additionalFiles };
  const script = ["set -eu", "cd /workspace", "umask 077",
    ...Object.entries(files).flatMap(([file, content]) => [
      `mkdir -p ${quote(`/workspace/${file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : "."}`)}`,
      `printf %s ${quote(Buffer.from(content).toString("base64"))} | base64 -d > ${quote(file)}`
    ]),
    ...command.steps.map((step) => [step.executable === process.execPath ? "node" : step.executable, ...step.args]
      .map((arg) => quote(arg.replaceAll(hostDirectory, "/workspace"))).join(" "))
  ].join("\n") + "\n";
  const args = ["run", "--rm", "--pull=never", "--name", name, "--label", "automiq.job=true", "--network=none",
    "--cpus=1", "--memory=512m", "--memory-swap=512m", "--pids-limit=64", "--read-only", "--cap-drop=ALL",
    "--security-opt=no-new-privileges", "--user=65534:65534", "--init", "--stop-timeout=1",
    "--tmpfs=/workspace:rw,exec,nosuid,size=134217728,mode=1777", "--tmpfs=/tmp:rw,noexec,nosuid,size=67108864,mode=1777",
    "--workdir=/workspace", "--env=HOME=/workspace", "--env=NODE_ENV=production", "--env=GOCACHE=/workspace/go-cache", "--env=GOPATH=/workspace/go", "--env=GOTMPDIR=/workspace", "--env=GOFLAGS=-p=2", "--env=GOMAXPROCS=2", "--env=CARGO_HOME=/workspace/cargo",
    ...Object.keys(input.envVars).map((key) => `--env=${key}`), "-i", image,
    "timeout", "--signal=TERM", "--kill-after=2", `${Math.max(1, input.timeoutSeconds)}s`, "sh", "-s"];
  return { name, args, script };
}

export async function executeIsolated(input: RunnerInput, command: RuntimeCommand, hostDirectory: string): Promise<RunnerResult> {
  const started = Date.now();
  const { name, args, script } = sandboxCommand(input, command, hostDirectory);
  let output = "", error = "", bytes = 0, limited = false, timedOut = false, aborted = false;
  return new Promise((resolve) => {
    const child = spawn("docker", args, { env: { ...process.env, ...input.envVars }, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let cleanupRequested = false;
    const remove = () => {
      if (cleanupRequested) return;
      cleanupRequested = true;
      const cleanup = spawn("docker", ["rm", "--force", name], { stdio: "ignore", windowsHide: true });
      cleanup.on("error", () => {});
      const kill = setTimeout(() => { cleanup.kill(); child.kill("SIGKILL"); }, 5000); kill.unref();
      cleanup.once("close", () => { clearTimeout(kill); child.kill("SIGKILL"); });
    };
    const append = (chunk: Buffer, stderr: boolean) => {
      const retained = chunk.subarray(0, Math.max(0, env.MAX_OUTPUT_BYTES - bytes)).toString("utf8");
      if (stderr) error += retained; else output += retained;
      bytes += chunk.byteLength;
      if (bytes > env.MAX_OUTPUT_BYTES) { limited = true; remove(); }
    };
    child.stdout.on("data", (chunk: Buffer) => append(chunk, false));
    child.stderr.on("data", (chunk: Buffer) => append(chunk, true));
    child.stdin.on("error", () => {});
    child.stdin.end(script);
    const abort = () => { aborted = true; remove(); };
    input.signal?.addEventListener("abort", abort, { once: true });
    if (input.signal?.aborted) abort();
    const timer = setTimeout(() => { timedOut = true; remove(); }, input.timeoutSeconds * 1000 + 3000);
    let spawnError: Error | undefined;
    child.once("error", (failure) => { spawnError = failure; });
    child.once("close", (code) => {
      clearTimeout(timer); input.signal?.removeEventListener("abort", abort);
      const timeout = timedOut || code === 124 || (code === 137 && Date.now() - started >= input.timeoutSeconds * 1000);
      resolve({ status: aborted ? "killed" : limited ? "failed" : timeout ? "timed_out" : code === 137 ? "killed" : spawnError || code !== 0 ? "failed" : "succeeded",
        output, error: aborted ? "Execution cancelled" : limited ? "Output truncated due to size limit" : timeout ? "Execution timed out" : spawnError?.message ?? (error || (code === 0 ? null : `Exited with code ${code}`)), exitCode: code, durationMs: Date.now() - started });
    });
  });
}
