import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../src/security/crypto.js";

describe("crypto", () => {
  it("encrypts and decrypts a secret", () => {
    const secret = "super-secret-value";
    const encrypted = encryptSecret(secret);

    expect(encrypted.ciphertext).not.toBe(secret);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("fails to decrypt if auth tag is altered", () => {
    const encrypted = encryptSecret("value");
    const tampered = { ...encrypted, authTag: encrypted.authTag.slice(0, -2) + "ab" };

    expect(() => decryptSecret(tampered)).toThrow();
  });
});
