import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
const here = path.dirname(fileURLToPath(import.meta.url));
try {
  const sql = await fs.readFile(path.resolve(here, '../migrations/001_initial.sql'), 'utf8');
  await pool.query(sql);
  console.log('PostgreSQL schema migration completed.');
} catch (e) { console.error('Migration failed:', e.message); process.exitCode = 1; }
finally { await pool.end(); }
