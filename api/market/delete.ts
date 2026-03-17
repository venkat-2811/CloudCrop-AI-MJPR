import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pool, ensureSchema } from "../_db";
import { requireVendor } from "../_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const vendor = requireVendor(req, res);
  if (!vendor) return;

  const { commodity } = req.body || {};
  if (!commodity) {
    res.status(400).json({ error: "missing_fields" });
    return;
  }

  await ensureSchema();

  try {
    await pool.query(
      "DELETE FROM market_prices WHERE vendor_id = ? AND commodity = ?",
      [vendor.id, commodity]
    );
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Delete market price error:", e);
    res.status(500).json({ error: "server_error" });
  }
}
