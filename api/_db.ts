import { Pool } from "pg";

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.warn("Missing DATABASE_URL env var for Supabase Postgres.");
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

export async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS market_prices (
        id VARCHAR(36) PRIMARY KEY,
        commodity VARCHAR(255) NOT NULL,
        price DOUBLE PRECISION NOT NULL,
        unit VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        vendor_id VARCHAR(36)
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_market_prices_vendor ON market_prices (vendor_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_market_prices_commodity ON market_prices (commodity)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_market_prices_location ON market_prices (location)`);
  } finally {
    client.release();
  }
}
