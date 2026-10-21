import "./setup-env.js";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db/client.js";
import { users, automations } from "../src/db/schema.js";
import { upsertSecret, getDecryptedSecretsMap } from "../src/services/secrets.service.js";
const id = "00000000-0000-4000-8000-000000000099";
try {
  if (process.argv[2] === "seed") {
    await db.insert(users).values({ id: "restore-fixture", name: "Restore fixture", email: "restore-fixture@example.invalid" });
    await db.insert(automations).values({ id, userId: "restore-fixture", name: "Restore fixture", code: "console.log(1)", cronExpr: "* * * * *", timezone: "UTC", nextRunAt: new Date() });
    await upsertSecret(id, { key: "RESTORE_PROBE", value: "synthetic-restore-value" });
  } else {
    const [a] = await db.select().from(automations).where(eq(automations.id, id));
    if (!a || (await getDecryptedSecretsMap(id)).RESTORE_PROBE !== "synthetic-restore-value") throw new Error("Restore verification failed");
    console.log("Restored automation and encrypted secret verified");
  }
} finally { await pool.end(); }
