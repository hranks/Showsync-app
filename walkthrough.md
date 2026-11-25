# Security Summary

**Reviewed Files**: 22
**Issues Resolved**: 7

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Hardcoded Backdoor PIN | `server.ts` | 197 | A static master PIN (`309410`) granted immediate login as a fixed account without Google authentication. | Critical | Fixed | Removed the hardcoded PIN completely; all accounts authenticate through verified Google ID tokens or user-configured PINs. |
| Missing Server Auth & User Isolation | `server.ts`, `src/hooks/use-events-store.ts`, `src/hooks/use-venues-store.ts` | 240–422 | Protected event, venue, settings, and import routes accepted unauthenticated requests and fell back to shared global arrays. | Critical | Fixed | Enforced `requireAuth` Bearer session verification on every data route and isolated all reads/writes strictly by the verified `uid`. |
| Unverified Google Login Payload | `server.ts`, `src/components/auth/login-screen.tsx` | 78–187 | Login, verification, and registration routes trusted `uid` and `email` sent in the request body without verifying a Google token. | High | Fixed | Added RS256 Firebase ID token verification against Google's official x509 public certificates on `/api/auth/verify`, `/api/auth/login`, and `/api/auth/register`. |
| Weak PIN Hashing & Exposed Hashes | `server.ts`, `src/components/auth/login-screen.tsx` | 53, 88, 121 | PINs were hashed client-side with unsalted SHA-256, searched without requiring an identifier, lacked rate limiting, and `pinHash` was returned in API JSON responses. | High | Fixed | Moved PIN hashing to the server using `crypto.scrypt` with a 16-byte random salt, required an identifier + 5-attempt lockout on `/api/auth/pin-login`, and stripped `pinHash` from all API responses. |
| Multi-User Data Leak in Drive Backup | `server.ts` | 444–451 | `POST /api/backup/drive` read and uploaded the entire `database.json` file (containing all registered users, settings, and PIN hashes) to the active user's Google Drive. | Critical | Fixed | Scoped `/api/backup/drive` to export only the authenticated user's own sanitized profile, settings, events, and venues. |
| Persistent Token Storage in Browser | `src/lib/auth.ts`, `src/hooks/use-auth-store.ts` | 26–103 | Google OAuth access tokens were stored in `localStorage`. | Medium | Fixed | Moved both Google OAuth access tokens and app session tokens strictly into JavaScript memory, with silent session restoration from active Firebase sign-in. |
| Outdated Dependencies | `package.json` | 40, 55 | `zod` (`4.4.3`) and `express` transitive `proxy-addr`/`body-parser` had known advisories. | High | Fixed | Upgraded `zod` and `express` to patched versions and verified zero critical findings. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Google Identity Verification | `server.ts` | Verifies RS256 signatures, `aud`, `iss`, `sub`, and expiration timestamps of Firebase ID tokens using cached Google x509 certificates. |
| Session Signing | `server.ts` | Issues HMAC-SHA256 Bearer session tokens signed with `process.env.SESSION_SECRET` (or an ephemeral 32-byte in-memory secret) and verified with `crypto.timingSafeEqual`. |
| PIN Storage & Brute-Force Protection | `server.ts` | Hashes PINs using per-user salted `scrypt` (`64`-byte derived key), compares with `crypto.timingSafeEqual`, and locks repeated failed attempts for 15 minutes. |
| Multi-User Data Isolation | `server.ts`, `src/hooks/use-settings-store.tsx` | Every event, venue, settings, import, backup, and account deletion route derives `uid` exclusively from the verified server session token. |
| Prototype Key & Input Validation | `server.ts`, `src/components/events/*` | Rejects unsafe keys (`__proto__`, `constructor`, `prototype`), validates payloads, and enforces Zod schema validation on event and venue forms. |

---

## PoC Verification

### 1. Hardcoded Master PIN & Unauthenticated PIN Enumeration

