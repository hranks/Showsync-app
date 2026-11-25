import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { format } from "date-fns";

const DB_PATH = path.join(process.cwd(), "database.json");
const FIREBASE_CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");

// Ephemeral in-memory fallback if SESSION_SECRET env var is not configured
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

interface AuthenticatedRequest extends Request {
  authUser?: {
    uid: string;
    email: string;
  };
}

type DatabaseSchema = {
  events: any[];
  venues: any[];
  userSettings: Record<string, any>;
  registeredUsers: Record<string, any>;
  userData: Record<string, { events: any[]; venues: any[] }>;
};

const defaultDb: DatabaseSchema = {
  events: [],
  venues: [],
  userSettings: {},
  registeredUsers: {},
  userData: {},
};

// --- FIREBASE PROJECT CONFIG ---
let cachedFirebaseProjectId: string | null = null;
async function getFirebaseProjectId(): Promise<string> {
  if (cachedFirebaseProjectId) return cachedFirebaseProjectId;
  const raw = await fs.readFile(FIREBASE_CONFIG_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  cachedFirebaseProjectId = parsed.projectId;
  if (!cachedFirebaseProjectId) {
    throw new Error("Missing projectId in firebase-applet-config.json");
  }
  return cachedFirebaseProjectId;
}

// --- GOOGLE X509 CERT CACHE FOR FIREBASE ID TOKEN VERIFICATION ---
let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }

  const res = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );
  if (!res.ok) {
    throw new Error("Failed to fetch Google public certificates for token verification");
  }

  const cacheControl = res.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
  certsExpiresAt = now + maxAgeSeconds * 1000;
  cachedCerts = await res.json();
  return cachedCerts;
}

function base64UrlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(base64, "base64");
}

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf-8") : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid ID token format");
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(base64UrlDecode(headerB64).toString("utf-8"));
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf-8"));

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Invalid token algorithm or missing key ID");
  }

  const certs = await getGooglePublicCerts();
  let certPem = certs[header.kid];
  if (!certPem) {
    // Force refresh once in case keys rotated
    certsExpiresAt = 0;
    const refreshed = await getGooglePublicCerts();
    certPem = refreshed[header.kid];
  }
  if (!certPem) {
    throw new Error("Public certificate not found for token key ID");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();

  const publicKey = crypto.createPublicKey(certPem);
  const signature = base64UrlDecode(signatureB64);
  const isValidSignature = verifier.verify(publicKey, signature);
  if (!isValidSignature) {
    throw new Error("Invalid Firebase ID token signature");
  }

  const projectId = await getFirebaseProjectId();
  const nowSec = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) {
    throw new Error("Token audience mismatch");
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Token issuer mismatch");
  }
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid token subject");
  }
  if (typeof payload.exp !== "number" || payload.exp <= nowSec - 30) {
    throw new Error("Firebase ID token has expired");
  }
  if (typeof payload.iat !== "number" || payload.iat > nowSec + 60) {
    throw new Error("Invalid token issued-at timestamp");
  }
  if (!payload.email || typeof payload.email !== "string") {
    throw new Error("Verified Google email is required");
  }

  return {
    uid: payload.sub,
    email: payload.email,
    displayName: typeof payload.name === "string" ? payload.name : "",
    photoURL: typeof payload.picture === "string" ? payload.picture : "",
  };
}

// --- SERVER SESSION TOKEN (HMAC-SHA256) ---
function issueSessionToken(uid: string, email: string): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    uid,
    email,
    iat: nowSec,
    exp: nowSec + SESSION_TTL_SECONDS,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest();
  return `${payloadB64}.${base64UrlEncode(sig)}`;
}

function verifySessionToken(token: string): { uid: string; email: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest();
    const actualSig = base64UrlDecode(sigB64);

    if (expectedSig.length !== actualSig.length) return null;
    if (!crypto.timingSafeEqual(expectedSig, actualSig)) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf-8"));
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.uid || !payload.email || typeof payload.exp !== "number" || payload.exp <= nowSec) {
      return null;
    }
    return { uid: payload.uid, email: payload.email };
  } catch {
    return null;
  }
}

