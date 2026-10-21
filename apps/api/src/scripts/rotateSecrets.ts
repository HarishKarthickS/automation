import { asc, eq, gt } from "drizzle-orm";
import { db, pool, withTransaction } from "../db/client.js";
import { automationSecrets } from "../db/schema.js";
import { decryptSecret, encryptSecret } from "../security/crypto.js";
import { env } from "../config/env.js";

async function rotate() {
  let cursor: string | undefined;
  let count = 0;
  while (true) {
    const rows = await db.select({ id: automationSecrets.id }).from(automationSecrets)
      .where(cursor ? gt(automationSecrets.id, cursor) : undefined).orderBy(asc(automationSecrets.id)).limit(100);
    if (!rows.length) break;
    for (const item of rows) await withTransaction(async () => {
      const [row] = await db.select().from(automationSecrets).where(eq(automationSecrets.id, item.id)).for("update");
      if (!row || row.keyId === env.ENCRYPTION_KEY_ID) return;
      const encrypted = encryptSecret(decryptSecret(row));
      await db.update(automationSecrets).set({ ...encrypted, updatedAt: new Date() }).where(eq(automationSecrets.id, row.id));
      count++;
    });
    cursor = rows[rows.length - 1].id;
  }
  console.log(`Rotated ${count} secrets to key ${env.ENCRYPTION_KEY_ID}; plaintext was not logged.`);
}
rotate().catch(() => { console.error("Secret rotation failed; retain all old keys and retry."); process.exitCode = 1; }).finally(() => pool.end());