#### Summary
| Field | Value |
|---|---|
| Issue Type | Hardcoded Admin Backdoor & Missing Rate Limit |
| Impact | Critical |
| Affected File | `server.ts:189` |
| Test Scenario | `POST /api/auth/pin-login` with `{ "identifier": "ranksnica@gmail.com", "pin": "309410" }` or `{ "pin": "1234" }` (no identifier) |

#### How It Was Fixed
Removed the static master PIN branch, required a non-empty `identifier` alongside a 4–6 digit numeric `pin`, enforced a 5-attempt lockout per IP + identifier, and validated against server-side salted `scrypt` hashes using `crypto.timingSafeEqual`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Request hits `POST /api/auth/pin-login` in `server.ts` without `identifier` or with `309410` | Enters handler |
| 2 | If `identifier` is empty, `server.ts` immediately returns HTTP `400`; otherwise checks `checkPinRateLimit(rateKey)` | Unidentified requests rejected / Brute-force throttled |
| 3 | Looks up matching user by `email` or `stageName` and runs `verifyPinScrypt(pin, candidate.pinHash)` | Static master PIN no longer exists; returns `401` and records failed attempt |
| 4 | Final result | **Handled Safely** |

#### Conclusion
**Fix Verified** - Neither the removed hardcoded master PIN nor identifier-less PIN guessing can authenticate any account.

---

### 2. Cross-User Data Access & Database Leak in Google Drive Backup

#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Sign-In Enforcement & Multi-User Backup Leak |
| Impact | Critical |
| Affected File | `server.ts:240`, `server.ts:437` |
| Test Scenario | Unauthenticated `GET /api/events` or authenticated `POST /api/backup/drive` attempting to read another user's records |

#### How It Was Fixed
Added `requireAuth` middleware across all `/api/events`, `/api/venues`, `/api/user-settings`, `/api/import`, `/api/backup/drive`, and `/api/auth/account` routes, deriving `uid` solely from the verified HMAC session token and exporting only `db.userData[uid]` during Drive backups.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Unauthenticated request arrives at `GET /api/events` or `POST /api/backup/drive` | Hits `requireAuth` middleware |
| 2 | `extractBearerToken(req)` / `verifySessionToken(token)` fails | Immediately returns HTTP `401` |
| 3 | Authenticated user calls `POST /api/backup/drive` with valid session token and `X-Google-Access-Token` | Reads only `sanitizeUser(db.registeredUsers[uid])`, `db.userSettings[uid]`, and `db.userData[uid]` |
| 4 | Final result | **Handled Safely** |

#### Conclusion
**Fix Verified** - Unauthenticated callers are blocked and authenticated users can only access or back up their own isolated data.

---

### 3. Spoofed Google Identity on Login / Registration

#### Summary
| Field | Value |
|---|---|
| Issue Type | Unverified Identity Claims in Request Body |
| Impact | High |
| Affected File | `server.ts:78`, `server.ts:94`, `server.ts:155` |
| Test Scenario | `POST /api/auth/login` with spoofed `{ "uid": "victim_uid", "email": "victim@gmail.com" }` and no valid Google ID token |

#### How It Was Fixed
Updated `/api/auth/verify`, `/api/auth/register`, and `/api/auth/login` to require an `Authorization: Bearer <firebaseIdToken>` header and cryptographically verify its RS256 signature, audience, issuer, and expiration against Google's public x509 certificates before reading `uid` and `email` from the verified token payload.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Request with spoofed body arrives at `POST /api/auth/login` | Enters handler |
| 2 | `extractBearerToken(req)` + `verifyFirebaseIdToken(idToken)` executes | Missing or forged JWT fails RS256 / `aud` / `iss` check |
| 3 | Catch block returns HTTP `401` (`INVALID_GOOGLE_TOKEN`) | Body `uid`/`email` ignored completely |
| 4 | Final result | **Handled Safely** |

#### Conclusion
**Fix Verified** - Identity claims in the request body are ignored; only cryptographically verified Google tokens can log in or register.
