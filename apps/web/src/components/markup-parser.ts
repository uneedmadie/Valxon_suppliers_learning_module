/**
 * Parser jednoduchého značkování textu kapitol (`## nadpis`, `- odrážka`, `> citace`,
 * prázdný řádek = nový odstavec). Výstupem jsou bloky pro React – žádné HTML, tedy žádné XSS.
 */

export type MarkupBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string };

/** Rozparsuje text kapitoly do bloků. */
export function parseMarkup(source: string): MarkupBlock[] {
  const blocks: MarkupBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      blocks.push({ type: 'heading', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      flushParagraph();
      // Navazující odrážky se slučují do jednoho seznamu.
      const last = blocks[blocks.length - 1];
      if (last?.type === 'list') last.items.push(line.slice(2).trim());
      else blocks.push({ type: 'list', items: [line.slice(2).trim()] });
    } else if (line.startsWith('> ')) {
      flushParagraph();
      blocks.push({ type: 'quote', text: line.slice(2).trim() });
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();
  return blocks;
}
