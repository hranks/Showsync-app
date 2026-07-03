import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { format } from "date-fns";

const DB_PATH = path.join(process.cwd(), 'database.json');
type DatabaseSchema = { events: any[], venues: any[], userSettings?: Record<string, any> };
const defaultDb: DatabaseSchema = { events: [], venues: [], userSettings: {} };

async function getDb(): Promise<DatabaseSchema> {
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

async function saveDb(data: DatabaseSchema): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/events", async (req, res) => {
    try {
      const db = await getDb();
      res.json(db.events);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const db = await getDb();
      db.events.push(req.body);
      await saveDb(db);
      res.json(req.body);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  app.put("/api/events", async (req, res) => {
    try {
      const db = await getDb();
      const index = db.events.findIndex(e => e.id === req.body.id);
      if (index !== -1) {
        db.events[index] = req.body;
        await saveDb(db);
      }
      res.json(req.body);
    } catch (e) {
      res.status(500).json({ error: 'Failed to update event' });
    }
  });

  app.delete("/api/events", async (req, res) => {
    try {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'ID is required' });
      const db = await getDb();
      db.events = db.events.filter(e => e.id !== id);
      await saveDb(db);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

  app.get("/api/venues", async (req, res) => {
    try {
      const db = await getDb();
      res.json(db.venues);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch venues' });
    }
  });

  app.post("/api/venues", async (req, res) => {
    try {
      const db = await getDb();
      db.venues.push(req.body);
      await saveDb(db);
      res.json(req.body);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create venue' });
    }
  });

  app.put("/api/venues", async (req, res) => {
    try {
      const db = await getDb();
      const index = db.venues.findIndex(v => v.id === req.body.id);
      if (index !== -1) {
        db.venues[index] = req.body;
        await saveDb(db);
      }
      res.json(req.body);
    } catch (e) {
      res.status(500).json({ error: 'Failed to update venue' });
    }
  });

  app.delete("/api/venues", async (req, res) => {
    try {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'ID is required' });
      const db = await getDb();
      db.venues = db.venues.filter(v => v.id !== id);
      await saveDb(db);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete venue' });
    }
  });

  // User Settings API Routes
  app.get("/api/user-settings", async (req, res) => {
    try {
      const { user } = req.query;
      if (!user) return res.status(400).json({ error: "User is required" });
      const db = await getDb();
      const settings = db.userSettings?.[user as string] || null;
      res.json({ settings });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch user settings" });
    }
  });

  app.post("/api/user-settings", async (req, res) => {
    try {
      const { user, settings } = req.body;
      if (!user) return res.status(400).json({ error: "User is required" });
      const db = await getDb();
      if (!db.userSettings) db.userSettings = {};
      db.userSettings[user] = settings;
      await saveDb(db);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to save user settings" });
    }
  });

  app.post("/api/send-report", async (req, res) => {
    try {
      const { email, report } = req.body;
      console.log(`[MOCK EMAIL] Simulating sending report "${report.title}" to ${email}`);
      res.json({ success: true, message: 'Report generated successfully (Simulation mode).' });
    } catch (error: any) {
      console.error('Error sending report:', error);
      res.status(500).json({ 
        message: error.message || 'Failed to send the report.' 
      });
    }
  });

  app.post("/api/backup/drive", async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const dbPath = path.join(process.cwd(), 'database.json');
      try {
        await fs.access(dbPath);
      } catch {
        return res.status(404).json({ error: 'Database not found' });
      }

      const fileContent = await fs.readFile(dbPath, 'utf-8');
      
      const metadata = {
        name: 'DJ-Ledger-Backup-database.json',
        mimeType: 'application/json',
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([fileContent], { type: 'application/json' }));

      const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
        },
        body: form,
      });

      if (!driveRes.ok) {
        const errorText = await driveRes.text();
        console.error('Drive API Error:', errorText);
        return res.status(500).json({ error: 'Failed to upload to Google Drive' });
      }

      const data = await driveRes.json() as { id: string };
      res.json({ success: true, fileId: data.id });
    } catch (error) {
      console.error('Backup API Error:', error);
      res.status(500).json({ error: 'Failed to complete backup' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
