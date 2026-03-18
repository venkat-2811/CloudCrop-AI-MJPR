import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { pool, ensureSchema } from "../_db.js";
import { requireVendor } from "../_auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const vendor = requireVendor(req, res);
  if (!vendor) return;

  const { commodity, price, unit, location, active } = req.body || {};
  if (!commodity || price === undefined || price === null || !unit || !location) {
    res.status(400).json({ error: "missing_fields" });
    return;
  }

  await ensureSchema();

  const id = randomUUID();

  try {
    await pool.query(
      "INSERT INTO market_prices (id, commodity, price, unit, location, active, vendor_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, commodity, Number(price), unit, location, active === false ? false : true, vendor.id]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    console.error("Add market price error:", e);
    res.status(500).json({ error: "server_error" });
  }
}
