import { randomBytes } from "crypto";

export function generatePrivateSlug(prefix = "trip") {
  return `${prefix}-${randomBytes(9).toString("base64url").toLowerCase()}`;
}
