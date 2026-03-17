import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pool, ensureSchema } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  await ensureSchema();

  try {
    const [rows] = await pool.query<any[]>(
      "SELECT DISTINCT location FROM vendors WHERE location IS NOT NULL AND location <> '' ORDER BY location ASC"
    );
    res
      .status(200)
      .json({ locations: (rows || []).map((r: { location?: string }) => r.location).filter(Boolean) });
  } catch (e) {
    console.error("Vendor locations error:", e);
    res.status(500).json({ error: "server_error" });
  }
}
