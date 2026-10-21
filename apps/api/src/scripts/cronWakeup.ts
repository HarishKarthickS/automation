const origin = process.env.API_ORIGIN;
const token = process.env.INTERNAL_CRON_TOKEN;
if (!origin?.startsWith("https://") || !token) throw new Error("Configure HTTPS API_ORIGIN and INTERNAL_CRON_TOKEN");
const response = await fetch(new URL("/api/v1/internal/run-due-automations", origin), {
  method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(90_000)
});
if (!response.ok) throw new Error(`Scheduler wake-up returned HTTP ${response.status}`);
console.log("Scheduler wake-up accepted");
