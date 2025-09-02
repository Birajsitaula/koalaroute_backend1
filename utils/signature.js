// utils/signature.js
import crypto from "crypto";

export const generateSignature = (apiToken, secret) => {
  return crypto
    .createHash("sha256")
    .update(apiToken + secret)
    .digest("hex");
};
