# VALXON Academy – dodavatelská učebnice

Samostatná aplikace, ve které správce naimportuje podklady dodavatele (web, PDF, DOCX, XLSX) a zkontroluje vytěžená fakta s citacemi. Ze schváleného obsahu pak publikuje **sedmidílnou výukovou prezentaci**. Student kapitolu dokončí až **odesláním kontrolní otázky** a jeho progres se ukládá.

## Spuštění na Windows

```bat
start.cmd
```

Při prvním spuštění skript nainstaluje závislosti a vytvoří lokální `.env` ze vzoru. Potom otevřete **http://localhost:3000**. API běží na http://localhost:4000/api (stav: `/api/health`).

Ruční spuštění: `npm install` a potom `npm run dev`. Vyžaduje Node.js 20.18 nebo novější.

## Jak se aplikace používá

1. V horní liště přepněte roli na **Správce** (vývojové přihlášení bez hesla, viz níže) a klikněte na **+ Přidat dodavatele**.
2. Vyplňte název, URL webu a/nebo nahrajte PDF/DOCX/XLSX. Volitelně zadejte **TOP 10 bestsellerů** (`Název | SKU | URL`). Pak klikněte na **Načíst a vytvořit návrh**.
3. Záložky review:
   - **Import a zdroje**: průběh, selhání, rozpory a chybějící témata.
   - **Fakta a citace**: ověření nebo zamítnutí faktů.
   - **Kapitoly a otázky**: přepsání textu, schválení kapitoly i otázky.
   - **Produkty**: párování bestsellerů a reprezentativní výběr.
   - **Profil a publikace**.
4. Po publikaci přepněte roli na **Student** a otevřete dodavatele v katalogu.

## Architektura

| Část | Technologie |
| --- | --- |
| `apps/api` | NestJS 11, TypeORM 0.3, SQLite (better-sqlite3), verzované migrace, DTO validace (class-validator) |
| `apps/web` | Next.js 16 (App Router), React 19, Tailwind CSS 4, Work Sans |

Doménové moduly API: `suppliers`, `sources`, `imports` (pipeline: bezpečný HTTP klient, crawler, extraktory, fakta), `facts`, `chapters`, `questions`, `products`, `progress`, `learning` (studentský pohled), `auth`, `users`.

Data (SQLite, nahrané soubory, lokální tajemství) leží v `apps/api/storage/`. Tento adresář je mimo Git.

## Testy a kontroly

```bat
npm run check
```

Příkaz spustí typecheck, lint, jednotkové testy API i webu a end-to-end test celého průchodu. E2E test používá lokální web fiktivního dodavatele a vygenerované PDF/DOCX/XLSX. Ověřuje cestu import → review → publikace → odpověď → restart aplikace → zachovaný progres.

## Bezpečnost a pravdivost

- **Import webu:**
  - ochrana proti SSRF: blokuje privátní IP a kontroluje DNS při každém připojení,
  - respektuje robots.txt,
  - limity stránek, velikosti a časové limity,
  - ověřování TLS je vždy zapnuté.
- **Soubory:** typ se ověřuje i podle obsahu. Soubory se ukládají pod náhodným názvem. **Cenové sloupce XLSX se neimportují.**
- **Student vidí jen** publikovaný obsah, schválené kapitoly a ověřená fakta. Správnou odpověď uvidí až po odeslání své odpovědi. Role kontroluje server.
- **Bestsellery** zadává výhradně správce. Fotografie se zobrazí jen u jednoznačně spárovaného produktu.

## Známá omezení (pravdivě)

- **AI extrakce a externí rešerše nejsou zprovozněné.** Není schválený poskytovatel ani klíč. Fakta se těží deterministicky z citací a texty kapitol jsou návrhy k ručnímu přepsání. Report importu to vždy uvádí.
- **Přihlášení je vývojové:** přepínač rolí bez hesla. Nejde o produkční ochranu.
- **Weby vykreslované JavaScriptem** se čtou přes HTML a sitemapu. Serverový prohlížeč (Playwright) zatím zapojený není, aplikace to hlásí a nabídne nahrání podkladů.
- **Weby s vadným TLS řetězcem nebo s blokací botů** (HTTP 403) se nenačtou. Aplikace to pravdivě hlásí.
- **OCR naskenovaných PDF** není implementováno.
- **Certifikát** za závěrečný test zatím neexistuje. Dokončení 7 kapitol certifikát nevydává.
