// src/app/api/health/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query<{ now: string }>('select now()');
    return NextResponse.json({ ok: true, now: rows[0]?.now ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

