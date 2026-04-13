#!/usr/bin/env node
// Seed script — run once to create the admin user
// Usage: DATABASE_URL="libsql://..." node seed.js

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Set DATABASE_URL env var first");
  process.exit(1);
}

const { createClient } = require("@libsql/client");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");

const client = createClient({ url: DATABASE_URL });

async function seed() {
  const now = new Date().toISOString();
  const id = nanoid();

  // Check if admin already exists
  const existing = client.execute("SELECT id FROM employees WHERE email = 'admin@trulyautomate.com'");
  if ((await existing).rows.length > 0) {
    console.log("Admin already exists at admin@trulyautomate.com");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("admin123", 12);
  await client.execute(
    `INSERT INTO employees (id, name, email, password_hash, role, designation, employee_code, joining_date, shift_time, is_active, created_at, monthly_salary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, "Shreyansh Jain", "admin@trulyautomate.com", passwordHash, "admin", "web_developer", "TA-001", "2025-01-01", "10:00", 1, now, 50000]
  );

  console.log("Admin created:");
  console.log("  Email:    admin@trulyautomate.com");
  console.log("  Password: admin123");
}

seed().catch(e => { console.error("Error:", e.message); process.exit(1); });