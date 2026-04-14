import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const DATABASE_URL = process.env.DATABASE_URL;

// ---------- DB ----------
let pool = null;
let dbAvailable = false;
const memoryVendors = []; // in-memory fallback when DB is unreachable

if (DATABASE_URL) {
  pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

async function ensureSchema() {
  if (!pool) return;
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
        business_name VARCHAR(255),
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
    dbAvailable = true;
  } finally {
    client.release();
  }
}

ensureSchema().catch(e => {
  console.warn('DB unavailable, using in-memory fallback:', e.message);
  dbAvailable = false;
});

// ---------- GROQ Proxy ----------
app.post('/api/groq', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Missing GROQ_API_KEY' });
  }

  const { messages, options = {} } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model || 'llama-3.3-70b-versatile',
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 2048,
        top_p: options.topP ?? 0.9,
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error('GROQ upstream error:', groqRes.status, errBody);
      return res.status(groqRes.status).json({ error: 'groq_upstream_error', details: errBody });
    }

    const data = await groqRes.json();
    const content = data?.choices?.[0]?.message?.content || '';
    res.json({ content });
  } catch (err) {
    console.error('GROQ proxy error:', err);
    res.status(500).json({ error: 'groq_proxy_error' });
  }
});

// ---------- Vendor Signup ----------
app.post('/api/vendor/signup', async (req, res) => {
  const { email, password, fullName, location, phoneNumber, businessName } = req.body || {};

  if (!email || !password || !fullName || !location) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  if (dbAvailable && pool) {
    try {
      await pool.query(
        'INSERT INTO vendors (id, email, password_hash, full_name, location, phone, business_name) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [id, email.toLowerCase(), passwordHash, fullName, location, phoneNumber || null, businessName || null]
      );
      const token = jwt.sign({ id, email: email.toLowerCase(), full_name: fullName }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, vendor: { id, fullName, email: email.toLowerCase(), location } });
    } catch (e) {
      if (String(e?.code) === '23505' || String(e?.message).includes('unique')) {
        return res.status(409).json({ error: 'email_exists' });
      }
      console.error('DB signup error, falling back to memory:', e.message);
    }
  }

  // In-memory fallback
  if (memoryVendors.find(v => v.email === email.toLowerCase())) {
    return res.status(409).json({ error: 'email_exists' });
  }
  memoryVendors.push({ id, email: email.toLowerCase(), passwordHash, full_name: fullName, location, phone: phoneNumber, business_name: businessName });
  const token = jwt.sign({ id, email: email.toLowerCase(), full_name: fullName }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, vendor: { id, fullName, email: email.toLowerCase(), location } });
});

// ---------- Vendor Login ----------
app.post('/api/vendor/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  if (dbAvailable && pool) {
    try {
      const result = await pool.query(
        'SELECT id, email, password_hash, full_name, location FROM vendors WHERE email = $1 LIMIT 1',
        [email.toLowerCase()]
      );
      const vendor = result.rows?.[0];
      if (vendor) {
        const ok = await bcrypt.compare(password, vendor.password_hash);
        if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
        const token = jwt.sign({ id: vendor.id, email: vendor.email, full_name: vendor.full_name }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, vendor: { id: vendor.id, fullName: vendor.full_name, email: vendor.email, location: vendor.location } });
      }
    } catch (e) {
      console.error('DB login error, trying memory fallback:', e.message);
    }
  }

  // In-memory fallback
  const vendor = memoryVendors.find(v => v.email === email.toLowerCase());
  if (!vendor) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, vendor.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = jwt.sign({ id: vendor.id, email: vendor.email, full_name: vendor.full_name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, vendor: { id: vendor.id, fullName: vendor.full_name, email: vendor.email, location: vendor.location } });
});

// ---------- Vendor Profile ----------
app.get('/api/vendor/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing_token' });

  const token = auth.replace('Bearer ', '');
  try {
    const vendor = jwt.verify(token, JWT_SECRET);
    res.json({ vendor });
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
});

// ---------- Market Prices ----------
app.get('/api/market/prices', async (req, res) => {
  if (!dbAvailable || !pool) {
    return res.json([]); // empty → frontend AI fallback kicks in
  }

  const { commodity, location } = req.query;
  let query = `SELECT mp.*, v.full_name as vendor_name, v.phone as vendor_contact
    FROM market_prices mp LEFT JOIN vendors v ON mp.vendor_id = v.id
    WHERE mp.active = true`;
  const params = [];

  if (commodity) {
    params.push(`%${commodity}%`);
    query += ` AND mp.commodity ILIKE $${params.length}`;
  }
  if (location) {
    params.push(`%${location}%`);
    query += ` AND mp.location ILIKE $${params.length}`;
  }
  query += ' ORDER BY mp.created_at DESC LIMIT 50';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    console.error('Market prices error:', e.message);
    res.json([]); // fallback to empty → AI estimates on frontend
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`GROQ_API_KEY: ${GROQ_API_KEY ? 'set (' + GROQ_API_KEY.slice(0, 8) + '...)' : 'MISSING!'}`);
  console.log(`DATABASE_URL: ${DATABASE_URL ? 'set' : 'not set (auth/market will fail)'}`);
});
