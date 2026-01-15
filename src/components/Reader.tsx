import { useState, useEffect, useRef } from 'react';
import type { Book } from '../types';
import { extractTextFromEpub } from '../lib/epubUtils';
import { X, Play, Pause, Rewind, FastForward } from 'lucide-react';
import clsx from 'clsx';

interface ReaderProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (id: string, progress: number) => void;
}

const Reader: React.FC<ReaderProps> = ({ book, onClose, onUpdateProgress }) => {
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(book.progress || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(book.settings?.wpm || 300);
  
  const timerRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!progressBarRef.current || words.length === 0) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newIndex = Math.floor(percentage * words.length);
    
    setIndex(newIndex);
  };

  // Load Content
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        if (book.type === 'text') {
          const text = book.content as string;
          setWords(text.split(/\s+/).filter(w => w.length > 0));
        } else if (book.type === 'epub') {
          const extracted = await extractTextFromEpub(book.content as ArrayBuffer);
          setWords(extracted);
        }
      } catch (e) {
        console.error("Error loading book content", e);
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, [book]);

  // Timer Logic
  useEffect(() => {
    if (isPlaying && words.length > 0) {
      const intervalMs = 60000 / wpm;
      timerRef.current = window.setInterval(() => {
        setIndex((prev) => {
          if (prev >= words.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, wpm, words.length]);

  // Save Progress periodically or on pause
  useEffect(() => {
    // Debounce or save on pause could be better, but let's save on unmount/close
    // We also save every 5 seconds if playing?
    // For now, let's just use the onClose handler to save when exiting,
    // and maybe save locally in the component?
    // Actually, calling the parent prop is fine.
    
    // Let's save when pausing
    if (!isPlaying) {
      onUpdateProgress(book.id, index);
    }
  }, [isPlaying, index, book.id, onUpdateProgress]);

  // Save on unmount
  useEffect(() => {
      return () => onUpdateProgress(book.id, index);
  }, [book.id, index, onUpdateProgress]);


  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const adjustIndex = (delta: number) => {
    setIndex(prev => Math.max(0, Math.min(words.length - 1, prev + delta)));
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Loading Book...</div>;

  const currentWord = words[index] || "";
  
  // ORP Logic (Optimal Recognition Point)
  // Roughly the middle, slightly to the left.
  const orpIndex = Math.ceil((currentWord.length - 1) / 4); 
  const leftPart = currentWord.slice(0, orpIndex);
  const middleChar = currentWord.slice(orpIndex, orpIndex + 1);
  const rightPart = currentWord.slice(orpIndex + 1);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-900">
        <h2 className="text-lg font-medium truncate max-w-[70%]">{book.title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-zinc-100">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Display */}
      <div className="flex-1 flex flex-col items-center justify-center relative cursor-pointer" onClick={togglePlay}>
        
        {/* Progress Bar Top */}
        <div 
            ref={progressBarRef}
            className="absolute top-0 left-0 w-full h-2 bg-zinc-800 cursor-pointer z-10 hover:h-4 transition-all duration-200"
            onClick={handleProgressBarClick}
        >
            <div 
                className="h-full bg-blue-600 transition-all duration-100 ease-out"
                style={{ width: `${(index / words.length) * 100}%` }}
            />
        </div>

        {/* Word Display Container */}
        <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-20">
            
            {/* Reticle Lines */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-zinc-800 rounded-full" />
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-zinc-800 rounded-full" />

            {/* Word Grid */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-baseline w-full gap-0.5 text-6xl md:text-8xl font-mono select-none">
                <div className="text-right text-zinc-100 whitespace-nowrap overflow-hidden pr-1">
                    {leftPart}
                </div>
                <div className="text-red-500 font-bold text-center w-[1ch] flex-shrink-0 z-10">
                    {middleChar}
                </div>
                <div className="text-left text-zinc-100 whitespace-nowrap overflow-hidden pl-1">
                    {rightPart}
                </div>
            </div>
        </div>
        
        {/* Context (optional: show previous/next words faded?) */}
        <div className="mt-12 text-zinc-500 text-sm font-mono">
             Word {index + 1} of {words.length}
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-zinc-950 border-t border-zinc-900 pb-10 md:pb-6">
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            
            {/* Speed Control */}
            <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-500">Speed</span>
                <input 
                    type="range" 
                    min="60" 
                    max="1000" 
                    step="10" 
                    value={wpm} 
                    onChange={(e) => setWpm(Number(e.target.value))}
                    className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-sm font-mono w-16 text-right text-zinc-400">{wpm} wpm</span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-6">
                <button onClick={(e) => { e.stopPropagation(); adjustIndex(-10); }} className="p-3 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-zinc-100">
                    <Rewind className="w-6 h-6" />
                </button>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className={clsx(
                        "p-4 rounded-full transition-colors", 
                        isPlaying ? "bg-zinc-800 text-zinc-200" : "bg-blue-600 text-white hover:bg-blue-500"
                    )}
                >
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </button>

                <button onClick={(e) => { e.stopPropagation(); adjustIndex(10); }} className="p-3 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-zinc-100">
                    <FastForward className="w-6 h-6" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Reader;