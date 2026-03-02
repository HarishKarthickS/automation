import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

export async function createRunTempDir(runId: string): Promise<string> {
  const suffix = crypto.randomBytes(8).toString("hex");
  const root = path.join(os.tmpdir(), "automation-runner");
  await fs.mkdir(root, { recursive: true });
  return fs.mkdtemp(path.join(root, `${runId}-${suffix}-`));
}

export async function cleanupRunTempDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

