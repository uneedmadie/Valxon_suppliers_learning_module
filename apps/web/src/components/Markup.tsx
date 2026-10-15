/**
 * Vykreslení textu kapitoly ze značkování do čisté editorial typografie.
 */
import { parseMarkup } from './markup-parser';

/** Vykreslí tělo kapitoly. */
export function Markup({ source }: { source: string }) {
  const blocks = parseMarkup(source);
  if (blocks.length === 0) return null;
  return (
    <div className="article-prose">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return <h2 key={i}>{block.text}</h2>;
          case 'list':
            return (
              <ul key={i}>
                {block.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            );
          case 'quote':
            return <blockquote key={i} className="quote-line">{block.text}</blockquote>;
          default:
            return <p key={i}>{block.text}</p>;
        }
      })}
    </div>
  );
}
