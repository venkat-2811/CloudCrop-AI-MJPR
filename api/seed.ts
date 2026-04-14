import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { pool, ensureSchema } from "./_db.js";

/**
 * GET /api/seed?secret=<JWT_SECRET>
 *
 * Idempotent database initializer:
 *   1. Creates tables (vendors, market_prices) via ensureSchema()
 *   2. Inserts demo vendors and market prices (ON CONFLICT DO NOTHING)
 *
 * Protected by a secret query-param that must match JWT_SECRET.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET and POST
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const secret = (req.query.secret as string) || "";
  const JWT_SECRET = process.env.JWT_SECRET || "";

  if (!secret || secret !== JWT_SECRET) {
    res.status(403).json({ error: "forbidden", hint: "Pass ?secret=<JWT_SECRET>" });
    return;
  }

  if (!process.env.DATABASE_URL) {
    res.status(500).json({ error: "missing_database_url" });
    return;
  }

  try {
    // 1. Create tables
    await ensureSchema();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 2. Insert demo vendors
      const genericPassword = await bcrypt.hash("password123", 10);

      const vendors = [
        { id: "10000000-0000-0000-0000-000000000001", name: "Rakesh Trading Co", email: "rakesh@example.com", loc: "Pune, Maharashtra", phone: "9876543210" },
        { id: "10000000-0000-0000-0000-000000000002", name: "Sanjay Agri Exports", email: "sanjay@example.com", loc: "Nashik, Maharashtra", phone: "9876543211" },
        { id: "10000000-0000-0000-0000-000000000003", name: "Kisan Traders", email: "kisan@example.com", loc: "Amritsar, Punjab", phone: "9876543212" },
        { id: "10000000-0000-0000-0000-000000000004", name: "Green Harvest Pvt Ltd", email: "green@example.com", loc: "Ludhiana, Punjab", phone: "9876543213" },
        { id: "10000000-0000-0000-0000-000000000005", name: "Maha Farmers Cooperative", email: "maha@example.com", loc: "Nagpur, Maharashtra", phone: "9876543214" },
        { id: "10000000-0000-0000-0000-000000000006", name: "Namma Bengaluru Mandi", email: "namma@example.com", loc: "Bengaluru, Karnataka", phone: "9876543215" },
        { id: "10000000-0000-0000-0000-000000000007", name: "Kaveri Organics", email: "kaveri@example.com", loc: "Mysuru, Karnataka", phone: "9876543216" },
        { id: "10000000-0000-0000-0000-000000000008", name: "Gujarat Agri Market", email: "gujarat@example.com", loc: "Ahmedabad, Gujarat", phone: "9876543217" },
        { id: "10000000-0000-0000-0000-000000000009", name: "Surat Fresh Produce", email: "surat@example.com", loc: "Surat, Gujarat", phone: "9876543218" },
        { id: "10000000-0000-0000-0000-000000000010", name: "Indore Mandi Association", email: "indore@example.com", loc: "Indore, Madhya Pradesh", phone: "9876543219" },
      ];

      let vendorCount = 0;
      for (const v of vendors) {
        const result = await client.query(
          `INSERT INTO vendors (id, email, password_hash, full_name, location, phone)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (email) DO NOTHING`,
          [v.id, v.email, genericPassword, v.name, v.loc, v.phone]
        );
        if (result.rowCount && result.rowCount > 0) vendorCount++;
      }

      // 3. Insert market prices
      const commodities = [
        { name: "Wheat", base: 30 },
        { name: "Rice (Basmati)", base: 65 },
        { name: "Rice (Non-Basmati)", base: 45 },
        { name: "Tomato", base: 40 },
        { name: "Onion", base: 35 },
        { name: "Potato", base: 25 },
        { name: "Cotton", base: 120 },
        { name: "Sugarcane", base: 35 },
        { name: "Soybean", base: 55 },
        { name: "Maize", base: 22 },
        { name: "Mustard", base: 60 },
        { name: "Bajra", base: 28 },
        { name: "Chickpea", base: 70 },
        { name: "Turmeric", base: 150 },
        { name: "Coriander", base: 90 },
      ];

      // Deterministic pseudo-random using index
      let priceCount = 0;
      for (let i = 0; i < 55; i++) {
        const vendor = vendors[i % vendors.length];
        const commodity = commodities[i % commodities.length];
        const variation = 0.8 + ((i * 7 + 3) % 40) / 100; // deterministic 0.80–1.19
        const price = Math.round(commodity.base * variation);
        const id = "20000000-0000-0000-0000-" + String(i).padStart(12, "0");

        const result = await client.query(
          `INSERT INTO market_prices (id, commodity, price, unit, location, vendor_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [id, commodity.name, price, "kg", vendor.loc, vendor.id]
        );
        if (result.rowCount && result.rowCount > 0) priceCount++;
      }

      await client.query("COMMIT");

      res.status(200).json({
        ok: true,
        vendors_inserted: vendorCount,
        prices_inserted: priceCount,
        message: `Database seeded successfully. ${vendorCount} vendors, ${priceCount} market prices created.`,
        login_hint: "Use any vendor email (e.g. rakesh@example.com) with password: password123",
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("Seed error:", e);
    res.status(500).json({ error: "seed_failed", details: e?.message || String(e) });
  }
}
