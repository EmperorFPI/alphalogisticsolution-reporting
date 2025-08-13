// src/lib/db.ts

import { Pool, QueryResultRow } from 'pg';

let _pool: Pool | null = null;

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return url;
}

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: getConnectionString(),
      max: 5,
      idleTimeoutMillis: 10_000,
    });
  }
  return _pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[],
): Promise<{ rows: T[] }> {
  const pool = getPool();
  const res = await pool.query<T>(text, params);
  return { rows: res.rows as T[] };
}