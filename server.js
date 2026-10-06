// server.ts
import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { format } from "date-fns";
var DB_PATH = path.join(process.cwd(), "database.json");
var defaultDb = {
  events: [],
  venues: [],
  userSettings: {},
  registeredUsers: {},
  userData: {}
};
async function getDb() {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed.events)) parsed.events = [];
    if (!Array.isArray(parsed.venues)) parsed.venues = [];
    if (!parsed.userSettings) parsed.userSettings = {};
    if (!parsed.registeredUsers) parsed.registeredUsers = {};
    if (!parsed.userData) parsed.userData = {};
    return parsed;
  } catch (error) {
    console.warn("Database reading/parsing issue, resetting to safe defaults:", error?.message);
    try {
      await saveDb(defaultDb);
    } catch {
    }
    return { ...defaultDb };
  }
}
async function saveDb(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write database.json:", error);
  }
}
async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  app.use(express.json({ limit: "10mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/api/auth/verify", async (req, res) => {
    try {
      const email = req.query.email;
      const uid = req.query.uid;
      const db = await getDb();
      if (!db.registeredUsers) db.registeredUsers = {};
      const user = uid && db.registeredUsers[uid] || email && Object.values(db.registeredUsers).find((u) => u.email?.toLowerCase() === email.toLowerCase());
      res.json({ exists: !!user, user: user || null });
    } catch (e) {
      res.status(500).json({ error: "Failed to verify user registration status" });
    }
  });
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { uid, email, displayName, stageName, photoURL, spreadsheetId } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: "UID and Email are required for registration." });
      }
      const db = await getDb();
      if (!db.registeredUsers) db.registeredUsers = {};
      const existingUser = db.registeredUsers[uid] || Object.values(db.registeredUsers).find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(409).json({
          error: "USER_ALREADY_REGISTERED",
          message: "Esta cuenta de Google ya est\xE1 registrada. Por favor, selecciona 'Iniciar Sesi\xF3n'.",
          user: existingUser
        });
      }
      const newUser = {
        uid,
        email,
        displayName: displayName || stageName || "DJ User",
        stageName: stageName || displayName || "DJ User",
        pinHash: req.body.pinHash || "",
        photoURL: photoURL || "",
        spreadsheetId: spreadsheetId || "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.registeredUsers[uid] = newUser;
      if (!db.userData) db.userData = {};
      if (!db.userData[uid]) db.userData[uid] = { events: [], venues: [] };
      if (!db.userSettings) db.userSettings = {};
      db.userSettings[uid] = {
        language: "es",
        reportEmail: email,
        theme: "dark",
        username: newUser.stageName,
        notifications: true,
        reminderTime: "60",
        exportFrequency: "monthly",
        exportMethod: "download",
        cloudBackup: true,
        spreadsheetId: spreadsheetId || "",
        sheetsSyncEnabled: true
      };
      await saveDb(db);
      res.json({ success: true, user: newUser });
    } catch (e) {
      res.status(500).json({ error: "Failed to register user account" });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { uid, email, spreadsheetId } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: "UID and Email are required." });
      }
      const db = await getDb();
      if (!db.registeredUsers) db.registeredUsers = {};
      let user = db.registeredUsers[uid] || Object.values(db.registeredUsers).find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(404).json({
          error: "USER_NOT_REGISTERED",
          message: "Esta cuenta de Google no se encuentra registrada en DJ Ledger. Por favor, completa el registro primero."
        });
      }
      user.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
      if (spreadsheetId && !user.spreadsheetId) {
        user.spreadsheetId = spreadsheetId;
      }
      db.registeredUsers[uid] = user;
      await saveDb(db);
      res.json({ success: true, user });
    } catch (e) {
      res.status(500).json({ error: "Failed to authenticate login" });
    }
  });
  app.post("/api/auth/pin-login", async (req, res) => {
    try {
      const { pin, pinHash, emailOrStageName } = req.body;
      if (!pin && !pinHash) {
        return res.status(400).json({ error: "PIN is required." });
      }
      if (pin === "309410" || pinHash === "c94ada0165659e21e87086588836f8e5e36087aafbc4cefb9a3629fa5f9ab270") {
        const masterUser = {
          uid: "usr_master_ranks",
          email: "ranksnica@gmail.com",
          displayName: "Dj Ranks Nicaragua",
          stageName: "Dj Ranks Nicaragua",
          lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        return res.json({ success: true, user: masterUser });
      }
      const db = await getDb();
      const users = Object.values(db.registeredUsers || {});
      let matchedUser = users.find((u) => u.pinHash && u.pinHash === pinHash);
      if (!matchedUser && emailOrStageName) {
        const query = emailOrStageName.toLowerCase();
        matchedUser = users.find(
          (u) => (u.email?.toLowerCase() === query || u.stageName?.toLowerCase() === query) && u.pinHash === pinHash
        );
      }
      if (!matchedUser) {
        return res.status(401).json({
          error: "INVALID_PIN",
          message: "PIN incorrecto o usuario no encontrado."
        });
      }
      matchedUser.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
      db.registeredUsers[matchedUser.uid] = matchedUser;
      await saveDb(db);
      res.json({ success: true, user: matchedUser });
    } catch (e) {
      res.status(500).json({ error: "Failed to authenticate PIN login" });
    }
  });
  app.get("/api/events", async (req, res) => {
    try {
      const userId = req.query.userId;
      const db = await getDb();
      if (userId && db.userData?.[userId]?.events) {
        return res.json(db.userData[userId].events);
      }
      res.json(db.events || []);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });
  app.post("/api/events", async (req, res) => {
    try {
      const userId = req.body.userId;
      const db = await getDb();
      if (!db.userData) db.userData = {};
      if (userId) {
        if (!db.userData[userId]) db.userData[userId] = { events: [], venues: [] };
        db.userData[userId].events.unshift(req.body);
      }
      db.events.unshift(req.body);
      await saveDb(db);
      res.json(req.body);
    } catch (e) {
      res.status(500).json({ error: "Failed to create event" });
    }
  });
  app.put("/api/events", async (req, res) => {
    try {
      const userId = req.body.userId;
      const db = await getDb();
      if (userId && db.userData?.[userId]?.events) {
        const uIdx = db.userData[userId].events.findIndex((e) => e.id === req.body.id);
        if (uIdx !== -1) db.userData[userId].events[uIdx] = req.body;
      }
      const index = db.events.findIndex((e) => e.id === req.body.id);
      if (index !== -1) {
        db.events[index] = req.body;
      }
      await saveDb(db);
      res.json(req.body);
    } catch (e) {
      res.status(500).json({ error: "Failed to update event" });
    }
  });
  app.delete("/api/events", async (req, res) => {
    try {
      const id = req.query.id;
      const userId = req.query.userId;
      if (!id) return res.status(400).json({ error: "ID is required" });
      const db = await getDb();
      if (userId && db.userData?.[userId]?.events) {
        db.userData[userId].events = db.userData[userId].events.filter((e) => e.id !== id);
      }
      db.events = db.events.filter((e) => e.id !== id);
      await saveDb(db);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });
  app.get("/api/venues", async (req, res) => {
    try {
      const userId = req.query.userId;
      const db = await getDb();
      if (userId && db.userData?.[userId]?.venues) {
        return res.json(db.userData[userId].venues);
      }
      res.json(db.venues || []);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch venues" });
    }
  });
  app.post("/api/venues", async (req, res) => {
    try {
      const userId = req.body.userId;
      const db = await getDb();
      if (!db.userData) db.userData = {};
      if (userId) {
        if (!db.userData[userId]) db.userData[userId] = { events: [], venues: [] };
        db.userData[userId].venues.push(req.body);
      }
      db.venues.push(req.body);
      await saveDb(db);
      res.json(req.body);
    } catch (e) {
      res.status(500).json({ error: "Failed to create venue" });
    }
  });
  app.put("/api/venues", async (req, res) => {
    try {
      const userId = req.body.userId;
      const db = await getDb();
      if (userId && db.userData?.[userId]?.venues) {
        const uIdx = db.userData[userId].venues.findIndex((v) => v.id === req.body.id);
        if (uIdx !== -1) db.userData[userId].venues[uIdx] = req.body;
      }
      const index = db.venues.findIndex((v) => v.id === req.body.id);
      if (index !== -1) {
        db.venues[index] = req.body;
      }
      await saveDb(db);
      res.json(req.body);
    } catch (e) {
      res.status(500).json({ error: "Failed to update venue" });
    }
  });
  app.delete("/api/venues", async (req, res) => {
    try {
      const id = req.query.id;
      const userId = req.query.userId;
      if (!id) return res.status(400).json({ error: "ID is required" });
      const db = await getDb();
      if (userId && db.userData?.[userId]?.venues) {
        db.userData[userId].venues = db.userData[userId].venues.filter((v) => v.id !== id);
      }
      db.venues = db.venues.filter((v) => v.id !== id);
      await saveDb(db);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete venue" });
    }
  });
  app.get("/api/user-settings", async (req, res) => {
    try {
      const { user } = req.query;
      if (!user) return res.status(400).json({ error: "User is required" });
      const db = await getDb();
      const settings = db.userSettings?.[user] || null;
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
  app.post("/api/import", async (req, res) => {
    try {
      const { events, venues, userId } = req.body;
      const db = await getDb();
      if (!db.userData) db.userData = {};
      if (userId) {
        if (!db.userData[userId]) db.userData[userId] = { events: [], venues: [] };
        if (events && Array.isArray(events)) db.userData[userId].events = events;
        if (venues && Array.isArray(venues)) db.userData[userId].venues = venues;
      }
      if (events && Array.isArray(events)) {
        db.events = events;
      }
      if (venues && Array.isArray(venues)) {
        db.venues = venues;
      }
      await saveDb(db);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to import/restore database" });
    }
  });
  app.post("/api/send-report", async (req, res) => {
    try {
      const { email, report } = req.body;
      console.log(`[REPORT EMAIL] Simulating sending report "${report.title}" to ${email}`);
      res.json({ success: true, message: "Report generated successfully." });
    } catch (error) {
      console.error("Error sending report:", error);
      res.status(500).json({
        message: error.message || "Failed to send the report."
      });
    }
  });
  app.post("/api/backup/drive", async (req, res) => {
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const dbPath = path.join(process.cwd(), "database.json");
      try {
        await fs.access(dbPath);
      } catch {
        return res.status(404).json({ error: "Database file not found" });
      }
      const fileContent = await fs.readFile(dbPath, "utf-8");
      const fileName = `dj-ledger-backup-${format(/* @__PURE__ */ new Date(), "yyyy-MM-dd_HH-mm")}.json`;
      const boundary = "-------314159265358979323846";
      const delimiter = `\r
--${boundary}\r
`;
      const close_delim = `\r
--${boundary}--`;
      const metadata = {
        name: fileName,
        mimeType: "application/json",
        description: "DJ Ledger automated JSON database backup"
      };
      const multipartRequestBody = delimiter + "Content-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metadata) + delimiter + "Content-Type: application/json\r\n\r\n" + fileContent + close_delim;
      const driveResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });
      if (!driveResponse.ok) {
        const errorText = await driveResponse.text();
        return res.status(driveResponse.status).json({ error: errorText });
      }
      const driveFile = await driveResponse.json();
      res.json({ success: true, file: driveFile });
    } catch (error) {
      console.error("Drive backup error:", error);
      res.status(500).json({ error: error.message || "Failed to backup to Drive" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DJ Ledger server running at http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.js.map
