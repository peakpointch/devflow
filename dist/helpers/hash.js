import { createHash } from "crypto";
function generateIntegrityHash(content) {
  const hash = createHash("sha384").update(content).digest("base64");
  return `sha384-${hash}`;
}
export {
  generateIntegrityHash
};
