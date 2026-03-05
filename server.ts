import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PORT = Number(process.env.PORT) || 3000;

if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY não configurada.");
  process.exit(1);
}

// ---------------- DATABASE ----------------

const db = new Database("reelsgen.db");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  plan TEXT DEFAULT 'Gratuito'
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS reels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT,
  theme TEXT,
  language TEXT,
  duration INTEGER,
  assets JSON,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// ---------------- ADMIN FIXO ----------------

const adminEmail = "wesleybizerra@hotmail.com";
const adminPassword = "Cadernorox@27";

const existingAdmin = db
  .prepare("SELECT * FROM users WHERE email = ?")
  .get(adminEmail);

if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  db.prepare(
    "INSERT INTO users (username, email, password, plan) VALUES (?, ?, ?, ?)"
  ).run("Admin Wesley", adminEmail, hashedPassword, "Extremo");

  console.log("✅ Admin criado automaticamente.");
}

// ---------------- SERVER ----------------

const app = express();
const httpServer = createServer(app);
new Server(httpServer);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

// ---------------- AUTH ----------------

const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ---------------- AUTH ROUTES ----------------

app.post("/auth-v1/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);

    db.prepare(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
    ).run(username, email, hashed);

    res.json({ success: true });
  } catch {
    res.status(400).json({ error: "E-mail já cadastrado." });
  }
});

app.post("/auth-v1/login", async (req, res) => {
  const { email, password } = req.body;

  const user: any = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email);

  if (!user) return res.status(401).json({ error: "Credenciais inválidas." });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Credenciais inválidas." });

  const token = jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    JWT_SECRET
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan
    }
  });
});

app.get("/auth-v1/me", authenticate, (req: any, res) => {
  const user = db
    .prepare("SELECT id, username, email, plan FROM users WHERE id = ?")
    .get(req.user.id);

  res.json(user);
});

app.post("/auth-v1/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

// ---------------- REELS ----------------

app.get("/api-v1/reels", authenticate, (req: any, res) => {
  const reels = db
    .prepare("SELECT * FROM reels WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);

  res.json(reels);
});

app.post("/api-v1/reels/save", authenticate, (req: any, res) => {
  const { title, theme, language, duration, assets } = req.body;

  db.prepare(
    "INSERT INTO reels (user_id, title, theme, language, duration, assets) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(req.user.id, title, theme, language, duration, JSON.stringify(assets));

  res.json({ success: true });
});

// ---------------- GERAR ROTEIRO ----------------

app.post("/api-v1/generate/script", authenticate, async (req: any, res) => {
  const { theme, topic, language, duration } = req.body;

  try {
    const prompt = `
Gere um roteiro estilo Reel vertical 9:16.

Tema: ${theme}
Tópico: ${topic}
Idioma: ${language}
Duração aproximada: ${duration} segundos.

Retorne SOMENTE JSON válido sem markdown.
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Você é especialista em criar roteiros virais para Instagram Reels."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OPENROUTER ERROR:", data);
      return res.status(500).json({ error: "Erro ao gerar roteiro." });
    }

    let text = data.choices?.[0]?.message?.content || "";

    text = text.replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch {
      console.error("JSON inválido recebido:", text);
      res.status(500).json({ error: "IA retornou JSON inválido." });
    }

  } catch (err: any) {
    console.error("SCRIPT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- STATIC ----------------

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "dist");
  app.use(express.static(distPath));

  app.get("*", (_, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server rodando na porta ${PORT}`);
});