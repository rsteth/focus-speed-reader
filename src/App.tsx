import { useEffect, useState } from 'react';
import Library from './components/Library';
import Reader from './components/Reader';
import type { Book } from './types';
import { saveBook, getBooks, deleteBook, updateProgress } from './lib/db';

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBooks = async () => {
    const loaded = await getBooks();
    // Sort by last read or created
    loaded.sort((a, b) => (b.lastReadAt || b.createdAt) - (a.lastReadAt || a.createdAt));
    setBooks(loaded);
  };

  useEffect(() => {
    refreshBooks().finally(() => setIsLoading(false));
  }, []);

  const handleAddBook = async (title: string, content: string | ArrayBuffer, type: 'text' | 'epub') => {
    const newBook: Book = {
      id: crypto.randomUUID(),
      title,
      content,
      type,
      progress: 0,
      createdAt: Date.now(),
      lastReadAt: Date.now(),
      settings: { wpm: 300, chunkSize: 1 }
    };
    await saveBook(newBook);
    await refreshBooks();
  };

  const handleDeleteBook = async (id: string) => {
    if (confirm("Are you sure you want to delete this book?")) {
      await deleteBook(id);
      await refreshBooks();
    }
  };

  const handleUpdateProgress = async (id: string, progress: number) => {
    await updateProgress(id, progress);
    // Update local state without full refresh if possible for smoothness,
    // but usually refresh is fast enough.
    // Let's update the active book object too so it stays in sync if we close and reopen
    // Actually we only update when closing or pausing.
    setBooks(prev => prev.map(b => b.id === id ? { ...b, progress, lastReadAt: Date.now() } : b));
  };

  const handleCloseReader = () => {
    setActiveBook(null);
    refreshBooks(); // Ensure list is up to date with progress
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-500">Loading Library...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {activeBook ? (
        <Reader 
          book={activeBook} 
          onClose={handleCloseReader}
          onUpdateProgress={handleUpdateProgress}
        />
      ) : (
        <Library 
          books={books} 
          onOpen={setActiveBook}
          onAdd={handleAddBook}
          onDelete={handleDeleteBook}
          onRefresh={refreshBooks}
        />
      )}
    </div>
  );
}

export default App;
