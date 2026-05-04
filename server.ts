import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

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
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  console.log("[SERVER] Config values - Project:", firebaseConfig.projectId, "Database:", firebaseConfig.firestoreDatabaseId);

  // Try initializing with config project first, as it might be a linked project
  if (getApps().length === 0) {
    try {
      console.log("[SERVER] Attempting initialization with config projectId...");
      initializeApp({
        projectId: firebaseConfig.projectId
      });
    } catch (initErr) {
      console.warn("[SERVER] Failed to initialize with config projectId, falling back to default:", initErr);
      initializeApp();
    }
  }
  
  const app = getApp();
  console.log("[SERVER] Using Project ID:", app.options.projectId || "Ambient Default");

  // Determine database ID
  // If the explicit ID fails with PERMISSION_DENIED, we might want to try (default)
  // but let's try the configured one first as it's specifically set.
  const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
  console.log("[SERVER] Using Database ID:", databaseId);

  db = getFirestore(app, databaseId);
  
  console.log("[SERVER] Firebase Admin initialized.");
} catch (error) {
  console.error("[SERVER] Failed to initialize Firebase Admin:", error);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function checkTenancyExpirations() {
  console.log("[EXPIRATION CHECK] Running tenancy expiration check...");
  if (!db) {
    console.error("[EXPIRATION CHECK] Database not initialized, skipping.");
    return;
  }
  
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  
  let currentDb = db;
  try {
    // Attempt with current DB
    await runCheck(currentDb);
  } catch (error: any) {
    console.error("[EXPIRATION CHECK] Error with current database configuration:", error.message);
    
    // If it's a permission error and we're not using the default DB, try the default DB as a fallback
    if (error.message.includes("PERMISSION_DENIED") && firebaseConfig.firestoreDatabaseId) {
      console.log("[EXPIRATION CHECK] Attempting fallback to (default) database...");
      try {
        const app = getApp();
        const defaultDb = getFirestore(app, "(default)");
        await runCheck(defaultDb);
        // If fallback succeeds, update global db for future runs
        db = defaultDb;
        console.log("[EXPIRATION CHECK] Successfully switched to (default) database.");
      } catch (fallbackError) {
        console.error("[EXPIRATION CHECK] Fallback to (default) also failed:", fallbackError);
      }
    }
  }
}

async function runCheck(targetDb: any) {
  const snapshot = await targetDb.collection('rentalRecords').get();
  console.log(`[EXPIRATION CHECK] Successfully fetched ${snapshot.docs.length} rental records.`);
  
  const today = new Date();
  const managementEmails = process.env.MANAGEMENT_EMAILS || "crestechnologiesltd@gmail.com,crestiton@gmail.com,crestechnologies@outlook.com";

  for (const doc of snapshot.docs) {
    const record = doc.data();
    if (!record.expiry || !record.email) continue;

    const expiryDate = new Date(record.expiry);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 60 && diffDays > 0) {
      console.log(`[EXPIRATION CHECK] Checking record for ${record.unit}, diffDays: ${diffDays}`);
      const lastSent = record.lastExpiryNotificationSent ? record.lastExpiryNotificationSent.toDate() : null;
      const oneDayAgo = new Date();
      oneDayAgo.setDate(today.getDate() - 1);

      if (!lastSent || lastSent < oneDayAgo) {
        const subject = `Tenancy Expiration Reminder: ${record.unit}`;
        const body = `Dear ${record.tenant},\n\nThis is a reminder that your tenancy for ${record.unit} is set to expire on ${record.expiry} (${diffDays} days remaining).\n\nPlease contact management to renew your tenancy or inform us of your intention to terminate the contract.\n\nBest regards,\nCrest Management`;

        console.log(`[EXPIRATION CHECK] Sending reminder to ${record.email} (${diffDays} days left)`);
        
        try {
          if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail({
              from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
              to: `${record.email}, ${managementEmails}`,
              subject: subject,
              text: body
            });
          } else {
            console.log(`[EMAIL SIMULATION] To: ${record.email}, ${managementEmails}\nSubject: ${subject}\nBody: ${body}`);
          }

          await doc.ref.update({
            lastExpiryNotificationSent: admin.firestore.FieldValue.serverTimestamp()
          });
        } catch (e) {
          console.error(`[EXPIRATION CHECK] Failed to send email for ${record.unit}:`, e);
        }
      }
    }
  }
}

async function startServer() {
  console.log("[SERVER] Starting server initialization...");
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
    console.log("[SERVER] Serving production build...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Server running on http://localhost:${PORT}`);
    // Also run once on start
    setTimeout(() => {
      console.log("[SERVER] Running initial expiration check...");
      checkTenancyExpirations();
    }, 10000);
  });
}

startServer();
