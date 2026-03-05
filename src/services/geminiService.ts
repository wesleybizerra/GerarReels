export interface ReelAsset {
  text: string;
  imageUrl: string;
  audioUrl?: string;
}

export async function generateReelScript(theme: string, topic: string, language: string, duration: number, plan: string) {
  const res = await fetch('/api-v1/generate/script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, topic, language, duration, plan })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Erro ao gerar roteiro");
  }
  return res.json();
}

export async function generateSceneImage(prompt: string) {
  const res = await fetch('/api-v1/generate/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Erro ao gerar imagem");
  }
  const data = await res.json();
  return data.imageUrl;
}

export async function generateSceneAudio(text: string, language: string) {
  const res = await fetch('/api-v1/generate/audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Erro ao gerar áudio");
  }
  const data = await res.json();
  return data.audioUrl;
}
