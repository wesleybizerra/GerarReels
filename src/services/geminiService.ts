import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ReelAsset {
  text: string;
  imageUrl: string;
  audioUrl?: string;
}

export async function generateReelScript(theme: string, topic: string, language: string, duration: number, plan: string) {
  const model = "gemini-3.1-pro-preview";
  
  const isPremium = plan === 'Premium' || plan === 'Extremo';
  const titleInstruction = isPremium 
    ? `Gere um título de ALTO IMPACTO para Reels/TikTok. 
       Use gatilhos mentais como Curiosidade, Urgência, Prova Social ou Benefício Exclusivo. 
       O título deve ser emocionalmente ressonante, curto (máximo 10 palavras) e focado em maximizar a Taxa de Clique (CTR) e Retenção. 
       Analise o contexto do tópico "${topic}" e o conteúdo do roteiro para criar algo que pareça um segredo revelado ou uma solução definitiva.` 
    : "Gere um título atraente e direto sobre o assunto.";

  const prompt = `Gere um roteiro para um vídeo estilo Reel (vertical 9:16) sobre o tema "${theme}" e o tópico "${topic}".
  O idioma deve ser ${language}.
  A duração aproximada deve ser de ${duration} segundos.
  ${titleInstruction}
  
  Retorne um JSON com:
  1. title: O título gerado.
  2. scenes: Um array de objetos, cada um com:
     - text: O texto da narração para aquela cena.
     - imagePrompt: Um prompt detalhado em inglês para gerar uma imagem para esta cena.
  
  O roteiro deve ser fluido e focado em retenção.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                imagePrompt: { type: Type.STRING }
              },
              required: ["text", "imagePrompt"]
            }
          }
        },
        required: ["title", "scenes"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateSceneImage(prompt: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "9:16"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function generateSceneAudio(text: string, language: string) {
  // Map language to a voice or prompt
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Narração em ${language}: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }
        }
      }
    }
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/mp3;base64,${base64Audio}`;
  }
  return null;
}
