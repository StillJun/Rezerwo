import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET must be set in environment — server cannot start without it");
const SECRET = process.env.JWT_SECRET;
const isProd = process.env.NODE_ENV === "production";
const COOKIE = "rz_session";

export const hashPassword = (p) => bcrypt.hash(p, 10);
export const verifyPassword = (p, h) => bcrypt.compare(p, h);
export const signToken = (u) => jwt.sign({ id: Number(u.id), email: u.email }, SECRET, { expiresIn: "7d" });

export function setAuthCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true, secure: isProd, sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
export const clearAuthCookie = (res) =>
  res.clearCookie(COOKIE, { httpOnly: true, secure: isProd, sameSite: isProd ? "none" : "lax" });

export function requireAuth(req, res, next) {
  const fromCookie = req.cookies?.[COOKIE];
  const h = req.headers.authorization || "";
  const token = fromCookie || (h.startsWith("Bearer ") ? h.slice(7) : null);
  if (!token) return res.status(401).json({ error: "Not authorized" });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: "Session expired" }); }
}
