import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Download, Volume2, VolumeX } from 'lucide-react';

interface Scene {
  text: string;
  imageUrl: string;
  audioUrl?: string;
}

interface ReelPlayerProps {
  scenes: Scene[];
  onDownload?: () => void;
}

export default function ReelPlayer({ scenes, onDownload }: ReelPlayerProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isPlaying && scenes[currentSceneIndex]?.audioUrl) {
      if (audioRef.current) {
        audioRef.current.src = scenes[currentSceneIndex].audioUrl!;
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentSceneIndex, isPlaying, scenes]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isPlaying) {
      // Approximate scene duration if no audio, or wait for audio end
      timeout = setTimeout(() => {
        if (currentSceneIndex < scenes.length - 1) {
          setCurrentSceneIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
          setCurrentSceneIndex(0);
        }
      }, 5000); // 5 seconds per scene fallback
    }
    return () => clearTimeout(timeout);
  }, [currentSceneIndex, isPlaying, scenes.length]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="relative aspect-[9/16] w-full max-w-[350px] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSceneIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <img
            src={scenes[currentSceneIndex].imageUrl}
            alt="Scene"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          <div className="absolute bottom-20 left-0 right-0 px-6 text-center">
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-white text-lg font-medium drop-shadow-lg leading-tight"
            >
              {scenes[currentSceneIndex].text}
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
        <button
          onClick={togglePlay}
          className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
        >
          {isPlaying ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
        </button>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button onClick={toggleMute} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white">
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        {onDownload && (
          <button onClick={onDownload} className="p-2 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 transition-colors">
            <Download size={20} />
          </button>
        )}
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex gap-1">
        {scenes.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              idx === currentSceneIndex ? "bg-white" : "bg-white/30"
            )}
          />
        ))}
      </div>

      <audio
        ref={audioRef}
        muted={isMuted}
        onEnded={() => {
          if (currentSceneIndex < scenes.length - 1) {
            setCurrentSceneIndex(prev => prev + 1);
          } else {
            setIsPlaying(false);
            setCurrentSceneIndex(0);
          }
        }}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
