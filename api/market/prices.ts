import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pool, ensureSchema } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  await ensureSchema();

  const commodity = typeof req.query.commodity === "string" ? req.query.commodity : "";
  const location = typeof req.query.location === "string" ? req.query.location : "";

  try {
    const params: any[] = [];
    const where: string[] = ["mp.active = TRUE"]; 

    if (commodity) {
      where.push("mp.commodity LIKE ?");
      params.push(`%${commodity}%`);
    }
    if (location) {
      where.push("mp.location LIKE ?");
      params.push(`%${location}%`);
    }

    const sql = `
      SELECT 
        mp.id,
        mp.commodity,
        mp.price,
        mp.unit,
        mp.location,
        mp.active,
        mp.created_at,
        mp.vendor_id,
        v.full_name AS vendor_name,
        v.phone AS vendor_contact
      FROM market_prices mp
      LEFT JOIN vendors v ON v.id = mp.vendor_id
      WHERE ${where.join(" AND ")}
      ORDER BY mp.created_at DESC
      LIMIT 500
    `;

    const [rows] = await pool.query<any[]>(sql, params);
    res.status(200).json({ prices: rows || [] });
  } catch (e) {
    console.error("Market prices error:", e);
    res.status(500).json({ error: "server_error" });
  }
}
