import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { cleanupRunTempDir, createRunTempDir } from "./tempDir.js";
import { sanitizeEnv } from "./sanitizeEnv.js";
import { limits } from "../security/limits.js";

export interface RunnerInput {
  runId: string;
  code: string;
  timeoutSeconds: number;
  envVars: Record<string, string>;
}

export interface RunnerResult {
  status: "succeeded" | "failed" | "timed_out" | "killed";
  output: string;
  error: string | null;
  exitCode: number | null;
  durationMs: number;
}

export async function executeNodeAutomation(input: RunnerInput): Promise<RunnerResult> {
  const startedAt = Date.now();
  const tempDir = await createRunTempDir(input.runId);
  const scriptPath = path.join(tempDir, "automation.js");

  try {
    await fs.writeFile(scriptPath, input.code, { encoding: "utf8" });

    const timeoutMs = Math.max(1, input.timeoutSeconds) * 1000;
    const child = spawn(process.execPath, ["--disallow-code-generation-from-strings", scriptPath], {
      cwd: tempDir,
      env: sanitizeEnv(input.envVars),
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      windowsHide: true
    });

    let output = "";
    let error = "";
    let totalBytes = 0;
    let truncated = false;
    let timedOut = false;
    let forceKilled = false;
    let exited = false;
    let spawnError: Error | null = null;

    const appendChunk = (chunk: Buffer, target: "output" | "error") => {
      if (truncated) {
        return;
      }

      totalBytes += chunk.byteLength;
      if (totalBytes > limits.maxOutputBytes) {
        truncated = true;
        const remaining = limits.maxOutputBytes - (totalBytes - chunk.byteLength);
        const safeChunk = remaining > 0 ? chunk.subarray(0, remaining) : Buffer.alloc(0);
        const text = safeChunk.toString("utf8");

        if (target === "output") {
          output += text;
          output += "\n[output truncated due to size limit]";
        } else {
          error += text;
          error += "\n[error truncated due to size limit]";
        }

        child.kill("SIGTERM");
        return;
      }

      if (target === "output") {
        output += chunk.toString("utf8");
      } else {
        error += chunk.toString("utf8");
      }
    };

    child.stdout.on("data", (chunk: Buffer) => appendChunk(chunk, "output"));
    child.stderr.on("data", (chunk: Buffer) => appendChunk(chunk, "error"));
    child.once("error", (error) => {
      spawnError = error;
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!exited) {
          forceKilled = true;
          child.kill("SIGKILL");
        }
      }, 2_000);
    }, timeoutMs);

    const result = await new Promise<RunnerResult>((resolve) => {
      child.once("close", (code, signal) => {
        exited = true;
        clearTimeout(timer);
        const durationMs = Date.now() - startedAt;

        if (timedOut) {
          resolve({
            status: "timed_out",
            output,
            error: error || "Execution timed out",
            exitCode: code,
            durationMs
          });
          return;
        }

        if (forceKilled || signal === "SIGKILL") {
          resolve({
            status: "killed",
            output,
            error: error || "Process force killed",
            exitCode: code,
            durationMs
          });
          return;
        }

        if (code === 0) {
          resolve({
            status: "succeeded",
            output,
            error: error || null,
            exitCode: 0,
            durationMs
          });
          return;
        }

        if (spawnError) {
          resolve({
            status: "failed",
            output,
            error: spawnError.message,
            exitCode: code,
            durationMs
          });
          return;
        }

        resolve({
          status: "failed",
          output,
          error: error || `Exited with code ${code ?? "unknown"}`,
          exitCode: code,
          durationMs
        });
      });
    });

    return result;
  } finally {
    await cleanupRunTempDir(tempDir);
  }
}

