import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { RuntimeId } from "@automation/shared";
import { cleanupRunTempDir, createRunTempDir } from "./tempDir.js";
import { sanitizeEnv } from "./sanitizeEnv.js";
import { limits } from "../security/limits.js";

export interface RunnerInput {
  runId: string;
  runtime: RuntimeId;
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

interface RuntimeCommand {
  fileName: string;
  additionalFiles?: Record<string, string>;
  steps: Array<{
    kind: "install" | "build" | "run";
    executable: string;
    args: string[];
  }>;
}

function step(kind: "install" | "build" | "run", executable: string, args: string[]): RuntimeCommand["steps"][number] {
  return { kind, executable, args };
}

function getRuntimeCommand(runtime: RuntimeId, tempDir: string, code: string): RuntimeCommand {
  const dependencies = parseDependencies(runtime, code);
  assertDependenciesAllowed(runtime, dependencies);
  switch (runtime) {
    case "nodejs20":
      return {
        fileName: "automation.js",
        steps: [
          step("run", process.execPath, ["--disallow-code-generation-from-strings", path.join(tempDir, "automation.js")])
        ]
      };
    case "python312":
      return {
        fileName: "automation.py",
        steps: [
          ...(dependencies.length > 0
            ? [
                {
                  ...step("install", "python", [
                    "-m",
                    "pip",
                    "install",
                    "--disable-pip-version-check",
                    "--no-input",
                    ...dependencies
                  ])
                }
              ]
            : []),
          step("run", "python", [path.join(tempDir, "automation.py")])
        ]
      };
    case "go122":
      return {
        fileName: "main.go",
        steps: [
          ...(dependencies.length > 0
            ? [
                {
                  ...step("install", "go", ["mod", "init", "automation"])
                },
                {
                  ...step("install", "go", ["get", ...dependencies])
                }
              ]
            : []),
          step("run", "go", ["run", path.join(tempDir, "main.go")])
        ]
      };
    case "rust183":
      if (dependencies.length > 0) {
        return {
          fileName: "src/main.rs",
          additionalFiles: {
            "Cargo.toml": buildRustCargoToml(dependencies)
          },
          steps: [
            step("install", "cargo", ["fetch"]),
            step("run", "cargo", ["run", "--release", "--quiet"])
          ]
        };
      }
      return {
        fileName: "main.rs",
        steps: [
          step("build", "rustc", [path.join(tempDir, "main.rs"), "--edition=2021", "-O", "-o", path.join(tempDir, "automation.exe")]),
          step("run", path.join(tempDir, "automation.exe"), [])
        ]
      };
    case "java21":
      return {
        fileName: "Main.java",
        steps: [
          step("build", "javac", [path.join(tempDir, "Main.java")]),
          step("run", "java", ["-cp", tempDir, "Main"])
        ]
      };
    case "cpp23":
      return {
        fileName: "main.cpp",
        steps: [
          step("build", "g++", ["-std=c++23", path.join(tempDir, "main.cpp"), "-O2", "-o", path.join(tempDir, "automation_cpp.exe")]),
          step("run", path.join(tempDir, "automation_cpp.exe"), [])
        ]
      };
    default:
      throw new Error(`Unsupported runtime: ${runtime}`);
  }
}

function dependencyName(runtime: RuntimeId, rawDependency: string): string {
  if (runtime === "python312") {
    return rawDependency.split(/[<>=!~]/)[0]!.trim().toLowerCase();
  }

  if (runtime === "go122") {
    return rawDependency.split("@")[0]!.trim().toLowerCase();
  }

  if (runtime === "rust183") {
    return rawDependency.split("=")[0]!.trim().toLowerCase();
  }

  return rawDependency.trim().toLowerCase();
}

function assertDependenciesAllowed(runtime: RuntimeId, dependencies: string[]) {
  if (dependencies.length === 0) {
    return;
  }

  if (runtime !== "python312" && runtime !== "go122" && runtime !== "rust183") {
    throw new Error(`Dependencies are not supported for runtime '${runtime}'`);
  }

  if (dependencies.length > limits.dependencyMaxCount) {
    throw new Error(`Too many dependencies. Max allowed is ${limits.dependencyMaxCount}`);
  }

  const totalChars = dependencies.reduce((sum, dep) => sum + dep.length, 0);
  if (totalChars > limits.dependencyMaxTotalChars) {
    throw new Error(`Dependency declaration too large. Max allowed chars is ${limits.dependencyMaxTotalChars}`);
  }

  if (limits.dependencyAllowlistMode === "relaxed") {
    return;
  }

  const configuredAllowlist =
    runtime === "python312"
      ? limits.pythonAllowedPackages
      : runtime === "go122"
        ? limits.goAllowedModules
        : limits.rustAllowedCrates;

  if (configuredAllowlist.length === 0) {
    throw new Error(`Dependency allowlist is strict, but no allowlist configured for runtime '${runtime}'`);
  }

  const allowed = new Set(configuredAllowlist.map((entry) => entry.toLowerCase()));
  for (const dep of dependencies) {
    const name = dependencyName(runtime, dep);
    if (!allowed.has(name)) {
      throw new Error(`Dependency '${name}' is not allowed for runtime '${runtime}'`);
    }
  }
}

function parseDependencies(runtime: RuntimeId, code: string): string[] {
  const lines = code.split(/\r?\n/);
  for (const line of lines.slice(0, 8)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const marker = runtime === "python312" ? "#" : "//";
    if (!trimmed.startsWith(marker)) {
      break;
    }
    const content = trimmed.slice(marker.length).trim();
    const match = content.match(/^(deps|dependencies)\s*:\s*(.+)$/i);
    if (!match) {
      continue;
    }
    return match[2]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function buildRustCargoToml(dependencies: string[]): string {
  return [
    "[package]",
    "name = \"automation\"",
    "version = \"0.1.0\"",
    "edition = \"2021\"",
    "",
    "[dependencies]",
    ...dependencies.map((entry) => {
      if (entry.includes("=")) {
        const [name, version] = entry.split("=");
        return `${name.trim()} = \"${version.trim()}\"`;
      }
      return `${entry.trim()} = \"*\"`;
    }),
    ""
  ].join("\n");
}

export async function executeAutomation(input: RunnerInput): Promise<RunnerResult> {
  const startedAt = Date.now();
  const tempDir = await createRunTempDir(input.runId);

  try {
    if (!limits.enabledRuntimes.includes(input.runtime)) {
      return {
        status: "failed",
        output: "",
        error: `Runtime '${input.runtime}' is disabled`,
        exitCode: null,
        durationMs: Date.now() - startedAt
      };
    }

    let runtimeCommand: RuntimeCommand;
    try {
      runtimeCommand = getRuntimeCommand(input.runtime, tempDir, input.code);
    } catch (error) {
      return {
        status: "failed",
        output: "",
        error: (error as Error).message,
        exitCode: null,
        durationMs: Date.now() - startedAt
      };
    }
    const scriptPath = path.join(tempDir, runtimeCommand.fileName);
    await fs.mkdir(path.dirname(scriptPath), { recursive: true });
    await fs.writeFile(scriptPath, input.code, { encoding: "utf8" });
    if (runtimeCommand.additionalFiles) {
      for (const [relativePath, content] of Object.entries(runtimeCommand.additionalFiles)) {
        const target = path.join(tempDir, relativePath);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content, { encoding: "utf8" });
      }
    }

    const timeoutMs = Math.max(1, input.timeoutSeconds) * 1000;
    const env = sanitizeEnv(input.envVars);

    let output = "";
    let error = "";
    let totalBytes = 0;

    const appendChunk = (chunk: Buffer, target: "output" | "error") => {
      totalBytes += chunk.byteLength;
      if (totalBytes > limits.maxOutputBytes) {
        const remaining = limits.maxOutputBytes - (totalBytes - chunk.byteLength);
        const safeChunk = remaining > 0 ? chunk.subarray(0, remaining) : Buffer.alloc(0);
        const text = safeChunk.toString("utf8");

        if (target === "output") {
          output += text;
        } else {
          error += text;
        }
        throw new Error("output_limit_reached");
      }

      if (target === "output") {
        output += chunk.toString("utf8");
      } else {
        error += chunk.toString("utf8");
      }
    };

    let lastExitCode: number | null = null;
    for (const step of runtimeCommand.steps) {
      const elapsed = Date.now() - startedAt;
      const remainingMs = timeoutMs - elapsed;
      const stepTimeoutMs =
        step.kind === "install"
          ? Math.min(remainingMs, limits.dependencyInstallTimeoutSeconds * 1000)
          : remainingMs;
      if (stepTimeoutMs <= 0) {
        return {
          status: "timed_out",
          output,
          error: error || "Execution timed out",
          exitCode: lastExitCode,
          durationMs: Date.now() - startedAt
        };
      }

      const stepResult = await executeStep({
        executable: step.executable,
        args: step.args,
        cwd: tempDir,
        env,
        timeoutMs: stepTimeoutMs,
        appendChunk
      });
      lastExitCode = stepResult.exitCode;

      if (stepResult.status !== "succeeded") {
        return {
          status: stepResult.status,
          output:
            stepResult.outputLimited || totalBytes > limits.maxOutputBytes
              ? `${output}\n[output truncated due to size limit]`
              : output,
          error:
            stepResult.error ||
            (stepResult.outputLimited ? "Output truncated due to size limit" : `Exited with code ${stepResult.exitCode}`),
          exitCode: stepResult.exitCode,
          durationMs: Date.now() - startedAt
        };
      }
    }

    return {
      status: "succeeded",
      output: totalBytes > limits.maxOutputBytes ? `${output}\n[output truncated due to size limit]` : output,
      error: error || null,
      exitCode: lastExitCode ?? 0,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      status: "failed",
      output: "",
      error: (error as Error).message,
      exitCode: null,
      durationMs: Date.now() - startedAt
    };
  } finally {
    await cleanupRunTempDir(tempDir);
  }
}

async function executeStep(input: {
  executable: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  appendChunk: (chunk: Buffer, target: "output" | "error") => void;
}): Promise<{
  status: "succeeded" | "failed" | "timed_out" | "killed";
  error: string | null;
  exitCode: number | null;
  outputLimited: boolean;
}> {
  const child = spawn(input.executable, input.args, {
    cwd: input.cwd,
    env: input.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
    windowsHide: true
  });

  let timedOut = false;
  let forceKilled = false;
  let exited = false;
  let spawnError: Error | null = null;
  let outputLimited = false;

  child.stdout.on("data", (chunk: Buffer) => {
    try {
      input.appendChunk(chunk, "output");
    } catch (error) {
      if ((error as Error).message === "output_limit_reached") {
        outputLimited = true;
        child.kill("SIGTERM");
      }
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    try {
      input.appendChunk(chunk, "error");
    } catch (error) {
      if ((error as Error).message === "output_limit_reached") {
        outputLimited = true;
        child.kill("SIGTERM");
      }
    }
  });

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
  }, input.timeoutMs);

  return new Promise((resolve) => {
    child.once("close", (code, signal) => {
      exited = true;
      clearTimeout(timer);

      if (timedOut) {
        resolve({
          status: "timed_out",
          error: "Execution timed out",
          exitCode: code,
          outputLimited
        });
        return;
      }

      if (forceKilled || signal === "SIGKILL") {
        resolve({
          status: "killed",
          error: "Process force killed",
          exitCode: code,
          outputLimited
        });
        return;
      }

      if (spawnError) {
        resolve({
          status: "failed",
          error: spawnError.message,
          exitCode: code,
          outputLimited
        });
        return;
      }

      if (outputLimited) {
        resolve({
          status: "failed",
          error: "Output truncated due to size limit",
          exitCode: code,
          outputLimited
        });
        return;
      }

      resolve({
        status: code === 0 ? "succeeded" : "failed",
        error: code === 0 ? null : `Exited with code ${code ?? "unknown"}`,
        exitCode: code,
        outputLimited
      });
    });
  });
}

export async function executeNodeAutomation(input: Omit<RunnerInput, "runtime">): Promise<RunnerResult> {
  return executeAutomation({
    ...input,
    runtime: "nodejs20"
  });
}

