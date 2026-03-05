import { GoogleGenAI } from "@google/genai";

// Puxa a chave do arquivo .env automaticamente
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: "Olá! Me explique o que é inteligência artificial.",
    });

    console.log(response.text);
}

main();