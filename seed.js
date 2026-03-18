import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Manual .env parser for standalone script
const loadEnv = () => {
  try {
    const envFile = fs.readFileSync('.env', 'utf-8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.replace(/\\n/gm, '\n');
        }
        value = value.replace(/(^['"]|['"]$)/g, '').trim();
        process.env[key] = value;
      }
    });
  } catch (err) {
    console.warn('.env file not found or couldn\'t be read');
  }
};

loadEnv();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl || dbUrl.includes('[YOUR-PASSWORD]')) {
  console.error("❌ Invalid or missing password in DATABASE_URL.");
  console.error("Please update your .env file with the actual Supabase password before running this script.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') ? undefined : { rejectUnauthorized: false }
});

const vendorsData = [
  { id: '10000000-0000-0000-0000-000000000001', name: 'Rakesh Trading Co', email: 'rakesh@example.com', loc: 'Pune, Maharashtra', phone: '9876543210' },
  { id: '10000000-0000-0000-0000-000000000002', name: 'Sanjay Agri Exports', email: 'sanjay@example.com', loc: 'Nashik, Maharashtra', phone: '9876543211' },
  { id: '10000000-0000-0000-0000-000000000003', name: 'Kisan Traders', email: 'kisan@example.com', loc: 'Amritsar, Punjab', phone: '9876543212' },
  { id: '10000000-0000-0000-0000-000000000004', name: 'Green Harvest Pvt Ltd', email: 'green@example.com', loc: 'Ludhiana, Punjab', phone: '9876543213' },
  { id: '10000000-0000-0000-0000-000000000005', name: 'Maha Farmers Cooperative', email: 'maha@example.com', loc: 'Nagpur, Maharashtra', phone: '9876543214' },
  { id: '10000000-0000-0000-0000-000000000006', name: 'Namma Bengaluru Mandi', email: 'namma@example.com', loc: 'Bengaluru, Karnataka', phone: '9876543215' },
  { id: '10000000-0000-0000-0000-000000000007', name: 'Kaveri Organics', email: 'kaveri@example.com', loc: 'Mysuru, Karnataka', phone: '9876543216' },
  { id: '10000000-0000-0000-0000-000000000008', name: 'Gujarat Agri Market', email: 'gujarat@example.com', loc: 'Ahmedabad, Gujarat', phone: '9876543217' },
  { id: '10000000-0000-0000-0000-000000000009', name: 'Surat Fresh produce', email: 'surat@example.com', loc: 'Surat, Gujarat', phone: '9876543218' },
  { id: '10000000-0000-0000-0000-000000000010', name: 'Indore Mandi Association', email: 'indore@example.com', loc: 'Indore, Madhya Pradesh', phone: '9876543219' },
];

const commodities = [
  'Wheat', 'Rice (Basmati)', 'Rice (Non-Basmati)', 'Tomato', 'Onion', 
  'Potato', 'Cotton', 'Sugarcane', 'Soybean', 'Maize', 'Mustard', 'Bajra',
  'Chickpea', 'Turmeric', 'Coriander'
];

async function seed() {
  console.log("🌱 Starting Database Seeding...");
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create tables if they don't exist (borrowed from _db.ts)
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

    // Insert Vendors
    console.log("Inserting Vendors...");
    const genericPassword = await bcrypt.hash('password123', 10);
    
    for (const v of vendorsData) {
      await client.query(`
        INSERT INTO vendors (id, email, password_hash, full_name, location, phone)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `, [v.id, v.email, genericPassword, v.name, v.loc, v.phone]);
    }

    // Insert 50-60 Market Prices
    console.log("Inserting Market Prices...");
    let priceCount = 0;
    
    for (let i = 0; i < 55; i++) {
        const vendor = vendorsData[Math.floor(Math.random() * vendorsData.length)];
        const commodity = commodities[Math.floor(Math.random() * commodities.length)];
        
        // Generate realistic prices per kg roughly (very random)
        let basePrice = 20;
        if (commodity.includes('Rice')) basePrice = 60;
        if (commodity === 'Wheat') basePrice = 30;
        if (commodity === 'Tomato') basePrice = 40;
        if (commodity === 'Cotton') basePrice = 120;
        if (commodity === 'Turmeric') basePrice = 150;
        
        const price = Math.round(basePrice * (0.8 + Math.random() * 0.4));
        const id = '20000000-0000-0000-0000-' + String(i).padStart(12, '0');
        
        await client.query(`
          INSERT INTO market_prices (id, commodity, price, unit, location, vendor_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [id, commodity, price, 'kg', vendor.loc, vendor.id]);
        
        priceCount++;
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully inserted ${vendorsData.length} vendors and ${priceCount} market prices.`);
    console.log(`🔑 Login for testing: Any vendor email (e.g. rakesh@example.com) with password: password123`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Seeding failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