// --- PIN CRYPTOGRAPHY (SCRYPT + RANDOM SALT) ---
function hashPinScrypt(pin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(pin, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

function verifyPinScrypt(pin: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!storedHash || !storedHash.startsWith("scrypt:")) {
      return resolve(false);
    }
    const parts = storedHash.split(":");
    if (parts.length !== 3) return resolve(false);
    const [, salt, keyHex] = parts;
    crypto.scrypt(pin, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const storedBuf = Buffer.from(keyHex, "hex");
        if (storedBuf.length !== derivedKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(storedBuf, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

// --- RATE LIMITER FOR PIN LOGIN ---
const pinAttemptMap = new Map<string, { count: number; lockedUntil: number }>();
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkPinRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = pinAttemptMap.get(key);
  if (!record) return { allowed: true };
  if (record.lockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000) };
  }
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    pinAttemptMap.delete(key);
  }
  return { allowed: true };
}

function recordFailedPinAttempt(key: string): void {
  const now = Date.now();
  const record = pinAttemptMap.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= MAX_PIN_ATTEMPTS) {
    record.lockedUntil = now + PIN_LOCKOUT_MS;
  }
  pinAttemptMap.set(key, record);
}

function clearPinAttempts(key: string): void {
  pinAttemptMap.delete(key);
}

// --- SANITIZERS & HELPERS ---
function isSafeKey(key: string): boolean {
  return key !== "__proto__" && key !== "constructor" && key !== "prototype";
}

function sanitizeUser(user: any) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.stageName || "DJ User",
    stageName: user.stageName || user.displayName || "DJ User",
    photoURL: user.photoURL || "",
    spreadsheetId: user.spreadsheetId || "",
    createdAt: user.createdAt || "",
    lastLoginAt: user.lastLoginAt || "",
  };
}

// Simple async mutex to prevent concurrent database.json write races
let dbLock: Promise<void> = Promise.resolve();
function withDbLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = dbLock.then(fn, fn);
  dbLock = next.then(() => {}, () => {});
  return next;
}

async function getDb(): Promise<DatabaseSchema> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(data);
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      venues: Array.isArray(parsed.venues) ? parsed.venues : [],
      userSettings: parsed.userSettings && typeof parsed.userSettings === "object" ? parsed.userSettings : {},
      registeredUsers: parsed.registeredUsers && typeof parsed.registeredUsers === "object" ? parsed.registeredUsers : {},
      userData: parsed.userData && typeof parsed.userData === "object" ? parsed.userData : {},
    };
  } catch (error: any) {
    console.warn("Database reading/parsing issue, resetting to safe defaults:", error?.message);
    try {
      await saveDb(defaultDb);
    } catch {}
    return { ...defaultDb };
  }
}

async function saveDb(data: DatabaseSchema): Promise<void> {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error: any) {
    console.error("Failed to write database.json:", error);
    throw error;
  }
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers["authorization"];
  if (!authHeader || typeof authHeader !== "string") return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Sesión requerida." });
  }
  const verified = verifySessionToken(token);
  if (!verified || !isSafeKey(verified.uid)) {
    return res.status(401).json({ error: "INVALID_SESSION", message: "Tu sesión ha expirado o es inválida." });
  }
  req.authUser = verified;
  next();
}

function getPort(): number {
  const args = process.argv.slice(2);
  const portArgIdx = args.findIndex((a) => a === "--port" || a === "-p");
  if (portArgIdx !== -1 && args[portArgIdx + 1]) {
    const p = parseInt(args[portArgIdx + 1], 10);
    if (!isNaN(p)) return p;
  }
  const inlinePort = args.find((a) => a.startsWith("--port="));
  if (inlinePort) {
    const p = parseInt(inlinePort.split("=")[1], 10);
    if (!isNaN(p)) return p;
  }
  return process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
}

