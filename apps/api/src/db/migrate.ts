import { pool } from "./client.js";
import { migrateDatabase } from "./readiness.js";
migrateDatabase().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
