import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../config/env.js";
import { RUNTIME_LABELS, type RuntimeId } from "@automation/shared";
import { SANDBOX_IMAGES } from "./sandbox.js";
const exec = promisify(execFile);
let cached: { at: number; items: Array<{ id: RuntimeId; label: string; version: string; image?: string }> } | undefined;
export async function runtimeCapabilities(force = false) {
  if (!force && cached && Date.now() - cached.at < 30_000) return cached.items;
  const probes: Record<RuntimeId, [string, string[]]> = { nodejs20: [process.execPath, ["--version"]], python312: ["python", ["--version"]], cpp23: ["g++", ["--version"]], java21: ["java", ["-version"]], go122: ["go", ["version"]], rust183: ["rustc", ["--version"]] };
  const items = [] as NonNullable<typeof cached>["items"];
  if (env.executionMode !== "disabled") await Promise.all(env.enabledRuntimes.map(async (id) => {
    try {
      const [executable, args] = probes[id];
      const result = env.executionMode === "docker"
        ? await exec("docker", ["run", "--rm", "--pull=never", "--network=none", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--user=65534:65534", "--pids-limit=32", "--cpus=0.5", "--memory=256m", SANDBOX_IMAGES[id], executable === process.execPath ? "node" : executable, ...args], { timeout: 10_000, maxBuffer: 8192, windowsHide: true })
        : await exec(executable, args, { timeout: 3000, maxBuffer: 8192, windowsHide: true });
      items.push({ id, label: RUNTIME_LABELS[id], version: (result.stdout || result.stderr).split(/\r?\n/)[0], ...(env.executionMode === "docker" ? { image: SANDBOX_IMAGES[id] } : {}) });
    } catch { /* Missing toolchains are unavailable, never advertised as ready. */ }
  }));
  cached = { at: Date.now(), items };
  return items;
}
