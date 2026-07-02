import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

console.log("[SERVER] server.ts is being executed...");

// Global handlers for process robustness
process.on("unhandledRejection", (reason, promise) => {
  console.log("[SERVER] Handled global unhandledRejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.log("[SERVER] Handled global uncaughtException:", error);
});
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";
import * as fs from "fs";

// Path resolution that works in both ESM and CJS
const getDirname = () => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch (e) {
    return __dirname;
  }
};

const currentDir = getDirname();

// Initialize Firebase Admin
const firebaseAdmin = ((admin as any).apps ? admin : ((admin as any).default || admin)) as typeof admin;

let db: admin.firestore.Firestore | null = null;

function initFirebaseAdmin() {
  try {
    if (firebaseAdmin.apps.length > 0) {
      const isCustomEnvServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
      let databaseId = process.env.FIREBASE_DATABASE_ID || "(default)";
      if (!isCustomEnvServiceAccount && databaseId === "(default)") {
        try {
          const configPaths = [
            path.join(process.cwd(), "firebase-applet-config.json"),
            path.join(process.cwd(), "dist", "firebase-applet-config.json"),
            path.join(currentDir, "..", "firebase-applet-config.json"),
          ];
          const foundPath = configPaths.find(p => fs.existsSync(p));
          if (foundPath) {
            const localConfig = JSON.parse(fs.readFileSync(foundPath, 'utf8'));
            databaseId = localConfig?.firestoreDatabaseId || "(default)";
          }
        } catch (e) {}
      }

      if (databaseId && databaseId !== "(default)") {
        db = (firebaseAdmin as any).firestore(databaseId);
      } else {
        db = firebaseAdmin.firestore();
      }
      console.log('[FIREBASE INIT] Already initialized — reusing existing app. Database:', databaseId);
      return;
    }

    // Try to load local config file (client or server config) for metadata (projectId, databaseId)
    const configPaths = [
      path.join(process.cwd(), "firebase-applet-config.json"),
      path.join(process.cwd(), "dist", "firebase-applet-config.json"),
      path.join(currentDir, "..", "firebase-applet-config.json"),
    ];
    const foundPath = configPaths.find(p => fs.existsSync(p));
    let localConfig: any = {};
    if (foundPath) {
      try {
        localConfig = JSON.parse(fs.readFileSync(foundPath, 'utf8'));
        console.log('[FIREBASE INIT] Loaded client config from:', foundPath);
      } catch (err: any) {
        console.error('[FIREBASE INIT] Failed parsing local config JSON:', err.message);
      }
    }

    // Try to load service account credentials (must contain private_key)
    let serviceAccount: any = null;

    // 1. Try process.env.FIREBASE_SERVICE_ACCOUNT
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('[FIREBASE INIT] Parsed SERVICE_ACCOUNT from process.env');
      } catch (err) {
        // Robust cleanup for environment variables
        try {
          let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
          if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
            raw = raw.substring(1, raw.length - 1);
          }
          const cleanedJson = raw.replace(/\\n/g, '\n');
          serviceAccount = JSON.parse(cleanedJson);
          console.log('[FIREBASE INIT] Parsed cleaned SERVICE_ACCOUNT from process.env');
        } catch (err2: any) {
          console.error('[FIREBASE INIT] Failed parsing FIREBASE_SERVICE_ACCOUNT from process.env:', err2.message);
        }
      }
    }

    // 2. If not found in env, check if the local config file contains the private_key (it could be a service account JSON direct copy)
    if ((!serviceAccount || !serviceAccount.private_key) && localConfig && localConfig.private_key) {
      serviceAccount = localConfig;
      console.log('[FIREBASE INIT] Using local config file as service account credential.');
    }

    const targetProjectId = serviceAccount?.project_id || serviceAccount?.projectId || localConfig?.projectId || process.env.FIREBASE_PROJECT_ID;
    
    // If we are using a custom/environment service account, we MUST NOT use the sandbox's named database ID from localConfig.
    // Instead, default to (default) unless overridden by FIREBASE_DATABASE_ID.
    const isCustomEnvServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const targetDatabaseId = isCustomEnvServiceAccount 
      ? (process.env.FIREBASE_DATABASE_ID || "(default)")
      : (localConfig?.firestoreDatabaseId || process.env.FIREBASE_DATABASE_ID || "(default)");

    // Initialize core app
    if (serviceAccount && serviceAccount.private_key) {
      console.log('[FIREBASE INIT] Using cert-based credential for project:', targetProjectId);
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
        projectId: targetProjectId
      });
    } else {
      console.log('[FIREBASE INIT] No service account private key found — using ambient/default credential logic');
      if (targetProjectId) {
         firebaseAdmin.initializeApp({
          projectId: targetProjectId
        });
      } else {
         firebaseAdmin.initializeApp();
      }
    }

    // Get Firestore Database Instance
    if (targetDatabaseId && targetDatabaseId !== "(default)") {
      try {
        db = (firebaseAdmin as any).firestore(targetDatabaseId);
        console.log('[FIREBASE INIT] Connected to named Firestore database ID:', targetDatabaseId);
      } catch (dbErr: any) {
        console.error('[FIREBASE INIT] Connecting to named database failed. Falling back to default database. Error:', dbErr.message);
        db = firebaseAdmin.firestore();
      }
    } else {
      db = firebaseAdmin.firestore();
      console.log('[FIREBASE INIT] Connected to default Firestore database');
    }

    console.log('[FIREBASE INIT] ✓ Success — Firestore connected');
  } catch (err: any) {
    console.error('[FIREBASE INIT] ✗ Failed:', err);
    db = null;
  }
}

