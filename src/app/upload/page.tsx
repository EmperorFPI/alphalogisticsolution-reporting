
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Upload() {
	const [files, setFiles] = useState<FileList | null>(null);
	const [tenant, setTenant] = useState('default');
	const [secret, setSecret] = useState('');
	const router = useRouter();

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!files || files.length === 0) return;
		const fd = new FormData();
		Array.from(files).forEach(f => fd.append('file', f));
		const res = await fetch('/api/upload?account=' + tenant, {
			method: 'POST',
			headers: { 'x-inbound-secret': secret },
			body: fd
		});
			const data = await res.json();
			if (data.ok) {
				alert('Report Successful!');
				router.push('/dashboard');
			} else if (data.message && data.message.includes('No new rows inserted')) {
				alert('No new rows inserted: all rows were duplicates or skipped.');
			} else {
				alert('Upload failed: ' + (data.message || 'Unknown error'));
			}
	}

	return (
		<main className='container'>
			<h1>Manual Upload</h1>
			<form onSubmit={onSubmit}>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, maxWidth: 900 }}>
					<div>
						<label>Files</label><br />
						<input type='file' multiple onChange={e => setFiles(e.target.files)} />
					</div>
					<div>
						<label>Tenant</label><br />
						<input value={tenant} onChange={e => setTenant(e.target.value)} />
					</div>
					<div>
						<label>Inbound Secret</label><br />
						<input value={secret} onChange={e => setSecret(e.target.value)} />
					</div>
				</div>
				<button type='submit' style={{ marginTop: 16 }}>Upload</button>
			</form>
		</main>
	);
}