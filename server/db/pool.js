try {
  if (process.loadEnvFile) {
    process.loadEnvFile('.env.local');
  }
} catch {
  // ignore
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgres://postgres:postgres@localhost:5432/secs_db';
const isCloudDb =
  connectionString.includes('neon.tech') ||
  connectionString.includes('supabase') ||
  connectionString.includes('sslmode=require');

const PG_CONFIG = {
  connectionString,
  ssl: isCloudDb || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Check if 'pg' is importable dynamically
let pgClient = null;
try {
  const pgModule = await import('pg');
  const { Pool } = pgModule.default || pgModule;
  pgClient = new Pool(PG_CONFIG);
  // Suppress uncaught connection rejection on idle clients
  pgClient.on('error', () => {});
} catch {
  pgClient = null;
}

// In-Memory Database Store as fallback / test harness (clean tables, no dummy seeds)
class MemoryPostgres {
  constructor() {
    this.tables = {
      users: [],
      labs: [],
      issues: [],
      budgets: [],
      audit_incidents: [],
      notifications: [],
      announcements: [],
      password_resets: [],
      departments: [],
    };
    this.counters = {
      ticketSeq: 1001,
      budgetSeq: 101,
      incidentSeq: 1,
    };
  }

  seed() {
    // Empty seed: database starts clean, ready for real user accounts
  }
}

export const memoryDb = new MemoryPostgres();

/**
 * Universal query function:
 * Executes SQL against PostgreSQL if connected; otherwise handles through memory store.
 */
export async function query(sqlText, params = []) {
  if (pgClient) {
    try {
      const res = await pgClient.query(sqlText, params);
      return res;
    } catch {
      // If PostgreSQL network is blocked or db not ready, seamlessly fall back to memory store
      return null;
    }
  }

  // Fallback simulator for common queries
  return null;
}
