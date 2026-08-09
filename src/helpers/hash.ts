import { createHash } from "crypto";

/**
 * Generates a SHA-384 SRI integrity hash.
 * @param content The string or Buffer content of your script/file.
 * @returns The integrity string (e.g., "sha384-xxxx...")
 */
export function generateIntegrityHash(content: string | Buffer): string {
  const hash = createHash("sha384").update(content).digest("base64"); // Must be base64 for SRI

  return `sha384-${hash}`;
}
