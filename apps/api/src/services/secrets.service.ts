import { and, eq } from "drizzle-orm";
import type { SecretUpsertInput } from "@automation/shared";
import { db } from "../db/client.js";
import { automationSecrets } from "../db/schema.js";
import { decryptSecret, encryptSecret } from "../security/crypto.js";

export async function upsertSecret(automationId: string, input: SecretUpsertInput) {
  const encrypted = encryptSecret(input.value);

  const [saved] = await db.insert(automationSecrets).values({ automationId, key: input.key, ...encrypted })
    .onConflictDoUpdate({ target: [automationSecrets.automationId, automationSecrets.key], set: { ...encrypted, updatedAt: new Date() } })
    .returning({ id: automationSecrets.id, key: automationSecrets.key, createdAt: automationSecrets.createdAt, updatedAt: automationSecrets.updatedAt });
  return saved;
}

export async function listSecretKeys(automationId: string) {
  return db
    .select({
      id: automationSecrets.id,
      key: automationSecrets.key,
      createdAt: automationSecrets.createdAt,
      updatedAt: automationSecrets.updatedAt
    })
    .from(automationSecrets)
    .where(eq(automationSecrets.automationId, automationId));
}

export async function deleteSecret(automationId: string, key: string) {
  await db
    .delete(automationSecrets)
    .where(and(eq(automationSecrets.automationId, automationId), eq(automationSecrets.key, key)));
}

export async function getDecryptedSecretsMap(automationId: string): Promise<Record<string, string>> {
  const rows = await db.select().from(automationSecrets).where(eq(automationSecrets.automationId, automationId));

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = decryptSecret({
      keyId: row.keyId,
      ciphertext: row.ciphertext,
      iv: row.iv,
      authTag: row.authTag
    });
  }

  return map;
}

