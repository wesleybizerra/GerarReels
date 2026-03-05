import express from "express";
console.log("--- SERVER STARTING ---");
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
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "reelsgen-secret-key-123";
const MP_ACCESS_TOKEN = "APP_USR-5486188186277562-123109-0c5bb1142056dd529240d38a493ce08d-650681524";

const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });

// Database Setup
console.log("Initializing database...");
let db: any;
try {
  db = new Database("reelsgen.db");
  console.log("Database connected.");
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
  console.log("Tables initialized.");
} catch (dbErr) {
  console.error("Database initialization failed:", dbErr);
  process.exit(1);
}

// Insert Admin if not exists
const adminEmail = "wesleybizerra@hotmail.com";
console.log("Checking for admin user...");
const existingAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);
if (!existingAdmin) {
  console.log("Creating admin user...");
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
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.options("*", cors()); // Explicitly handle preflight
  app.use(express.json());
  app.use(cookieParser());

  // Global Logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

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

  app.get("/server-ping", (req, res) => {
    res.json({ pong: true, time: new Date().toISOString() });
  });

  // Auth
  app.post("/auth-v1/register", async (req, res) => {
    console.log("!!! REGISTER ROUTE REACHED !!!", req.body.email);
    const { username, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }
    if (!email.endsWith("@hotmail.com") && !email.endsWith("@outlook.com")) {
      return res.status(400).json({ error: "Apenas e-mails Hotmail ou Outlook são permitidos." });
    }
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const finalUsername = username || email.split('@')[0];
      db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)").run(
        finalUsername,
        email,
        hashedPassword
      );
      console.log("User registered:", email);

      // Emit real-time update
      io.emit("user:registered", { username: finalUsername });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(400).json({ error: "E-mail já cadastrado ou erro no servidor." });
    }
  });

  app.post("/auth-v1/login", async (req, res) => {
    console.log("!!! LOGIN ROUTE REACHED !!!", req.body.email);
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      console.log("User not found:", email);
      return res.status(401).json({ error: "Credenciais inválidas." });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Invalid password for:", email);
      return res.status(401).json({ error: "Credenciais inválidas." });
    }
    console.log("Login successful:", email);
    const token = jwt.sign({ id: user.id, email: user.email, plan: user.plan }, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ user: { id: user.id, username: user.username, email: user.email, plan: user.plan } });
  });

  app.post("/auth-v1/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/auth-v1/me", authenticate, (req: any, res) => {
    const user: any = db.prepare("SELECT id, username, email, plan, plan_expiry_date FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  // Admin
  app.get("/api-v1/admin/users", authenticate, (req: any, res) => {
    if (req.user.email !== adminEmail) return res.status(403).json({ error: "Forbidden" });
    const users = db.prepare("SELECT username FROM users WHERE email != ?").all(adminEmail);
    res.json(users);
  });

  // Payments
  app.post("/api-v1/payments/create-preference", authenticate, async (req: any, res) => {
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

  app.post("/api-v1/payments/confirm", authenticate, (req: any, res) => {
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
  app.get("/api-v1/reels", authenticate, (req: any, res) => {
    const reels = db.prepare("SELECT * FROM reels WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    res.json(reels);
  });

  app.post("/api-v1/reels/save", authenticate, (req: any, res) => {
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

  // API Catch-all (before Vite)
  app.all("/api/*", (req, res) => {
    console.log(`API 404: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Endpoint não encontrado: ${req.method} ${req.url}` });
  });

  app.all("/auth-v1/*", (req, res) => {
    console.log(`AUTH API 404: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Endpoint não encontrado: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("--- RUNNING IN DEVELOPMENT MODE ---");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("--- RUNNING IN PRODUCTION MODE ---");
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`--- SERVER RUNNING ON PORT ${PORT} ---`);
  });
}

startServer();
