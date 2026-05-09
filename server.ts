import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

console.log("[SERVER] server.ts is being executed...");
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db: any;
try {
  console.log("[SERVER] Initializing Firebase Admin...");
  const configPath = path.resolve(__dirname, "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  console.log("[SERVER] Config values - Project:", firebaseConfig.projectId, "Database:", firebaseConfig.firestoreDatabaseId);

  // Initialize Admin SDK
  if (getApps().length === 0) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountVar) {
      try {
        console.log("[SERVER] Initializing with FIREBASE_SERVICE_ACCOUNT...");
        
        let raw = serviceAccountVar.trim();
        // Remove surrounding quotes if present (often added by accident in UI)
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
          raw = raw.substring(1, raw.length - 1);
        }
        
        const cleanedJson = raw.replace(/\\n/g, '\n');
        let serviceAccount;
        try {
          serviceAccount = JSON.parse(cleanedJson);
        } catch (je) {
          // Try to handle if someone pasted a Javascript object instead of strict JSON
          console.warn("[SERVER] Regular JSON parse failed, trying relaxed eval...");
          // This is a bit risky but sometimes users paste things like { project_id: '...' }
          // We'll stick to a more conservative fix for now: just log the error clearly.
          throw je;
        }
        
        initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id || firebaseConfig.projectId
        });
        console.log("[SERVER] Initialized with Service Account. Project:", serviceAccount.project_id);
      } catch (parseErr: any) {
        console.error("[SERVER] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON. Error:", parseErr.message);
        console.error("[SERVER] Ensure the environment variable contains valid JSON from your Service Account Key file.");
        // Fallback to basic init
        initializeApp({ projectId: firebaseConfig.projectId });
      }
    } else {
      try {
        console.log("[SERVER] No FIREBASE_SERVICE_ACCOUNT found. Using project default credentials.");
        console.log("[SERVER] Attempting initialization with config projectId:", firebaseConfig.projectId);
        initializeApp({
          projectId: firebaseConfig.projectId
        });
      } catch (initErr) {
        console.warn("[SERVER] Failed to initialize with config projectId, falling back to ambient default:", initErr);
        initializeApp();
      }
    }
  }
  
  const app = getApp();
  console.log("[SERVER] Active App Project ID:", app.options.projectId);

  // Determine database ID
  const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
  console.log("[SERVER] Target Database ID:", databaseId);

  db = getFirestore(app, databaseId);
  
  console.log("[SERVER] Firebase Admin initialized.");
} catch (error) {
  console.error("[SERVER] Failed to initialize Firebase Admin:", error);
}

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
  console.log("[EXPIRATION CHECK] Starting check...");
  if (!db) {
    console.error("[EXPIRATION CHECK] Global 'db' not initialized. Attempting re-init...");
    try {
      const configJson = fs.readFileSync(CONFIG_PATH, "utf-8");
      const config = JSON.parse(configJson);
      const app = getApp();
      db = getFirestore(app, config.firestoreDatabaseId || "(default)");
    } catch (e) {
      console.error("[EXPIRATION CHECK] Re-init failed:", e);
      return;
    }
  }
  
  let currentDb = db;
  try {
    console.log("[EXPIRATION CHECK] Fetching rentalRecords...");
    await runCheck(currentDb);
  } catch (error: any) {
    console.error("[EXPIRATION CHECK] Execution error:", error.message);
    
    // If it's a permission error and we're not using the default DB, try the default DB as a fallback
    if (error.message.includes("PERMISSION_DENIED")) {
      console.log("[EXPIRATION CHECK] PERMISSION_DENIED. Checking if databaseId is the issue...");
      try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        if (config.firestoreDatabaseId) {
          console.log("[EXPIRATION CHECK] Current ID is named. Trying (default) fallback...");
          const defaultDb = getFirestore(getApp(), "(default)");
          await runCheck(defaultDb);
          db = defaultDb;
          console.log("[EXPIRATION CHECK] Fallback to (default) SUCCESS.");
        } else {
          console.error("[EXPIRATION CHECK] PERMISSION_DENIED on (default) database.");
          console.error("[SERVER] ACTION REQUIRED: Add 'Cloud Datastore User' role to your Service Account in Google Cloud Console.");
        }
      } catch (fallbackError: any) {
        console.error("[EXPIRATION CHECK] Fallback attempt also failed:", fallbackError.message);
        console.error("[SERVER] ACTION REQUIRED: Ensure Service Account permissions are correct for project", getApp().options.projectId);
      }
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
        project: getApp()?.options.projectId,
        dbInitialized: !!db
      }
    });
  });

  // Run expiration check every 12 hours
  setInterval(checkTenancyExpirations, 12 * 60 * 60 * 1000);

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
    console.log(`[SERVER] Production mode. Serving from dist: ${distPath}`);
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));

      app.get('*', (req, res) => {
        // Skip index.html for assets
        if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$/)) {
          return res.status(404).end();
        }

        if (req.url.startsWith('/api/')) {
          return res.status(404).json({ error: 'API route not found' });
        }
        
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(500).send('Production build folder missing index.html');
        }
      });
    } else {
      app.get('*', (req, res) => {
        res.status(500).send(`Production build folder 'dist' not found at ${distPath}`);
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
    }, 10000);
  });
}

startServer();