async function startServer() {
  const app = express();
  const PORT = getPort();

  app.set("trust proxy", 1);
  app.use(express.json({ limit: "5mb" }));

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- AUTH ROUTES ---

  // Verify whether the Firebase-authenticated Google user already has a DJ profile
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const idToken = extractBearerToken(req);
      if (!idToken) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Token de Google requerido." });
      }
      const verifiedGoogle = await verifyFirebaseIdToken(idToken);
      const db = await getDb();

      const user =
        db.registeredUsers[verifiedGoogle.uid] ||
        Object.values(db.registeredUsers).find(
          (u: any) => u.email?.toLowerCase() === verifiedGoogle.email.toLowerCase()
        );

      res.json({ exists: !!user, user: sanitizeUser(user) });
    } catch (e: any) {
      res.status(401).json({ error: "INVALID_GOOGLE_TOKEN", message: "Token de Google inválido o expirado." });
    }
  });

  // Register a new DJ account (requires verified Firebase ID token + 4-6 digit PIN)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const idToken = extractBearerToken(req);
      if (!idToken) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Token de Google requerido." });
      }
      const verifiedGoogle = await verifyFirebaseIdToken(idToken);
      const { stageName, pin, spreadsheetId } = req.body || {};

      if (typeof stageName !== "string" || !stageName.trim() || stageName.trim().length > 80) {
        return res.status(400).json({ message: "Ingresa un Nombre de DJ válido (máximo 80 caracteres)." });
      }
      if (typeof pin !== "string" || !/^\d{4,6}$/.test(pin)) {
        return res.status(400).json({ message: "El PIN de acceso debe contener entre 4 y 6 dígitos numéricos." });
      }
      if (!isSafeKey(verifiedGoogle.uid)) {
        return res.status(400).json({ message: "Identificador de usuario inválido." });
      }

      const pinHash = await hashPinScrypt(pin);
      const cleanStageName = stageName.trim();
      const cleanSheetId = typeof spreadsheetId === "string" ? spreadsheetId.trim() : "";

      const result = await withDbLock(async () => {
        const db = await getDb();

        const existingUser =
          db.registeredUsers[verifiedGoogle.uid] ||
          Object.values(db.registeredUsers).find(
            (u: any) => u.email?.toLowerCase() === verifiedGoogle.email.toLowerCase()
          );

        if (existingUser) {
          return { conflict: true as const, user: existingUser };
        }

        const nowIso = new Date().toISOString();
        const newUser = {
          uid: verifiedGoogle.uid,
          email: verifiedGoogle.email,
          displayName: verifiedGoogle.displayName || cleanStageName,
          stageName: cleanStageName,
          pinHash,
          photoURL: verifiedGoogle.photoURL || "",
          spreadsheetId: cleanSheetId,
          createdAt: nowIso,
          lastLoginAt: nowIso,
        };

        db.registeredUsers[verifiedGoogle.uid] = newUser;
        if (!db.userData[verifiedGoogle.uid]) {
          db.userData[verifiedGoogle.uid] = { events: [], venues: [] };
        }
        db.userSettings[verifiedGoogle.uid] = {
          language: "es",
          reportEmail: verifiedGoogle.email,
          theme: "dark",
          username: cleanStageName,
          notifications: true,
          reminderTime: "60",
          exportFrequency: "monthly",
          exportMethod: "download",
          cloudBackup: true,
          spreadsheetId: cleanSheetId,
          sheetsSyncEnabled: Boolean(cleanSheetId),
        };

        await saveDb(db);
        return { conflict: false as const, user: newUser };
      });

      if (result.conflict) {
        return res.status(409).json({
          error: "USER_ALREADY_REGISTERED",
          message: "Esta cuenta de Google ya está registrada. Por favor, selecciona 'Iniciar Sesión'.",
        });
      }

      const sessionToken = issueSessionToken(result.user.uid, result.user.email);
      res.json({ success: true, user: sanitizeUser(result.user), sessionToken });
    } catch (e: any) {
      console.error("Register error:", e);
      res.status(500).json({ message: "No se pudo completar el registro de la cuenta." });
    }
  });

  // Login with verified Firebase Google ID token
  app.post("/api/auth/login", async (req, res) => {
    try {
      const idToken = extractBearerToken(req);
      if (!idToken) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Token de Google requerido." });
      }
      const verifiedGoogle = await verifyFirebaseIdToken(idToken);
      const { spreadsheetId } = req.body || {};

      const loginResult = await withDbLock(async () => {
        const db = await getDb();
        let user = db.registeredUsers[verifiedGoogle.uid];
        if (!user) {
          user = Object.values(db.registeredUsers).find(
            (u: any) => u.email?.toLowerCase() === verifiedGoogle.email.toLowerCase()
          );
        }
        if (!user) return null;

        user.lastLoginAt = new Date().toISOString();
        if (typeof spreadsheetId === "string" && spreadsheetId.trim() && !user.spreadsheetId) {
          user.spreadsheetId = spreadsheetId.trim();
        }
        if (verifiedGoogle.photoURL) {
          user.photoURL = verifiedGoogle.photoURL;
        }
        db.registeredUsers[user.uid] = user;
        await saveDb(db);
        return user;
      });

      if (!loginResult) {
        return res.status(404).json({
          error: "USER_NOT_REGISTERED",
          message: "Esta cuenta de Google no se encuentra registrada en DJ Ledger. Por favor, completa el registro primero.",
        });
      }

      const sessionToken = issueSessionToken(loginResult.uid, loginResult.email);
      res.json({ success: true, user: sanitizeUser(loginResult), sessionToken });
    } catch (e: any) {
      res.status(401).json({ error: "INVALID_GOOGLE_TOKEN", message: "No se pudo verificar tu sesión de Google." });
    }
  });

  // Login with mandatory identifier (email or stageName) + PIN (scrypt + rate limiting)
  app.post("/api/auth/pin-login", async (req, res) => {
    try {
      const { identifier, pin } = req.body || {};
      const cleanIdentifier = typeof identifier === "string" ? identifier.trim() : "";

      if (!cleanIdentifier) {
        return res.status(400).json({ message: "Ingresa tu correo electrónico o nombre de DJ." });
      }
      if (typeof pin !== "string" || !/^\d{4,6}$/.test(pin)) {
        return res.status(400).json({ message: "El PIN debe contener entre 4 y 6 dígitos numéricos." });
      }

      const clientIp = req.ip || "unknown";
      const rateKey = `${clientIp}:${cleanIdentifier.toLowerCase()}`;
      const limit = checkPinRateLimit(rateKey);
      if (!limit.allowed) {
        return res.status(429).json({
          error: "TOO_MANY_ATTEMPTS",
          message: `Demasiados intentos fallidos. Intenta nuevamente en ${Math.ceil((limit.retryAfterSeconds || 60) / 60)} minuto(s).`,
        });
      }

      const db = await getDb();
      const users = Object.values(db.registeredUsers || {}) as any[];
      const queryLower = cleanIdentifier.toLowerCase();

      const candidateUsers = users.filter(
        (u: any) =>
          u.email?.toLowerCase() === queryLower || u.stageName?.toLowerCase() === queryLower
      );

      let matchedUser: any = null;
      for (const candidate of candidateUsers) {
        if (candidate.pinHash && (await verifyPinScrypt(pin, candidate.pinHash))) {
          matchedUser = candidate;
          break;
        }
      }

      if (!matchedUser) {
        recordFailedPinAttempt(rateKey);
        return res.status(401).json({
          error: "INVALID_PIN",
          message: "PIN incorrecto o usuario no encontrado.",
        });
      }

      clearPinAttempts(rateKey);

      await withDbLock(async () => {
        const latestDb = await getDb();
        if (latestDb.registeredUsers[matchedUser.uid]) {
          latestDb.registeredUsers[matchedUser.uid].lastLoginAt = new Date().toISOString();
          await saveDb(latestDb);
        }
      });

      const sessionToken = issueSessionToken(matchedUser.uid, matchedUser.email);
      res.json({ success: true, user: sanitizeUser(matchedUser), sessionToken });
    } catch (e) {
      res.status(500).json({ message: "Error al autenticar con PIN." });
    }
  });

  // Delete authenticated user account and all isolated data
  app.delete("/api/auth/account", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      await withDbLock(async () => {
        const db = await getDb();
        delete db.registeredUsers[uid];
        delete db.userData[uid];
        delete db.userSettings[uid];
        await saveDb(db);
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "No se pudo eliminar la cuenta." });
    }
  });

  // --- EVENTS API ROUTES (STRICTLY ISOLATED BY AUTHENTICATED UID) ---
  app.get("/api/events", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const db = await getDb();
      res.json(db.userData?.[uid]?.events || []);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const eventPayload = req.body;
      if (!eventPayload || typeof eventPayload !== "object" || typeof eventPayload.id !== "string") {
        return res.status(400).json({ error: "Invalid event payload" });
      }
      const cleanEvent = { ...eventPayload };
      delete cleanEvent.userId;

      await withDbLock(async () => {
        const db = await getDb();
        if (!db.userData[uid]) db.userData[uid] = { events: [], venues: [] };
        db.userData[uid].events.unshift(cleanEvent);
        await saveDb(db);
      });
      res.json(cleanEvent);
    } catch (e) {
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.put("/api/events", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const eventPayload = req.body;
      if (!eventPayload || typeof eventPayload !== "object" || typeof eventPayload.id !== "string") {
        return res.status(400).json({ error: "Invalid event payload" });
      }
      const cleanEvent = { ...eventPayload };
      delete cleanEvent.userId;

      const updated = await withDbLock(async () => {
        const db = await getDb();
        if (!db.userData[uid]) return false;
        const uIdx = db.userData[uid].events.findIndex((e) => e.id === cleanEvent.id);
        if (uIdx === -1) return false;
        db.userData[uid].events[uIdx] = cleanEvent;
        await saveDb(db);
        return true;
      });

      if (!updated) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(cleanEvent);
    } catch (e) {
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/events", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "ID is required" });

      await withDbLock(async () => {
        const db = await getDb();
        if (db.userData[uid]?.events) {
          db.userData[uid].events = db.userData[uid].events.filter((e) => e.id !== id);
          await saveDb(db);
        }
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // --- VENUES API ROUTES (STRICTLY ISOLATED BY AUTHENTICATED UID) ---
  app.get("/api/venues", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const db = await getDb();
      res.json(db.userData?.[uid]?.venues || []);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch venues" });
    }
  });

  app.post("/api/venues", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const venuePayload = req.body;
      if (!venuePayload || typeof venuePayload !== "object" || typeof venuePayload.id !== "string") {
        return res.status(400).json({ error: "Invalid venue payload" });
      }
      const cleanVenue = { ...venuePayload };
      delete cleanVenue.userId;

      await withDbLock(async () => {
        const db = await getDb();
        if (!db.userData[uid]) db.userData[uid] = { events: [], venues: [] };
        db.userData[uid].venues.push(cleanVenue);
        await saveDb(db);
      });
      res.json(cleanVenue);
    } catch (e) {
      res.status(500).json({ error: "Failed to create venue" });
    }
  });

  app.put("/api/venues", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const venuePayload = req.body;
      if (!venuePayload || typeof venuePayload !== "object" || typeof venuePayload.id !== "string") {
        return res.status(400).json({ error: "Invalid venue payload" });
      }
      const cleanVenue = { ...venuePayload };
      delete cleanVenue.userId;

      const updated = await withDbLock(async () => {
        const db = await getDb();
        if (!db.userData[uid]) return false;
        const uIdx = db.userData[uid].venues.findIndex((v) => v.id === cleanVenue.id);
        if (uIdx === -1) return false;
        db.userData[uid].venues[uIdx] = cleanVenue;
        await saveDb(db);
        return true;
      });

      if (!updated) {
        return res.status(404).json({ error: "Venue not found" });
      }
      res.json(cleanVenue);
    } catch (e) {
      res.status(500).json({ error: "Failed to update venue" });
    }
  });

  app.delete("/api/venues", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "ID is required" });

      await withDbLock(async () => {
        const db = await getDb();
        if (db.userData[uid]?.venues) {
          db.userData[uid].venues = db.userData[uid].venues.filter((v) => v.id !== id);
          await saveDb(db);
        }
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete venue" });
    }
  });

  // --- USER SETTINGS API ROUTES (STRICTLY ISOLATED BY AUTHENTICATED UID) ---
  app.get("/api/user-settings", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const db = await getDb();
      const settings = db.userSettings?.[uid] || null;
      res.json({ settings });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch user settings" });
    }
  });

  app.post("/api/user-settings", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const { settings } = req.body || {};
      if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
        return res.status(400).json({ error: "Invalid settings payload" });
      }

      await withDbLock(async () => {
        const db = await getDb();
        db.userSettings[uid] = settings;
        if (db.registeredUsers[uid] && typeof settings.spreadsheetId === "string") {
          db.registeredUsers[uid].spreadsheetId = settings.spreadsheetId;
        }
        await saveDb(db);
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to save user settings" });
    }
  });

  // --- IMPORT / RESTORE DATABASE (STRICTLY ISOLATED BY AUTHENTICATED UID) ---
  app.post("/api/import", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const { events, venues } = req.body || {};

      await withDbLock(async () => {
        const db = await getDb();
        if (!db.userData[uid]) db.userData[uid] = { events: [], venues: [] };
        if (Array.isArray(events)) db.userData[uid].events = events;
        if (Array.isArray(venues)) db.userData[uid].venues = venues;
        await saveDb(db);
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to import/restore database" });
    }
  });

  app.post("/api/send-report", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { email, report } = req.body || {};
      if (typeof email !== "string" || !email.includes("@") || !report?.title) {
        return res.status(400).json({ message: "Correo y título del reporte son requeridos." });
      }
      res.json({ success: true, message: "Report generated successfully." });
    } catch (error: any) {
      res.status(500).json({
        message: error.message || "Failed to send the report.",
      });
    }
  });

  // --- USER-SCOPED GOOGLE DRIVE BACKUP (ONLY EXPORTS CURRENT USER'S DATA) ---
  app.post("/api/backup/drive", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const googleToken = req.headers["x-google-access-token"];
      if (!googleToken || typeof googleToken !== "string") {
        return res.status(401).json({ error: "Missing Google Drive access token" });
      }

      const db = await getDb();
      const userExport = {
        exportedAt: new Date().toISOString(),
        user: sanitizeUser(db.registeredUsers[uid]),
        settings: db.userSettings[uid] || {},
        events: db.userData[uid]?.events || [],
        venues: db.userData[uid]?.venues || [],
      };

      const fileContent = JSON.stringify(userExport, null, 2);
      const fileName = `dj-ledger-backup-${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;

      const boundary = "-------314159265358979323846";
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        mimeType: "application/json",
        description: "DJ Ledger private user JSON backup",
      };

      const multipartRequestBody =
        delimiter +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        fileContent +
        closeDelim;

      const driveResponse = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${googleToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!driveResponse.ok) {
        const errorText = await driveResponse.text();
        return res.status(driveResponse.status).json({ error: errorText });
      }

      const driveFile = await driveResponse.json();
      res.json({ success: true, file: driveFile });
    } catch (error: any) {
      console.error("Drive backup error:", error);
      res.status(500).json({ error: error.message || "Failed to backup to Drive" });
    }
  });

  // Mount Vite middleware for SPA
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = await fs.readFile(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        if (vite.ssrFixStacktrace) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.use((req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DJ Ledger server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
