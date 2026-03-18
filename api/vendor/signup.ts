import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { pool, ensureSchema } from "../_db.js";
import { signVendorJwt } from "../_auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { email, password, fullName, location, phoneNumber } = req.body || {};

  if (!email || !password || !fullName || !location) {
    res.status(400).json({ error: "missing_fields" });
    return;
  }

  await ensureSchema();

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO vendors (id, email, password_hash, full_name, location, phone) VALUES ($1, $2, $3, $4, $5, $6)",
      [id, String(email).toLowerCase(), passwordHash, fullName, location, phoneNumber || null]
    );

    const token = signVendorJwt({ id, email: String(email).toLowerCase(), full_name: fullName });
    res.status(201).json({ token, vendor: { id, email: String(email).toLowerCase(), full_name: fullName } });
  } catch (e: any) {
    const code = String(e?.code || "");
    const msg = String(e?.message || "");
    if (code === "23505" || msg.toLowerCase().includes("unique")) {
      res.status(409).json({ error: "email_exists" });
      return;
    }
    console.error("Vendor signup error:", e);
    res.status(500).json({ error: "server_error" });
  }
}
