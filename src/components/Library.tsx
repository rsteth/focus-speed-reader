import React, { useState, useRef } from 'react';
import type { Book } from '../types';
import { Plus, Trash2, BookOpen, FileText, Download, Upload, Loader2 } from 'lucide-react';
import { exportLibrary, importLibrary } from '../lib/db';

interface LibraryProps {
  books: Book[];
  onOpen: (book: Book) => void;
  onAdd: (title: string, content: string | ArrayBuffer, type: 'text' | 'epub') => Promise<void>;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const Library: React.FC<LibraryProps> = ({ books, onOpen, onAdd, onDelete, onRefresh }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [textInput, setTextInput] = useState("");
  const [inputType, setInputType] = useState<'paste' | 'file'>('paste');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAdd = async () => {
    if (!newTitle) return;
    setIsProcessing(true);
    try {
        if (inputType === 'paste') {
            await onAdd(newTitle, textInput, 'text');
        } else {
            const file = fileInputRef.current?.files?.[0];
            if (file) {
                const buffer = await file.arrayBuffer();
                // Basic check, usually epubs are application/epub+zip, but extension check is easiest
                const isEpub = file.name.endsWith('.epub');
                await onAdd(newTitle, buffer, isEpub ? 'epub' : 'text'); // Fallback logic?
                // Actually if it's not epub, we probably should read as text.
                // But for now, let's assume file upload is for EPUBs as requested.
            }
        }
        setIsAdding(false);
        setNewTitle("");
        setTextInput("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
        console.error(e);
        alert("Failed to add book");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleExport = async () => {
      try {
          const json = await exportLibrary();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `speed-reader-backup-${new Date().toISOString().slice(0,10)}.json`;
          a.click();
      } catch (e) {
          console.error(e);
          alert("Export failed");
      }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsProcessing(true);
      try {
          const text = await file.text();
          await importLibrary(text);
          onRefresh();
          alert("Library imported successfully!");
      } catch (e) {
          console.error(e);
          alert("Import failed. Invalid file format.");
      } finally {
          setIsProcessing(false);
          if (e.target) e.target.value = "";
      }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-blue-500">Focus Speed Reader</h1>
        <div className="flex gap-2">
            <label className="p-2 bg-slate-800 rounded hover:bg-slate-700 cursor-pointer" title="Import JSON">
                <Upload className="w-5 h-5" />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button onClick={handleExport} className="p-2 bg-slate-800 rounded hover:bg-slate-700" title="Export JSON">
                <Download className="w-5 h-5" />
            </button>
            <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
                <Plus className="w-5 h-5" />
                <span className="hidden md:inline">Add Book</span>
            </button>
        </div>
      </div>

      {isAdding && (
        <div className="mb-8 p-6 bg-slate-800 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-xl font-semibold mb-4">Add New Content</h3>
            <div className="space-y-4">
                <input 
                    type="text" 
                    placeholder="Title" 
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded focus:border-blue-500 outline-none"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                />
                
                <div className="flex gap-4 border-b border-slate-700 pb-2">
                    <button 
                        className={`pb-2 ${inputType === 'paste' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
                        onClick={() => setInputType('paste')}
                    >
                        Paste Text
                    </button>
                    <button 
                        className={`pb-2 ${inputType === 'file' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
                        onClick={() => setInputType('file')}
                    >
                        Upload File (EPUB)
                    </button>
                </div>

                {inputType === 'paste' ? (
                    <textarea 
                        className="w-full p-3 h-40 bg-slate-900 border border-slate-700 rounded focus:border-blue-500 outline-none font-mono text-sm"
                        placeholder="Paste your text here..."
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                    />
                ) : (
                    <div className="p-8 border-2 border-dashed border-slate-700 rounded flex flex-col items-center justify-center text-slate-400 bg-slate-900">
                        <input type="file" accept=".epub" ref={fileInputRef} className="mb-2" />
                        <span className="text-xs">Supports .epub files</span>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button 
                        onClick={handleAdd} 
                        disabled={isProcessing}
                        className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                        Add to Library
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {books.map(book => (
            <div key={book.id} onClick={() => onOpen(book)} className="group relative bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/10">
                <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-slate-900 rounded-lg text-blue-400">
                        {book.type === 'epub' ? <BookOpen className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}
                        className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                <h3 className="font-semibold text-lg line-clamp-1 mb-1">{book.title}</h3>
                <div className="flex justify-between items-end">
                    <div className="text-sm text-slate-400">
                        {book.type === 'epub' ? 'EPUB Book' : 'Text Article'}
                    </div>
                    {book.progress > 0 && (
                        <div className="text-xs bg-slate-900 px-2 py-1 rounded text-blue-400">
                            {book.progress} words read
                        </div>
                    )}
                </div>
            </div>
        ))}

        {books.length === 0 && !isAdding && (
            <div className="col-span-full py-20 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Your library is empty.</p>
                <p className="text-sm">Add a book or article to get started.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Library;