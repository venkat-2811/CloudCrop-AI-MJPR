import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";

export interface AuthVendor {
  id: string;
  email: string;
  full_name: string;
}

const JWT_SECRET = process.env.JWT_SECRET;

export function signVendorJwt(vendor: AuthVendor) {
  if (!JWT_SECRET) throw new Error("Missing JWT_SECRET env var");
  return jwt.sign(vendor, JWT_SECRET, { expiresIn: "7d" });
}

export function getBearerToken(req: VercelRequest) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function requireVendor(req: VercelRequest, res: VercelResponse): AuthVendor | null {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "missing_token" });
      return null;
    }
    if (!JWT_SECRET) {
      res.status(500).json({ error: "missing_jwt_secret" });
      return null;
    }
    return jwt.verify(token, JWT_SECRET) as AuthVendor;
  } catch {
    res.status(401).json({ error: "invalid_token" });
    return null;
  }
}
