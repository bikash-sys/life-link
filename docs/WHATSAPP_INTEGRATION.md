# LifeLink — WhatsApp Client Integration & Notification Service

**Project:** LifeLink (Community Blood & Essential Medicine Availability Network)  
**Package:** [`whatsapp-msg-client@0.1.4`](https://github.com/bikash-sys/wa-client)  
**Integration Status:** Active & Tested  
**Date:** October 14, 2026  

---

## 1. Overview & Architecture

The LifeLink platform integrates `whatsapp-msg-client` to deliver automatic, real-time messaging notifications to donors, healthcare workers, and patients.

### Architectural Principles
* **Singleton Client Lifecycle:** Exactly one WhatsApp client instance is created and maintained for the server process. Clients are never created per-request.
* **Non-Blocking Resilience:** WhatsApp connection states or delivery failures **never** block HTTP responses, fail database transactions, or crash the server.
* **Zero Credential Exposure:** Authentication files and session credentials reside in a persistent directory excluded from version control (`.wauth/`). No session tokens or QR data are exposed over HTTP endpoints.
* **Strict International Phone Handling:** Only numbers with valid country codes and lengths are delivered; ambiguous national numbers are rejected rather than guessed.

---

## 2. Configuration & Environment Variables

WhatsApp notifications are controlled by environment variables configured in `.env` (refer to [`.env.example`](file:///Users/bikash/life%20link/.env.example)):

```bash
# Enable or disable WhatsApp notifications globally
WHATSAPP_ENABLED=true

# Named session profile (default: 'lifelink')
WHATSAPP_SESSION=lifelink

# Storage directory for persistent session credentials (default: './.wauth')
WHATSAPP_AUTH_DIR=./.wauth
```

> [!NOTE]
> If `WHATSAPP_ENABLED` is set to `false` or omitted, LifeLink starts up normally with WhatsApp disabled. All registration and inventory operations continue without interruption.

---

## 3. First-Time QR Code Authentication Walkthrough

When launching the backend for the first time with `WHATSAPP_ENABLED=true`, pair your WhatsApp account via terminal QR code:

### Step 1: Start the Backend
```bash
npm run dev:server
# or from root:
npm --prefix server run dev
```

### Step 2: Observe Terminal QR Output
If no saved session credentials exist in `.wauth/`, `whatsapp-msg-client` automatically renders an ASCII QR code directly in the terminal alongside instructions:
```text
[LifeLink API] Server listening on port 5001
[LifeLink WhatsApp] Initializing client (session: 'lifelink', storage: '/Users/bikash/life link/server/.wauth')...

(Open WhatsApp → Linked Devices → Link a Device)

[LifeLink WhatsApp] --------------------------------------------------
[LifeLink WhatsApp] ACTION REQUIRED: First-time authentication QR generated.
[LifeLink WhatsApp] Scan the QR code above in terminal using WhatsApp:
[LifeLink WhatsApp] Open WhatsApp -> Settings / Menu -> Linked Devices -> Link a Device
[LifeLink WhatsApp] --------------------------------------------------
```

### Step 3: Scan with Your Phone
1. Open **WhatsApp** on your mobile device.
2. Navigate to **Settings** (iOS) or **Three Dots Menu** (Android) $\to$ **Linked Devices**.
3. Tap **Link a Device** and point your phone camera at the terminal QR code.
4. Once scanned, the terminal immediately logs:
   ```text
   [LifeLink WhatsApp] Underlying transport connection opened.
   [LifeLink WhatsApp] Connected and ready.
   ```

### Step 4: Subsequent Restarts (Automatic Session Reuse)
Session credentials, auth keys, and Signal ratchet states are stored in `.wauth/lifelink/`. On subsequent backend restarts:
* The client reuses the credentials on disk.
* Connection resumes automatically without re-prompting for a QR code.
* If you unlink the device from your phone, the client logs:
  `[LifeLink WhatsApp] Session was logged out. A new QR code will be generated on next connect.`

---

## 4. Notifications & Notification Lifecycle

### 4.1 Welcome Notification (Active on Registration)
* **Trigger:** Dispatched immediately following successful user registration in [`server/src/controllers/auth.controller.ts`](file:///Users/bikash/life%20link/server/src/controllers/auth.controller.ts).
* **Delivery Invariant:** Dispatched strictly **after** the user record has been persisted to PostgreSQL.
* **Message Template:**
  ```text
  Hi {{name}}! 👋

  Welcome to LifeLink!

  Your account has been created successfully. LifeLink helps connect people with available blood and essential medicines when they need them.

  Thank you for joining our community! ❤️
  ```

### 4.2 Request Submission Notification (Ready in Service)
* **Trigger:** Prepared in [`server/src/services/notification.service.ts`](file:///Users/bikash/life%20link/server/src/services/notification.service.ts) (`sendRequestSubmittedNotification`).
* **Message Template:**
  ```text
  Hi {{name}}! 👋

  Your LifeLink request has been submitted successfully.

  Request ID: {{requestId}}
  Item: {{itemName}}
  Quantity: {{quantity}}
  Status: Pending Review

  We'll notify you when your request is reviewed.
  ```

### 4.3 Request Approval Notification (Ready with Deduplication)
* **Trigger:** Prepared in [`server/src/services/notification.service.ts`](file:///Users/bikash/life%20link/server/src/services/notification.service.ts) (`sendRequestApprovedNotification`).
* **Deduplication Safeguard:** Uses an in-memory tracking set to ensure that repeated approval requests for the same requisition do not dispatch duplicate messages to the user.
* **Message Template:**
  ```text
  Hi {{name}}! ✅

  Good news! Your LifeLink request has been approved.

  Request ID: {{requestId}}
  Item: {{itemName}}
  Status: Approved

  Please check LifeLink for further details.
  ```

---

## 5. Phone Number Handling & Security

To prevent delivery failures and respect privacy:
1. **International Normalization (`validateAndNormalizePhone`):**
   - Strips formatting symbols (`+`, spaces, hyphens, parentheses).
   - Validates that the number has a valid international length (8–15 digits).
   - **No Country Guessing:** Numbers with 10 or fewer digits without an explicit country code are rejected with `AMBIGUOUS_MISSING_COUNTRY_CODE`.
2. **PII Masking (`maskPhone`):**
   - Application and debug logs only print masked numbers (e.g., `***4567`) to comply with healthcare data privacy requirements.
3. **User Notification Consent:**
   - The current schema does not include a dedicated `whatsapp_opt_in` boolean column. For Phase 2, we recommend adding an explicit `notification_preferences JSONB` or `whatsapp_consent BOOLEAN DEFAULT TRUE` column to user profiles to allow users to manage their opt-in preferences.

---

## 6. Phase 9: Node Engine Warning Investigation

During package installation, npm produced the following warning:
```text
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: '@prisma/streams-local@0.1.11',
npm warn EBADENGINE   required: { bun: '>=1.2.0', node: '>=22.0.0' },
npm warn EBADENGINE   current: { node: 'v20.19.5', npm: '10.8.2' }
npm warn EBADENGINE }
```

### Technical Assessment:
* **Source:** Investigated via `npm ls @prisma/streams-local`. The package is pulled in transitively under `devDependencies` via `prisma@7.10.0` $\to$ `@prisma/dev@0.24.17`.
* **Runtime Impact:** **Zero impact.** LifeLink's runtime server uses `@prisma/client` and `@prisma/adapter-pg`. `@prisma/streams-local` is not referenced, imported, or executed during API runtime or testing.
* **Action:** No forced upgrade (`npm audit fix --force`) or breaking Node.js version change was performed, preserving stability on Node.js 20.19.5 LTS.

---

## 7. Testing & Verification Summary

The WhatsApp integration is verified with automated tests in [`server/tests/whatsappNotification.test.ts`](file:///Users/bikash/life%20link/server/tests/whatsappNotification.test.ts).

```text
 ✓ tests/whatsappNotification.test.ts (14 tests) 56ms
   ✓ 1. Phone Number Validation and Normalization (5 tests)
   ✓ 2. WhatsApp Service Lifecycle & Fault Tolerance (4 tests)
   ✓ 3. Notification Service & Template Formatting (4 tests)
   ✓ 4. Registration API Endpoint Resilience (1 test)

Total Unit Tests: 95 passed (100%)
Total Integration Tests: 14 passed (100%)
TypeScript Check: 0 errors
tsc Build: 0 errors (dist/ generated)
```
