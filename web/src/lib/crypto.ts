import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "crypto";

const SALT = process.env.ENCRYPTION_SALT || "ai-video-gen-upload-salt-2026";
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const ALGORITHM = "aes-256-gcm";

export function deriveKey(sessionToken: string): Buffer {
  return pbkdf2Sync(sessionToken, SALT, ITERATIONS, KEY_LENGTH, "sha256");
}

export function encrypt(plaintext: string, key: Buffer): { encrypted: string; iv: string; authTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decrypt(encrypted: string, key: Buffer, iv: string, authTag: string): string {
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
