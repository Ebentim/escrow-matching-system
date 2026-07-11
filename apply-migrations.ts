import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to the database.");

    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      console.log(`Successfully applied ${file}.`);
    }

    console.log("All migrations applied successfully.");
  } catch (err) {
    console.error("Error applying migrations:", err);
  } finally {
    await client.end();
  }
}

applyMigrations();
