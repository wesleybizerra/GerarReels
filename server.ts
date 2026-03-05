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
import { GoogleGenAI, Type, Modality } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret";
const PORT = Number(process.env.PORT) || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ""
});

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

// ---------------- SERVER ----------------

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true }
});

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

app.post("/auth-v1/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);
    db.prepare(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
    ).run(username, email, hashed);

    io.emit("user:registered", { username });

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

// ---------------- GEMINI ----------------

app.post("/api-v1/generate/script", authenticate, async (req: any, res) => {
  const { theme, topic, language, duration } = req.body;

  try {
    const prompt = `
Gere um roteiro estilo Reel vertical 9:16.

Tema: ${theme}
Tópico: ${topic}
Idioma: ${language}
Duração aproximada: ${duration} segundos.

Retorne JSON:
{
  "title": "...",
  "scenes": [
    { "text": "...", "imagePrompt": "..." }
  ]
}
`;

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    res.json(JSON.parse(result.text || "{}"));
  } catch (err: any) {
    console.error("SCRIPT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api-v1/generate/image", authenticate, async (req: any, res) => {
  const { prompt } = req.body;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt
    });

    const part = result.candidates?.[0]?.content?.parts?.[0];

    if (part?.inlineData?.data) {
      res.json({
        imageUrl: `data:image/png;base64,${part.inlineData.data}`
      });
    } else {
      res.status(500).json({ error: "Imagem não gerada." });
    }
  } catch (err: any) {
    console.error("IMAGE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api-v1/generate/audio", authenticate, async (req: any, res) => {
  const { text, language } = req.body;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          parts: [{ text: `Narração em ${language}: ${text}` }]
        }
      ],
      config: {
        responseModalities: [Modality.AUDIO]
      }
    });

    const data =
      result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (data) {
      res.json({
        audioUrl: `data:audio/mp3;base64,${data}`
      });
    } else {
      res.status(500).json({ error: "Áudio não gerado." });
    }
  } catch (err: any) {
    console.error("AUDIO ERROR:", err);
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
  console.log(`✅ Server running on port ${PORT}`);
});