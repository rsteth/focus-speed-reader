import { set, get, del, values, update } from 'idb-keyval';
import type { Book } from '../types';

const STORE_PREFIX = 'speed-reader-book-';

export const saveBook = async (book: Book): Promise<void> => {
  await set(`${STORE_PREFIX}${book.id}`, book);
};

export const getBooks = async (): Promise<Book[]> => {
  const allValues = await values();
  // Filter only our books in case other things are stored
  return allValues.filter((v: any) => v && v.id && v.type) as Book[];
};

export const getBook = async (id: string): Promise<Book | undefined> => {
  return await get(`${STORE_PREFIX}${id}`);
};

export const updateProgress = async (id: string, progress: number): Promise<void> => {
  await update(`${STORE_PREFIX}${id}`, (old: Book | undefined) => {
    if (!old) throw new Error("Book not found");
    return { ...old, progress, lastReadAt: Date.now() };
  });
};

export const deleteBook = async (id: string): Promise<void> => {
  await del(`${STORE_PREFIX}${id}`);
};

// JSON Export/Import
export const exportLibrary = async (): Promise<string> => {
  const books = await getBooks();
  
  // Convert ArrayBuffers to Base64 for JSON storage
  const serializableBooks = await Promise.all(books.map(async (book) => {
    if (book.type === 'epub' && book.content instanceof ArrayBuffer) {
      const base64 = await arrayBufferToBase64(book.content);
      return { ...book, content: `base64:${base64}` };
    }
    return book;
  }));

  return JSON.stringify(serializableBooks);
};

export const importLibrary = async (json: string): Promise<void> => {
  try {
    const books = JSON.parse(json);
    if (!Array.isArray(books)) throw new Error("Invalid library format");

    for (const book of books) {
      if (typeof book.content === 'string' && book.content.startsWith('base64:')) {
        const base64 = book.content.replace('base64:', '');
        book.content = base64ToArrayBuffer(base64);
      }
      await saveBook(book);
    }
  } catch (e) {
    console.error("Failed to import library", e);
    throw e;
  }
};

// Helpers
function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer]);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}