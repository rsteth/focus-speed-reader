import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { Book } from '../types';
import { extractTextFromEpub } from '../lib/epubUtils';
import { X, Play, Pause, Rewind, FastForward } from 'lucide-react';

interface ReaderProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (id: string, progress: number) => Promise<void>;
}

function WordDisplay({ word }: { word: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(96);
  const orp = Math.ceil((word.length - 1) / 4);
  const left = word.slice(0, orp);
  const middle = word.slice(orp, orp + 1);
  const right = word.slice(orp + 1);

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const fit = () => {
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return;
      const style = getComputedStyle(element);
      context.font = `96px ${style.fontFamily}`;
      const halfCharacter = context.measureText(middle).width / 2;
      const extent = Math.max(context.measureText(left).width, context.measureText(right).width) + halfCharacter;
      // Keep the recognition point centered while fitting the longer side in the viewport.
      setFontSize(Math.min(96, 96 * Math.max(1, element.clientWidth / 2 - 20) / Math.max(1, extent)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    void document.fonts.ready.then(fit);
    return () => observer.disconnect();
  }, [left, middle, right]);

  return <div ref={container} className="relative w-full font-mono select-none" style={{ fontSize }} aria-label={word} data-testid="word">
    <div className="relative h-[1.5em] whitespace-nowrap">
      <span className="absolute right-[calc(50%+0.5ch)]">{left}</span>
      <span className="absolute left-1/2 -translate-x-1/2 w-[1ch] text-center text-red-500">{middle}</span>
      <span className="absolute left-[calc(50%+0.5ch)]">{right}</span>
    </div>
  </div>;
}

const Reader: React.FC<ReaderProps> = ({ book, onClose, onUpdateProgress }) => {
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(Math.max(0, Math.floor(book.progress || 0)));
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(Math.max(60, Math.min(1000, book.settings?.wpm || 300)));
  const latestProgress = useRef({ index, onUpdateProgress });
  useLayoutEffect(() => { latestProgress.current = { index, onUpdateProgress }; });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const loaded = book.type === 'text'
          ? (book.content as string).split(/\s+/).filter(Boolean)
          : await extractTextFromEpub(book.content as ArrayBuffer);
        if (!cancelled) {
          setWords(loaded);
          setIndex(Math.max(0, Math.min(loaded.length - 1, Math.floor(book.progress || 0))));
          if (!loaded.length) setError('This book contains no readable text.');
        }
      } catch {
        if (!cancelled) setError('Unable to read this book. Check the file and try importing it again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [book]);

  useEffect(() => {
    if (!isPlaying || !words.length) return;
    const timer = window.setInterval(() => setIndex(previous => Math.min(words.length - 1, previous + 1)), 60000 / wpm);
    return () => clearInterval(timer);
  }, [isPlaying, wpm, words.length]);

  useEffect(() => {
    if (isPlaying && index === words.length - 1) {
      const timer = window.setTimeout(() => setIsPlaying(false), 60000 / wpm);
      return () => clearTimeout(timer);
    }
  }, [index, isPlaying, words.length, wpm]);

  useEffect(() => {
    if (!loading && !error && !isPlaying) onUpdateProgress(book.id, index);
  }, [isPlaying, index, book.id, onUpdateProgress, loading, error]);

  useEffect(() => () => {
    const latest = latestProgress.current;
    latest.onUpdateProgress(book.id, latest.index);
  }, [book.id]);

  const closeReader = async () => {
    await onUpdateProgress(book.id, index);
    onClose();
  };

  const togglePlay = () => {
    if (!words.length || error) return;
    if (!isPlaying && index === words.length - 1) setIndex(0);
    setIsPlaying(previous => !previous);
  };
  const adjustIndex = (delta: number) => setIndex(previous => Math.max(0, Math.min(words.length - 1, previous + delta)));

  return <div className="reader-shell flex flex-col bg-zinc-950 text-zinc-100">
    <header className="shrink-0 p-4 border-b border-zinc-900">
      <div className="flex items-center justify-between gap-4">
        <h2 className="min-w-0 text-lg font-medium truncate">{book.title}</h2>
        <button onClick={closeReader} aria-label="Close reader" title="Close reader" className="p-2 shrink-0 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-zinc-100"><X className="w-6 h-6" /></button>
      </div>
      <div className="text-center text-zinc-500 text-sm font-mono" data-testid="position">Word {words.length ? index + 1 : 0} of {words.length}</div>
    </header>
    <input type="range" aria-label="Reading position" min="0" max={Math.max(0, words.length - 1)} value={index} disabled={!words.length} onChange={event => setIndex(Number(event.target.value))} className="reader-progress shrink-0 w-full cursor-pointer accent-blue-600" />
    <main className="flex-1 min-h-44 flex items-center justify-center relative cursor-pointer" onClick={togglePlay}>
      {loading || error ? <p className="p-6 text-center text-zinc-400" role="status">{loading ? 'Loading book…' : error}</p> : <div className="relative w-full py-16">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-zinc-800" />
        <WordDisplay word={words[index] || ''} />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-zinc-800" />
      </div>}
    </main>
    <footer className="shrink-0 p-4 md:p-6 bg-zinc-950 border-t border-zinc-900">
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <label className="flex items-center justify-between gap-4"><span className="text-sm text-zinc-500">Speed</span><input type="range" aria-label="Speed" min="60" max="1000" step="10" value={wpm} onChange={event => setWpm(Number(event.target.value))} className="min-w-0 flex-1 accent-blue-600" /><span className="text-sm font-mono w-20 text-right text-zinc-400">{wpm} wpm</span></label>
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => adjustIndex(-10)} disabled={!words.length} aria-label="Back 10 words" title="Back 10 words" className="p-3 hover:bg-zinc-900 rounded-full text-zinc-400"><Rewind className="w-6 h-6" /></button>
          <button onClick={togglePlay} disabled={!words.length || !!error} aria-label={isPlaying ? 'Pause' : index === words.length - 1 ? 'Replay' : 'Play'} className="p-4 rounded-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">{isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}</button>
          <button onClick={() => adjustIndex(10)} disabled={!words.length} aria-label="Forward 10 words" title="Forward 10 words" className="p-3 hover:bg-zinc-900 rounded-full text-zinc-400"><FastForward className="w-6 h-6" /></button>
        </div>
      </div>
    </footer>
  </div>;
};
export default Reader;
