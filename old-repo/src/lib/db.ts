import fs from 'fs/promises';
import path from 'path';
import type { Event, Venue } from '@/types';

const DB_PATH = path.join(process.cwd(), 'database.json');

type DatabaseSchema = {
  events: Event[];
  venues: Venue[];
};

const defaultDb: DatabaseSchema = { events: [], venues: [] };

export async function getDb(): Promise<DatabaseSchema> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await saveDb(defaultDb);
      return defaultDb;
    }
    throw error;
  }
}

export async function saveDb(data: DatabaseSchema): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

