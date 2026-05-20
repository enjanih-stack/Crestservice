import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

console.log("[SERVER] server.ts is being executed...");
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
let db: admin.firestore.Firestore | null = null;

function initFirebaseAdmin() {
  try {
    if (admin.apps.length > 0) {
      db = admin.firestore();
      console.log('[FIREBASE INIT] Already initialized — reusing existing app');
      return;
    }
    let serviceAccount;
    const configPaths = [
      path.join(process.cwd(), "firebase-applet-config.json"),
      path.join(process.cwd(), "dist", "firebase-applet-config.json"),
      path.join(currentDir, "..", "firebase-applet-config.json"),
    ];
    const foundPath = configPaths.find(p => fs.existsSync(p));
    if (foundPath) {
      serviceAccount = JSON.parse(fs.readFileSync(foundPath, 'utf8'));
      console.log('[FIREBASE INIT] Using config file:', foundPath);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('[FIREBASE INIT] Using FIREBASE_SERVICE_ACCOUNT env var');
    } else {
      throw new Error('No Firebase credentials found — set FIREBASE_SERVICE_ACCOUNT env var');
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    console.log('[FIREBASE INIT] ✓ Success — Firestore connected');
  } catch (err) {
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
    console.error("[EXPIRATION CHECK] Check failed:", error.message);
    
    // Detailed permission guidance
    if (error.message.includes("PERMISSION_DENIED")) {
      console.error("[SERVER] HELP: It looks like the IAM role 'Cloud Datastore User' is missing for your service account.");
      console.error("[SERVER] Project ID:", admin.apps[0]?.options.projectId);
    }
  }
}

async function runCheck(targetDb: any) {
  // Use a different query if needed, or just log
  console.log(`[EXPIRATION CHECK] Fetching rentalRecords from ${targetDb.databaseId || 'database'}...`);
  const snapshot = await targetDb.collection('rentalRecords').get();
  console.log(`[EXPIRATION CHECK] Successfully fetched ${snapshot.docs.length} rental records.`);
  
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
            lastExpiryNotificationSent: admin.firestore.FieldValue.serverTimestamp()
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
        project: admin.apps[0]?.options.projectId,
        dbInitialized: !!db
      }
    });
  });

  // Run expiration check every 12 hours
  setInterval(checkTenancyExpirations, 12 * 60 * 60 * 1000);

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
    
    // Diagnostic check for Firebase permissions
    if (db) {
      try {
        console.log("[SERVER] Testing database connection...");
        const testSnapshot = await db.collection('rentalRecords').limit(1).get();
        console.log("[SERVER] Database connection check: SUCCESS. Found", testSnapshot.docs.length, "records.");
      } catch (err: any) {
        console.error("[SERVER] Database connection check: FAILED. Error:", err.message);
        if (err.message.includes("PERMISSION_DENIED")) {
          console.error("[SERVER] ACTION REQUIRED: Add 'Cloud Datastore User' role to your Service Account in Google Cloud Console.");
        }
      }
    }
    
    // Also run expiration check once on start after a short delay
    setTimeout(() => {
      console.log("[SERVER] Running initial expiration check...");
      checkTenancyExpirations();
    }, 30000);
  });
}

startServer();
