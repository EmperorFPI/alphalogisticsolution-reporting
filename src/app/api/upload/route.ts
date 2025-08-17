
// Robust Excel/CSV upload endpoint for production table
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { parseCsv, parseXlsx, UNIFIED_COLUMNS, type UnifiedRow } from '@/lib/parser';
import { ensureAccount } from '@/lib/tenant';
import { query } from '@/lib/db';

// Insert all rows in one batch (if possible)
async function insertRows(accountId: number, rows: UnifiedRow[], sourceFile: string) {
			if (!rows.length) return 0;
			// Force accountId to number for Postgres
			const acctId = typeof accountId === 'string' ? Number(accountId) : accountId;
			if (typeof acctId !== 'number' || !Number.isFinite(acctId)) {
				throw new Error(`accountId is not a valid number: ${acctId} (type: ${typeof acctId})`);
			}
				const cols = UNIFIED_COLUMNS;
				const colList = cols.map(c => `"${c}"`).join(', ');
				let text = `INSERT INTO production (account_id, ${colList}, source_file) VALUES `;
				const params: any[] = [];
				const paramCountPerRow = cols.length + 2; // account_id + columns + source_file
				rows.forEach((r, i) => {
					if (i) text += ', ';
					const offs = i * paramCountPerRow;
					text += `($${offs + 1}, ` + cols.map((_, j) => `$${offs + 2 + j}`).join(', ') + `, $${offs + cols.length + 2})`;
					params.push(acctId, ...cols.map(c => (r as any)[c] ?? null), sourceFile);
				});
			// Debug output for troubleshooting
			console.log('DEBUG SQL:', text);
			console.log('DEBUG PARAMS:', params.map((p, i) => `[${i}]: ${p} (${typeof p})`).join(', '));
			await query(text, params);
			return rows.length;
}

export async function POST(req: NextRequest) {
	// Auth
	const secret = req.headers.get('x-inbound-secret') || '';
	if (!process.env.INBOUND_SHARED_SECRET || secret !== process.env.INBOUND_SHARED_SECRET) {
		return NextResponse.json({ ok: false, error: 'unauthorized', message: 'Upload failed: unauthorized access.' }, { status: 401 });
	}

	// Tenant/account
	const url = new URL(req.url);
	const accountSlug = url.searchParams.get('account') || req.headers.get('x-tenant') || 'default';
	let accountId = await ensureAccount(accountSlug);
	if (typeof accountId === 'string') accountId = Number(accountId);
	if (!Number.isFinite(accountId)) {
		return NextResponse.json({ ok: false, error: 'Invalid accountId', message: 'Upload failed: invalid tenant.' }, { status: 400 });
	}

	// Parse form
	const form = await req.formData();
	const files: File[] = [];
	for (const [, v] of form.entries()) {
		if (v instanceof File) {
			const name = v.name.toLowerCase();
			if (/\.(xlsx|csv)$/.test(name)) files.push(v);
		}
	}
	if (!files.length) {
		return NextResponse.json({ ok: false, error: 'No file', message: 'No Excel or CSV file uploaded.' }, { status: 400 });
	}

	let inserted = 0;
	let errors: string[] = [];
	for (const file of files) {
		try {
			const buf = Buffer.from(await file.arrayBuffer());
			const name = file.name || 'upload';
			let rows: UnifiedRow[] = [];
			if (/\.xlsx$/i.test(name)) rows = await parseXlsx(buf, name);
			else if (/\.csv$/i.test(name)) rows = parseCsv(buf, name);
			if (!rows.length) {
				errors.push(`${name}: No valid rows found.`);
				continue;
			}
			// Validate and clean rows
			rows = rows.map(r => {
				const cleaned: any = {};
				for (const col of UNIFIED_COLUMNS) cleaned[col] = r[col] ?? null;
				cleaned["Date"] = cleaned["Date"] ? cleaned["Date"] : null;
				cleaned["source_file"] = name;
				return cleaned;
			});
			inserted += await insertRows(accountId, rows, name);
		} catch (e: any) {
			errors.push(`${file.name}: ${e?.message || e}`);
		}
	}

	if (inserted > 0) {
		return NextResponse.json({ ok: true, tenant: accountSlug, inserted, message: 'Upload successful.', errors });
	} else {
		return NextResponse.json({ ok: false, tenant: accountSlug, inserted, message: 'Upload failed.', errors });
	}
}