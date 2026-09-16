// Standalone script to create DB tables directly via pg
// Run: node create-tables.mjs
import pg from 'pg';
const { Client } = pg;

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:Drainwatch_6781@db.pwhmljruumktzdmihpsr.supabase.co:5432/postgres';

const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log('✅ Connected to Supabase');

  await client.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      hazard_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      location_name TEXT NOT NULL,
      description TEXT NOT NULL,
      reporter_email TEXT,
      photo_url TEXT,
      risk_score INTEGER NOT NULL,
      risk_components JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'reported',
      source TEXT NOT NULL DEFAULT 'citizen',
      is_demo BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log('✅ reports table ready');

  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      report_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log('✅ audit_logs table ready');

  // Add photo_url column if it doesn't exist yet (safe migration)
  await client.query(`
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS photo_url TEXT;
  `);
  console.log('✅ photo_url column ensured');

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at);
    CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
    CREATE INDEX IF NOT EXISTS reports_severity_idx ON reports(severity);
    CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);
  `);
  console.log('✅ Indexes created');

  const { rows } = await client.query('SELECT count(*) FROM reports');
  console.log(`ℹ️  reports table has ${rows[0].count} rows`);
  
  await client.end();
  console.log('🎉 Done! Reload your Vercel deployment to trigger the seed.');
}

main().catch((err) => { console.error('❌ Error:', err.message); process.exit(1); });
