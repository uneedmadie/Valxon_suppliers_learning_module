# VALXON Academy — Engineering Standards v3

## Stack a architektura
- Primárně TypeScript strict, Next.js + React + Tailwind pro frontend; NestJS pro nově budovaný API backend, pokud nepovede k destruktivnímu přepisu existující funkční aplikace.
- Databáze SQLite pro rychlý bezpečný lokální prototyp nebo PostgreSQL pro robustnější projekt. Vyber jednu ORM a konzistentně ji používej; navrhni migrace.
- Vrstvy odděleně: klientské UI ↔ validované REST kontrakty ↔ controller ↔ service ↔ repository/persistence ↔ externí adaptéry.
- Organizace podle domén: `suppliers`, `sources`, `imports`, `research`, `products`, `chapters`, `questions`, `progress`, `users`. Vytvářej jen moduly, které skutečně mají zodpovědnost.

## Příklad modularizace
```
apps/
  web/                       # Next.js, prezentační frontend
  api/
    src/
      modules/
        suppliers/
          dto/create-supplier.dto.ts
          dto/update-supplier.dto.ts
          dto/supplier-response.dto.ts
          entities/supplier.entity.ts
          suppliers.controller.ts
          suppliers.service.ts
          suppliers.module.ts
        imports/
          dto/create-import.dto.ts
          entities/import-job.entity.ts
          imports.controller.ts
          imports.service.ts
          imports.module.ts
        research/...
        chapters/...
        products/...
        questions/...
        progress/...
packages/
  contracts/                 # sdílené kontrakty, pokud jsou potřeba
```
Příklady jsou vodítko, ne požadavek založit prázdné soubory nebo všechno přepsat. Název NestJS modulu v plurálu drž konzistentně.

## TypeScript a API
- Bez implicitního `any`, bez zbytečných assertions; typování vstupů a výstupů, vyhýbat se nepředvídatelnému `unknown` bez zúžení.
- DTO validace (`class-validator`, `class-transformer`) a `ValidationPipe` pro NestJS; odmítnout invalidní soubory a URL.
- DB entity nevracet přímo klientovi, použít response DTO; interní ceny, klíče a neveřejné soubory nikdy do veřejného payloadu.
- Dependency injection, malé služby a explicitní HTTP chyby; pipeline pro PDF, DOCX, XLSX a URL mít samostatně testovatelnou.
- Neskladovat prompty, HTML ani připojení k providerovi natvrdo v controlleru. Pro scraper nepovolovat SSRF (localhost/private IP), dodržet limity.
- Tajné hodnoty pouze v lokální konfiguraci / env, necommitovat `.env.local`.

## Komentování: povinné, srozumitelné, česky
1. **Každý soubor** (mimo čistý JSON/data/automaticky generované soubory) uvádí účel a odpovědnost v úvodním komentáři. U TS/TSX to bude komentář, u CSS odpovídající CSS komentář.
2. Třídy, services, controllers, důležité React komponenty a významné metody mají TSDoc/JSDoc: co řeší, proč to existuje, argumenty, návratová hodnota, možné chyby, je-li relevantní.
3. **Před každým smysluplným logickým blokem netriviální logiky** (např. validace, výběr zdroje, párování SKU, transakce, mapování DTO, fallback, uložení progresu) napiš komentář popisující CO a PROČ. Bez mechanického komentáře každého `if`, `return`, `import`.
4. Pro business rozhodnutí komentář výslovně vysvětluje: bestsellery vybírá člověk; citace/nejistoty nejdou zamlčet; student vidí jen schválené; odpověď dokončuje kapitolu i při chybě.
5. Při refaktoringu oprav i zastaralé komentáře; kontrola komentářů je součást code review.
6. Komentáře česky; identifikátory kódu anglicky. Vyhýbat se komentářům, které jen mechanicky opakují zjevný název metody.

## UI
- Vizuální reference `docs/UI_REFERENCE.html`, hlavně typografie, strukturální sidebar, široký čitelný obsah, foto/hero, vědomá hierarchie.
- Role: student = čisté schválené kapitoly; admin = import, evidence, review, publikování. Kontrolu role provádí server.
- Pevná sedmidílná navigace a viditelný progres, který lze vysledovat po odpovědi a refreshi.
- Jednotná komponentová knihovna, rozdělení `features/`, `components/`, `api/`, `hooks/` dle velikosti; loading/empty/error stavy; přístupnost.
- Základní brand: malina #E84248, antracit #35383D, Work Sans. Vizuál nesmí připomínat interní produktovou databázi nebo tabulkový administrativní dokument.

## Doklad funkčnosti
- Skutečné lokální spouštění a reálné I/O, testy a screenshot, jsou-li možné.
- Jeden neznámý dodavatel → URL nebo nový dokument → extrakce → review → publish → 7 lekcí → odeslání otázky → reload → zachovaný progres.
- AI nemá-li legálně použitelnou službu/klíč, reálné dostupné části dokončit, ostatní pojmenovat jako blokované.
