import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import * as Brevo from "@getbrevo/brevo";
import { format } from "date-fns";

const DB_PATH = path.join(process.cwd(), 'database.json');
type DatabaseSchema = { events: any[], venues: any[] };
const defaultDb: DatabaseSchema = { events: [], venues: [] };

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
  const PORT = 3000;

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

  app.post("/api/send-report", async (req, res) => {
    try {
      if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) {
        throw new Error('The email sending service is not configured. Please add BREVO_API_KEY and BREVO_FROM_EMAIL to your .env file.');
      }

      const { email, report } = req.body;
      const apiInstance = new Brevo.TransactionalEmailsApi();
      apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

      const formatCurrency = (amount: number, currency: 'USD' | 'NIO') => {
        if (currency === 'USD') {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
        }
        return `C$${amount.toFixed(2)}`;
      }

      const eventsHtml = report.events?.map((event: any) => `
          <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${format(new Date(event.date), 'MMM d, yyyy')}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${event.venueName}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(event.totalEarnings, 'USD')}</td>
          </tr>
      `).join('') || '<tr><td colspan="3">No events in this report.</td></tr>';
      
      const sendSmtpEmail = new Brevo.SendSmtpEmail();
      sendSmtpEmail.to = [{ email: email }];
      sendSmtpEmail.sender = { email: process.env.BREVO_FROM_EMAIL, name: 'DJ Ledger' };
      sendSmtpEmail.subject = `Your DJ Ledger Report: ${report.title}`;
      sendSmtpEmail.htmlContent = `
          <h1>${report.title}</h1>
          <p>Here is a summary of the events for this report:</p>
          <table style="width: 100%; border-collapse: collapse;">
              <thead>
                  <tr>
                      <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Date</th>
                      <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Venue</th>
                      <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Earnings</th>
                  </tr>
              </thead>
              <tbody>
                  ${eventsHtml}
              </tbody>
          </table>
          <br/>
          <p>Sent from your DJ Ledger application.</p>
      `;

      await apiInstance.sendTransacEmail(sendSmtpEmail);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error sending report:', error);
      res.status(500).json({ 
        message: error.message || 'Failed to send the report email.' 
      });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