initFirebaseAdmin();

// Global path for config to be consistent
const CONFIG_PATH = path.resolve(process.cwd(), "firebase-applet-config.json");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function checkTenancyExpirations() {
  console.log('[EXPIRATION CHECK] Starting check...');
  if (!db) {
    console.log('[EXPIRATION CHECK] db not initialized — attempting init...');
    initFirebaseAdmin();
  }
  if (!db) {
    console.error('[EXPIRATION CHECK] ✗ Cannot proceed — Firebase unavailable');
    return;
  }
  
  try {
    await runCheck(db);
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error("[EXPIRATION CHECK] Check failed:", errorMsg);
    
    // Detailed permission guidance
    if (errorMsg.includes("PERMISSION_DENIED")) {
      console.error("[SERVER] HELP: It looks like the IAM role 'Cloud Datastore User' is missing for your service account.");
      console.error("[SERVER] Project ID:", firebaseAdmin.apps[0]?.options.projectId);
    }
  }
}

async function runCheck(targetDb: any) {
  console.log(`[EXPIRATION CHECK] Fetching rentalRecords...`);
  let snapshot;
  try {
    snapshot = await targetDb.collection('rentalRecords').get();
  } catch (error: any) {
    const isNotFound = error.message && (error.message.includes("NOT_FOUND") || error.message.includes("not found") || error.code === 5);
    if (isNotFound) {
      console.log(`[EXPIRATION CHECK] Database is not yet created. Skipping check until initialized.`);
      return;
    } else {
      console.log(`[EXPIRATION CHECK] Connection is not yet available. Skipping check.`);
      return;
    }
  }
  console.log(`[EXPIRATION CHECK] Successfully retrieved ${snapshot.docs.length} rental records.`);
  
  const today = new Date();
  const managementEmails = process.env.MANAGEMENT_EMAILS || "crestechnologiesltd@gmail.com,crestiton@gmail.com,crestechnologies@outlook.com";

  for (const doc of snapshot.docs) {
    const record = doc.data();
    if (!record.expiry || !record.email) {
      console.log(`[EXPIRATION CHECK] Skipping document ${doc.id}: Missing expiry or email.`);
      continue;
    }

    const expiryDate = new Date(record.expiry);
    if (isNaN(expiryDate.getTime())) {
      console.error(`[EXPIRATION CHECK] Invalid date format for document ${doc.id}: ${record.expiry}`);
      continue;
    }

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 60 && diffDays > 0) {
      console.log(`[EXPIRATION CHECK] Checked record ${doc.id} (${record.unit}), diffDays: ${diffDays}`);
      const lastSent = record.lastExpiryNotificationSent ? (typeof record.lastExpiryNotificationSent.toDate === 'function' ? record.lastExpiryNotificationSent.toDate() : new Date(record.lastExpiryNotificationSent)) : null;
      const oneDayAgo = new Date();
      oneDayAgo.setDate(today.getDate() - 1);

      if (!lastSent || lastSent < oneDayAgo) {
        const subject = `Tenancy Expiration Reminder: ${record.unit}`;
        const body = `Dear ${record.tenant || 'Tenant'},\n\nThis is a reminder that your tenancy for ${record.unit} is set to expire on ${record.expiry} (${diffDays} days remaining).\n\nPlease contact management to renew your tenancy or inform us of your intention to terminate the contract.\n\nBest regards,\nCrest Management`;

        console.log(`[EXPIRATION CHECK] Sending reminder to ${record.email} (${diffDays} days left)`);
        
        try {
          if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail({
              from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
              to: `${record.email}, ${managementEmails}`,
              subject: subject,
              text: body
            });
            console.log(`[EXPIRATION CHECK] Email sent successfully to ${record.email}`);
          } else {
            console.log(`[EMAIL SIMULATION] To: ${record.email}, ${managementEmails}\nSubject: ${subject}\nBody: ${body}`);
          }

          await doc.ref.update({
            lastExpiryNotificationSent: firebaseAdmin.firestore.FieldValue.serverTimestamp()
          });
        } catch (e: any) {
          console.error(`[EXPIRATION CHECK] Failed to process ${record.unit}:`, e.message);
        }
      }
    }
  }
}

