import crypto from "node:crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(id = env.ENCRYPTION_KEY_ID): Buffer {
  const keyring = JSON.parse(env.ENCRYPTION_KEYRING) as Record<string, string>;
  const encoded = id === "legacy" ? env.MASTER_ENCRYPTION_KEY : keyring[id];
  if (!encoded) throw new Error(`Unknown encryption key ID: ${id}`);
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("MASTER_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return key;
}

export interface EncryptedPayload {
  keyId?: string;
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptSecret(value: string): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    keyId: env.ENCRYPTION_KEY_ID,
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const key = getKey(payload.keyId ?? "legacy");
  const iv = Buffer.from(payload.iv, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}

