import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  if (process.loadEnvFile) {
    process.loadEnvFile('.env.local');
  }
} catch {
  // ignore
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    console.warn('⚠️ No DATABASE_URL or POSTGRES_URL environment variable found.');
    console.log('ℹ️ Usage: DATABASE_URL="postgres://user:pass@host/db" node server/db/init.js');
    process.exit(0);
  }

  console.log('Connecting to PostgreSQL database...');
  let pg;
  try {
    pg = await import('pg');
  } catch (err) {
    console.error('❌ "pg" library not installed. Please run "npm install pg" to run migrations against live PostgreSQL.');
    process.exit(1);
  }

  const { Pool } = pg.default || pg;
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log('✓ Successfully connected to PostgreSQL.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const seedsPath = path.join(__dirname, 'seeds.sql');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const seedsSql = fs.readFileSync(seedsPath, 'utf8');

    console.log('Executing schema.sql DDL migrations...');
    await client.query(schemaSql);
    console.log('✓ Schema applied successfully.');

    console.log('Executing seeds.sql dataset...');
    await client.query(seedsSql);
    console.log('✓ Seeds applied successfully.');

    client.release();
    await pool.end();
    console.log('🎉 Database initialization complete!');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  }
}

initDatabase();

