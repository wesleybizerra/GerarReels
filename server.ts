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
import https from "https";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const PORT = Number(process.env.PORT) || 3000;

if (!RAPIDAPI_KEY) {
  console.error("❌ RAPIDAPI_KEY não configurada.");
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

// ---------------- SERVER ----------------

const app = express();
const httpServer = createServer(app);

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

// ---------------- LLM - GERAR ROTEIRO ----------------

app.post("/api-v1/generate/script", authenticate, async (req: any, res) => {
  const { theme, topic, language, duration } = req.body;

  const prompt = `
Crie um roteiro estilo Reel 9:16.

Tema: ${theme}
Tópico: ${topic}
Idioma: ${language}
Duração: ${duration} segundos.

Retorne SOMENTE JSON:
{
  "title": "...",
  "scenes": [
    { "text": "...", "imagePrompt": "..." }
  ]
}
`;

  const options = {
    method: "POST",
    hostname: "open-ai21.p.rapidapi.com",
    path: "/conversationllama",
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY as string,
      "x-rapidapi-host": "open-ai21.p.rapidapi.com",
      "Content-Type": "application/json"
    }
  };

  try {
    const response: any = await new Promise((resolve, reject) => {
      const request = https.request(options, (resApi) => {
        const chunks: any[] = [];

        resApi.on("data", (chunk) => chunks.push(chunk));
        resApi.on("end", () => {
          resolve(Buffer.concat(chunks).toString());
        });
      });

      request.on("error", reject);
      request.write(JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        web_access: false
      }));
      request.end();
    });

    let parsed;
    try {
      parsed = JSON.parse(response);
    } catch {
      return res.status(500).json({ error: "Erro LLM." });
    }

    let text = parsed.result || parsed.response || response;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const finalJson = JSON.parse(text);
    res.json(finalJson);

  } catch (err) {
    console.error("LLM ERROR:", err);
    res.status(500).json({ error: "Erro ao gerar roteiro." });
  }
});

// ---------------- IMAGEM ----------------

app.post("/api-v1/generate/image", authenticate, async (req: any, res) => {
  const { prompt } = req.body;

  const options = {
    method: "POST",
    hostname: "ai-text-to-image-generator-flux-free-api.p.rapidapi.com",
    path: "/aaaaaaaaaaaaaaaaaiimagegenerator/quick.php",
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY as string,
      "x-rapidapi-host": "ai-text-to-image-generator-flux-free-api.p.rapidapi.com",
      "Content-Type": "application/json"
    }
  };

  try {
    const response: any = await new Promise((resolve, reject) => {
      const request = https.request(options, (resApi) => {
        const chunks: any[] = [];
        resApi.on("data", (chunk) => chunks.push(chunk));
        resApi.on("end", () => {
          resolve(Buffer.concat(chunks).toString());
        });
      });

      request.on("error", reject);
      request.write(JSON.stringify({
        prompt,
        style_id: 4,
        size: "1-1"
      }));
      request.end();
    });

    const parsed = JSON.parse(response);
    const imageUrl =
      parsed.image ||
      parsed.url ||
      parsed.data?.image ||
      parsed.data?.url;

    res.json({ imageUrl });

  } catch (err) {
    console.error("IMAGE ERROR:", err);
    res.status(500).json({ error: "Erro ao gerar imagem." });
  }
});

// ---------------- ÁUDIO ----------------

app.post("/api-v1/generate/audio", authenticate, async (req: any, res) => {
  const { text } = req.body;

  const options = {
    method: "POST",
    hostname: "open-ai-text-to-speech1.p.rapidapi.com",
    path: "/",
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY as string,
      "x-rapidapi-host": "open-ai-text-to-speech1.p.rapidapi.com",
      "Content-Type": "application/json"
    }
  };

  try {
    const response: any = await new Promise((resolve, reject) => {
      const request = https.request(options, (resApi) => {
        const chunks: any[] = [];
        resApi.on("data", (chunk) => chunks.push(chunk));
        resApi.on("end", () => {
          resolve(Buffer.concat(chunks).toString());
        });
      });

      request.on("error", reject);
      request.write(JSON.stringify({
        model: "tts-1",
        input: text,
        instructions: "Speak in a lively and optimistic tone.",
        voice: "alloy"
      }));
      request.end();
    });

    const parsed = JSON.parse(response);

    const audioUrl =
      parsed.audio ||
      parsed.url ||
      parsed.data?.audio ||
      parsed.data?.url;

    res.json({ audioUrl });

  } catch (err) {
    console.error("AUDIO ERROR:", err);
    res.status(500).json({ error: "Erro ao gerar áudio." });
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