import mysql from "mysql2/promise";

const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_SSL,
} = process.env;

const port = MYSQL_PORT ? Number(MYSQL_PORT) : 3306;

if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
  console.warn(
    "Missing MySQL env vars. Set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE (and optionally MYSQL_PORT, MYSQL_SSL)."
  );
}

export const pool = mysql.createPool({
  host: MYSQL_HOST,
  port,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: MYSQL_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

export async function ensureSchema() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS market_prices (
        id VARCHAR(36) PRIMARY KEY,
        commodity VARCHAR(255) NOT NULL,
        price DOUBLE NOT NULL,
        unit VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        vendor_id VARCHAR(36) NULL,
        INDEX idx_market_prices_vendor (vendor_id),
        INDEX idx_market_prices_commodity (commodity),
        INDEX idx_market_prices_location (location)
      )
    `);
  } finally {
    conn.release();
  }
}
