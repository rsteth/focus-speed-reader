import { useEffect, useRef, useState } from 'react';
import { Accessibility, Moon, Sun, X } from 'lucide-react';

const themeKey = 'focus-reader.theme.v1';
const paletteKey = 'focus-reader.palette.v1';
const palettes = [
  ['standard', 'Standard'],
  ['red-green', 'Red–green friendly (protan/deutan)'],
  ['blue-yellow', 'Blue–yellow friendly (tritan)'],
  ['high-contrast', 'High contrast'],
] as const;
function save(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Preferences remain usable for this visit. */ }
}
export default function AppearanceControls({ onOpen }: { onOpen?: () => void }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  const [palette, setPalette] = useState(() => document.documentElement.dataset.palette || 'standard');
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const explicitTheme = useRef(document.documentElement.dataset.themeExplicit === 'true');
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => {
      if (!explicitTheme.current) {
        const next = query.matches ? 'dark' : 'light';
        document.documentElement.dataset.theme = next;
        setTheme(next);
      }
    };
    query.addEventListener('change', followSystem);
    return () => query.removeEventListener('change', followSystem);
  }, []);
  const chooseTheme = (next: string, explicit = true) => {
    explicitTheme.current = explicit;
    document.documentElement.dataset.themeExplicit = String(explicit);
    document.documentElement.dataset.theme = next;
    save(themeKey, explicit ? next : null);
    setTheme(next);
  };
  return <div className="appearance-controls">
    <button className="appearance-icon" aria-label="Dark mode" aria-pressed={theme === 'dark'} title="Dark mode" onClick={() => chooseTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Moon aria-hidden="true" size={21} /> : <Sun aria-hidden="true" size={21} />}
    </button>
    <button ref={trigger} className="appearance-icon" aria-label="Accessibility" title="Accessibility" aria-haspopup="dialog" onClick={() => { onOpen?.(); dialog.current?.showModal(); }}><Accessibility aria-hidden="true" size={22} /></button>
    <dialog ref={dialog} className="appearance-dialog" aria-labelledby="appearance-title" onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const stops = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, input:checked'));
      const first = stops[0], last = stops[stops.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onClose={() => trigger.current?.focus()} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current.close(); } }}>
      <div className="appearance-heading"><h2 id="appearance-title">Accessibility</h2><button className="appearance-icon" aria-label="Close accessibility" onClick={() => dialog.current?.close()}><X aria-hidden="true" size={22} /></button></div>
      <p>Choose a palette that makes controls and reading cues easier to distinguish. These options change presentation, not color vision.</p>
      <fieldset><legend>Color palette</legend>{palettes.map(([value, label]) => <label className="palette-option" key={value}><input type="radio" name="palette" value={value} checked={palette === value} onChange={() => { document.documentElement.dataset.palette = value; save(paletteKey, value); setPalette(value); }} /><span>{label}</span></label>)}</fieldset>
      <button className="system-theme" onClick={() => chooseTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', false)}>Use device theme</button>
      <p className="appearance-note">Light and dark mode are independent of your palette. Preferences are saved when browser storage is available.</p>
      <button className="appearance-close" onClick={() => dialog.current?.close()}>Close</button>
    </dialog>
  </div>;
}
