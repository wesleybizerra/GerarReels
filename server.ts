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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const HF_API_TOKEN = process.env.HF_API_TOKEN; // <-- SUA NOVA VARIÁVEL
const PORT = Number(process.env.PORT) || 3000;

if (!HF_API_TOKEN) {
  console.error("❌ HF_API_TOKEN não configurada!");
}

const db = new Database("reelsgen.db");

// Tabelas (mantidas conforme seu projeto)
db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, plan TEXT DEFAULT 'Gratuito');`);
db.exec(`CREATE TABLE IF NOT EXISTS reels (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT, theme TEXT, language TEXT, duration INTEGER, assets JSON, created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

// Rotas de Auth e Reels (mantidas iguais)
// [Aqui você mantém seus blocos de /auth-v1/register, /auth-v1/login, etc...]
// (Para economizar espaço, omiti o repetido, mas cole os seus originais aqui)

// ---------------- GERAR ROTEIRO VIA HUGGING FACE ----------------
app.post("/api-v1/generate/script", async (req: any, res) => {
  const { theme, topic, language, duration } = req.body;

  try {
    const prompt = `Gere um JSON com: title (string), scenes (array com text e imagePrompt). Tema: ${theme}. Assunto: ${topic}. Idioma: ${language}.`;

    const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 1000, return_full_text: false }
      })
    });

    const data = await response.json();
    let text = data[0]?.generated_text || "";

    // Limpeza rigorosa para achar o JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : text;

    res.json(JSON.parse(cleanJson));
  } catch (err: any) {
    console.error("HF ERROR:", err);
    res.status(500).json({ error: "Erro ao gerar roteiro gratuito." });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "dist")));
  app.get("*", (_, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
}

httpServer.listen(PORT, "0.0.0.0", () => console.log(`✅ Server rodando na porta ${PORT}`));