import ePub from 'epubjs';

export const extractTextFromEpub = async (epubData: ArrayBuffer): Promise<string[]> => {
  const book = ePub(epubData);
  await book.ready;
  
  const words: string[] = [];
  
  // Iterate through the spine (chapters)
  // Note: This might take a moment for large books
  // @ts-ignore - epubjs types are incomplete
  const spineItems = book.spine.items; 
  
  for (const item of spineItems) {
    try {
      // Load the chapter
      const doc = await book.load(item.href);
      
      // We need to parse the document to text
      // Check if it's a generic object or Document
      if (doc instanceof Document) {
         // @ts-ignore
         const text = doc.body.innerText || doc.body.textContent || "";
         const chapterWords = text.trim().split(/\s+/).filter((w: string) => w.length > 0);
         words.push(...chapterWords);
      } else {
          // Sometimes epubjs returns a non-Document object depending on configuration
          // but usually load() returns a Document-like object if we don't render
          // Let's try to handle basic text extraction
          console.warn("Chapter loaded but not a Document:", item.href);
      }
    } catch (e) {
      console.error("Failed to load chapter", item.href, e);
    }
  }
  
  return words;
};