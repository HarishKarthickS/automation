const BASE_ALLOWLIST = ["PATH", "HOME", "TMP", "TEMP", "TZ", "LANG"] as const;

export function sanitizeEnv(secretEnv: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};

  for (const key of BASE_ALLOWLIST) {
    const value = process.env[key];
    if (typeof value === "string") {
      env[key] = value;
    }
  }

  env.NODE_ENV = "production";

  for (const [key, value] of Object.entries(secretEnv)) {
    env[key] = value;
  }

  return env;
}

