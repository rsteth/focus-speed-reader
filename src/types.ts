export interface Book {
  id: string;
  title: string;
  type: 'text' | 'epub';
  content: string | ArrayBuffer; // string for text, ArrayBuffer for epub
  progress: number; // current word index
  totalWords?: number; // for text content mainly
  createdAt: number;
  lastReadAt: number;
  settings?: {
    wpm: number;
    chunkSize: number; // words per flash
  };
}

export interface AppSettings {
  theme: 'dark' | 'light';
  defaultWpm: number;
}
