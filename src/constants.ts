import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const THEMES = [
  { id: "Coisas que parecem normais no Brasil, mas chocam os gringos", placeholder: "Arroz e feijão todo dia e Descarga com dois botões" },
  { id: "Você sabia que seu cérebro te engana todos os dias?", placeholder: "Efeito Mandela (memórias falsas coletivas) ou Por que você esquece o que ia fazer ao trocar de cômodo" },
  { id: "TOP 5", placeholder: "Destinos de Viagem ou Lanches Saudáveis" },
  { id: "Fato", placeholder: "Curiosidades sobre o Espaço ou Fatos sobre Tubarões" },
  { id: "Classificação", placeholder: "Melhores Filmes de 2023 ou Carros mais rápidos" },
  { id: "Guia Passo a Passo", placeholder: "Como emagrecer em casa ou Como aprender inglês" },
  { id: "Estatísticas", placeholder: "Dados sobre Redes Sociais ou Estatísticas do Futebol" },
  { id: "Quiz", placeholder: "Quiz de História ou Quiz sobre Filmes" },
  { id: "Citações Famosas", placeholder: "Frases de Albert Einstein ou Frases Motivacionais" },
  { id: "Demonstrações", placeholder: "Como funciona um motor ou Como usar IA" },
  { id: "Piada", placeholder: "Piadas sobre escola ou Piadas de advogado" },
];

export const LANGUAGES = [
  "Português",
  "Inglês",
  "Espanhol",
  "Francês",
  "Alemão"
];

export const PLANS = [
  {
    name: "Gratuito",
    price: 0,
    reelsLimit: 10,
    durationLimit: 60,
    resolution: "720p",
    features: ["10 Reels a cada 23 horas", "Download em 720p", "Duração máxima de 60 segundos", "Pré-visualização", "Galeria salva"]
  },
  {
    name: "Básico",
    price: 5,
    reelsLimit: 20,
    durationLimit: 120,
    resolution: "720p",
    features: ["20 Reels a cada 23 horas", "Download em 720p", "Duração máxima de 120 segundos", "Opções: 30s, 60s, 90s, 120s", "Pré-visualização", "Galeria salva"]
  },
  {
    name: "Premium",
    price: 10,
    reelsLimit: 30,
    durationLimit: 180,
    resolution: "1080p",
    features: ["30 Reels a cada 23 horas", "Download em Full HD 1080p", "Duração máxima de 180 segundos", "Títulos persuasivos", "Suporte prioritário", "Galeria salva"]
  },
  {
    name: "Extremo",
    price: 20,
    reelsLimit: Infinity,
    durationLimit: 180,
    resolution: "1080p",
    features: ["Geração ilimitada de Reels", "Download em Full HD 1080p", "Duração máxima de 180 segundos", "Títulos persuasivos", "Suporte prioritário", "Galeria salva"]
  }
];
