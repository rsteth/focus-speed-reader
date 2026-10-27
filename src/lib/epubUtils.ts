import ePub from 'epubjs';
import type Section from 'epubjs/types/section';

export const extractTextFromEpub = async (epubData: ArrayBuffer): Promise<string[]> => {
  const book = ePub();
  try {
    await book.open(epubData);
    await book.ready;
    const sections: Section[] = [];
    book.spine.each((section: Section) => { if (section.linear) sections.push(section); });
    const words: string[] = [];
    for (const section of sections) {
      await section.load(book.load.bind(book));
      const body = section.document.querySelector('body');
      if (body) {
        const content = body.cloneNode(true) as Element;
        content.querySelectorAll('script, style').forEach(node => node.remove());
        content.querySelectorAll('p, div, br, li, h1, h2, h3, h4, h5, h6, blockquote').forEach(node => node.append(' '));
        words.push(...(content.textContent || '').split(/\s+/).filter(Boolean));
      }
      section.unload();
    }
    return words;
  } finally {
    book.destroy();
  }
};
