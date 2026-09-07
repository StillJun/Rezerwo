/* Shared client-side input checks. Mirrors the backend regex in server.js
   so the client sees the problem before the request is sent. */

export const isEmail = (v: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Polish mobile numbers are 9 digits; allow +48 / spaces / dashes / parens. */
export const isPhone = (v: string): boolean => {
  const digits = v.replace(/[^\d]/g, "");
  return digits.length >= 9 && digits.length <= 15;
};
