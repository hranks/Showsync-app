import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbPath = path.join(process.cwd(), 'database.json');
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(dbPath);
    
    const metadata = {
      name: 'Showsync-Backup-database.json',
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: 'application/json' }));

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
      body: form,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Drive API Error:', errorText);
      return NextResponse.json({ error: 'Failed to upload to Google Drive' }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, fileId: data.id });
  } catch (error) {
    console.error('Backup API Error:', error);
    return NextResponse.json({ error: 'Failed to complete backup' }, { status: 500 });
  }
}