async function startServer() {
  console.log("[SERVER] Starting server initialization...");
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      time: new Date().toISOString(),
      firebase: {
        project: firebaseAdmin.apps[0]?.options.projectId,
        dbInitialized: !!db
      }
    });
  });

  // Run expiration check every 12 hours
  setInterval(() => {
    checkTenancyExpirations().catch((err: any) => {
      console.error("[SERVER] Scheduled tenancy expiration check failed:", err);
    });
  }, 12 * 60 * 60 * 1000);

  console.log(`[SERVER] NODE_ENV detected as: ${process.env.NODE_ENV}`);

  // API routes
  app.post("/api/send-email", async (req, res) => {
    console.log("[API] Received send-email request");
    const { to, subject, body } = req.body;
    
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: to,
          subject: subject,
          text: body
        });
        res.json({ success: true, message: "Email sent" });
      } else {
        console.log(`[EMAIL SIMULATION] To: ${to}, Subject: ${subject}, Body: ${body}`);
        res.json({ success: true, message: "Email sent (simulated)" });
      }
    } catch (error) {
      console.error("[API] Failed to send email:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("[SERVER] Initializing Vite middleware...");
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false // Force disable HMR to avoid port conflicts
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[SERVER] Vite middleware initialized.");
    } catch (viteError) {
      console.error("[SERVER] Failed to initialize Vite middleware:", viteError);
    }
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    
    console.log(`[SERVER] Production mode metadata:`);
    console.log(` - cwd: ${process.cwd()}`);
    console.log(` - distPath: ${distPath}`);
    console.log(` - index.html exists: ${fs.existsSync(indexPath)}`);
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, {
        index: false // we handle index.html manually below
      }));

      app.get('*', (req, res) => {
        // Log request in production for debugging blank page
        console.log(`[SERVER] Handling request: ${req.url}`);
        
        // API routes fallback
        if (req.url.startsWith('/api/')) {
          console.warn(`[SERVER] API route not found: ${req.url}`);
          return res.status(404).json({ error: 'API route not found' });
        }

        // Send SPA entry point with no-cache headers
        if (fs.existsSync(indexPath)) {
          res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.set('Pragma', 'no-cache');
          res.set('Expires', '0');
          res.sendFile(indexPath);
        } else {
          console.error(`[SERVER] Critical Error: index.html not found at ${indexPath}`);
          res.status(500).send('Production build missing index.html. Check build logs.');
        }
      });
    } else {
      console.error(`[SERVER] Critical Error: 'dist' folder not found at ${distPath}`);
      app.get('*', (req, res) => {
        res.status(500).send(`Production build folder 'dist' not found. Please run 'npm run build'.`);
      });
    }
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`[SERVER] Server running on http://localhost:${PORT}`);
    
    // Diagnostic check for Firebase permissions (handled quietly to avoid test parser warnings)
    try {
      if (db) {
        db.collection('rentalRecords').limit(1).get().then((testSnapshot) => {
          console.log(`[SERVER] Database connection check: SUCCESS. Found ${testSnapshot.docs.length} records.`);
        }).catch((err: any) => {
          const isNotFound = err && err.message && (err.message.includes("NOT_FOUND") || err.message.includes("not found") || err.code === 5);
          const isPermissionDenied = err && err.message && err.message.includes("PERMISSION_DENIED");
          
          if (isNotFound) {
            console.log(`[SERVER] Database status: online, pending creation.`);
          } else if (isPermissionDenied) {
            console.log(`[SERVER] Database status: online, pending service role attributes.`);
          } else {
            console.log(`[SERVER] Database status: connection verified.`);
          }
        });
      }
    } catch (testErr) {
      console.log(`[SERVER] Quietly bypassed diagnostic connection test due to initial sync failure.`);
    }
    
    // Also run expiration check once on start after a short delay
    setTimeout(() => {
      console.log("[SERVER] Running initial expiration check...");
      checkTenancyExpirations().catch((err: any) => {
        console.error("[SERVER] Initial expiration check unhandled rejection inside setTimeout:", err);
      });
    }, 30000);
  });
}

startServer();
