'use client';
/**
 * Výběr souborů PDF/DOCX/XLSX přetažením nebo kliknutím. Typ ověřuje i server (podle obsahu).
 */
import { useRef, useState } from 'react';

const ACCEPT = '.pdf,.docx,.xlsx';
const ALLOWED = /\.(pdf|docx|xlsx)$/i;

export function FileDropzone({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);

  /** Přidá soubory, odfiltruje nepodporované typy a duplicity. */
  const add = (list: FileList | null): void => {
    if (!list) return;
    const incoming = Array.from(list);
    setRejected(incoming.filter((f) => !ALLOWED.test(f.name)).map((f) => f.name));
    const accepted = incoming.filter((f) => ALLOWED.test(f.name) && !files.some((x) => x.name === f.name && x.size === f.size));
    onChange([...files, ...accepted].slice(0, 10));
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-7 text-center ${dragging ? 'border-rose bg-[#fff6f6]' : 'border-[#c8cbd1] bg-[#f9fafb] hover:border-rose'}`}
      >
        <b className="block text-[13px] text-dark">Přetáhni katalogy, ceníky nebo podmínky sem</b>
        <small className="text-[11px] text-[#8b9099]">PDF, DOCX nebo XLSX · max. 10 souborů po 25 MB · zpracování probíhá jen lokálně</small>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {rejected.length > 0 && <p className="mt-2 text-[12px] text-rose-dark">Nepodporovaný typ: {rejected.join(', ')}</p>}
      {files.length > 0 && (
        <ul className="mt-3">
          {files.map((f) => (
            <li key={f.name + f.size} className="flex items-center justify-between border-b border-line py-2 text-[12px]">
              <span className="truncate text-dark">{f.name}</span>
              <span className="flex items-center gap-3 text-muted">
                {(f.size / 1024 / 1024).toFixed(2)} MB
                <button type="button" className="text-rose-dark hover:underline" onClick={() => onChange(files.filter((x) => x !== f))}>odebrat</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
