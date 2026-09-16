import crypto from "crypto";
export const id = (prefix = "id") => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
