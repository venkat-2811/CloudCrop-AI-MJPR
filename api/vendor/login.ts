import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { pool, ensureSchema } from "../_db.js";
import { signVendorJwt } from "../_auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: "missing_fields" });
    return;
  }

  await ensureSchema();

  try {
    const result = await pool.query<any>(
      "SELECT id, email, password_hash, full_name FROM vendors WHERE email = $1 LIMIT 1",
      [String(email).toLowerCase()]
    );

    const vendor = result.rows?.[0];
    if (!vendor) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }

    const ok = await bcrypt.compare(password, vendor.password_hash);
    if (!ok) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }

    const token = signVendorJwt({ id: vendor.id, email: vendor.email, full_name: vendor.full_name });
    res.status(200).json({ token, vendor: { id: vendor.id, email: vendor.email, full_name: vendor.full_name } });
  } catch (e) {
    console.error("Vendor login error:", e);
    res.status(500).json({ error: "server_error" });
  }
}
