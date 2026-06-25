import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const venues = db.venues;
    return NextResponse.json(venues);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDb();
    const venue = await req.json();
    
    db.venues.push(venue);
    await saveDb(db);
    
    return NextResponse.json(venue);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create venue' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const db = await getDb();
    const venue = await req.json();
    
    const index = db.venues.findIndex(v => v.id === venue.id);
    if (index !== -1) {
      db.venues[index] = venue;
      await saveDb(db);
    }
    
    return NextResponse.json(venue);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update venue' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    
    const db = await getDb();
    db.venues = db.venues.filter(v => v.id !== id);
    await saveDb(db);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete venue' }, { status: 500 });
  }
}
