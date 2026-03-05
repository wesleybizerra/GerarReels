import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MercadoPagoConfig, Preference } from "mercadopago";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "reelsgen-secret-key-123";
const MP_ACCESS_TOKEN = "APP_USR-5486188186277562-123109-0c5bb1142056dd529240d38a493ce08d-650681524";

const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });

// Database Setup
const db = new Database("reelsgen.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    plan TEXT DEFAULT 'Gratuito',
    plan_start_date TEXT,
    plan_expiry_date TEXT,
    reels_generated_today INTEGER DEFAULT 0,
    last_reset_time TEXT
  );

  CREATE TABLE IF NOT EXISTS reels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT,
    theme TEXT,
    language TEXT,
    duration INTEGER,
    assets JSON,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Insert Admin if not exists
const adminEmail = "wesleybizerra@hotmail.com";
const existingAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);
if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync("Cadernorox@27", 10);
  db.prepare("INSERT INTO users (username, email, password, plan) VALUES (?, ?, ?, ?)").run(
    "Admin Wesley",
    adminEmail,
    hashedPassword,
    "Extremo"
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- API Routes ---

  // Auth
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password } = req.body;
    if (!email.endsWith("@hotmail.com") && !email.endsWith("@outlook.com")) {
      return res.status(400).json({ error: "Apenas e-mails Hotmail ou Outlook são permitidos." });
    }
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)").run(
        username,
        email,
        hashedPassword
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: "E-mail já cadastrado." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }
    const token = jwt.sign({ id: user.id, email: user.email, plan: user.plan }, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ user: { id: user.id, username: user.username, email: user.email, plan: user.plan } });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/user/me", authenticate, (req: any, res) => {
    const user: any = db.prepare("SELECT id, username, email, plan, plan_expiry_date FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  // Admin
  app.get("/api/admin/users", authenticate, (req: any, res) => {
    if (req.user.email !== adminEmail) return res.status(403).json({ error: "Forbidden" });
    const users = db.prepare("SELECT username FROM users WHERE email != ?").all(adminEmail);
    res.json(users);
  });

  // Payments
  app.post("/api/payments/create-preference", authenticate, async (req: any, res) => {
    const { planName, price } = req.body;
    const preference = new Preference(client);
    
    try {
      const result = await preference.create({
        body: {
          items: [
            {
              id: planName,
              title: `Plano ${planName} - ReelsGen AI`,
              quantity: 1,
              unit_price: price,
              currency_id: "BRL",
            }
          ],
          back_urls: {
            success: `${process.env.APP_URL}/payment-success?plan=${planName}`,
            failure: `${process.env.APP_URL}/pricing`,
            pending: `${process.env.APP_URL}/pricing`,
          },
          auto_return: "approved",
          external_reference: req.user.id.toString(),
        }
      });
      res.json({ init_point: result.init_point });
    } catch (err) {
      res.status(500).json({ error: "Erro ao criar preferência de pagamento." });
    }
  });

  app.post("/api/payments/confirm", authenticate, (req: any, res) => {
    const { plan } = req.body;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    db.prepare("UPDATE users SET plan = ?, plan_start_date = ?, plan_expiry_date = ? WHERE id = ?").run(
      plan,
      new Date().toISOString(),
      expiryDate.toISOString(),
      req.user.id
    );
    res.json({ success: true, plan });
  });

  // Reels
  app.get("/api/reels", authenticate, (req: any, res) => {
    const reels = db.prepare("SELECT * FROM reels WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    res.json(reels);
  });

  app.post("/api/reels/save", authenticate, (req: any, res) => {
    const { title, theme, language, duration, assets } = req.body;
    db.prepare("INSERT INTO reels (user_id, title, theme, language, duration, assets) VALUES (?, ?, ?, ?, ?, ?)").run(
      req.user.id,
      title,
      theme,
      language,
      duration,
      JSON.stringify(assets)
    );
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
