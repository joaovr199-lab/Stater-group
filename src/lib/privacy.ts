import { createHash } from "node:crypto";
export { NOTICE_VERSION, CONSENT_PRIVACY, CONSENT_CONTACT } from "./privacy-text";
export const textHash = (s: string) => createHash("sha256").update(s).digest("hex");
