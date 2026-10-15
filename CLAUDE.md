# VALXON Academy | CLAUDE.md (nový projekt od nuly)

## Nejdůležitější aktuální skutečnost
**Neexistuje dosavadní kód aplikace.** Tento repozitář obsahuje pouze zadání, `.gitignore` a referenční HTML návrh. Tvým úkolem je **vytvořit funkční standalone produkt od nuly**. Nepokoušej se importovat `HR-main` ani použít předchozí spustitelný projekt. Nově vytvořená aplikace patří do tohoto GitHub repozitáře.

## Zdroj pravdy a výsledný produkt
Čti postupně `docs/PRODUCT_SPEC_V2.md`, `docs/IMPLEMENTACNI_ZADANI.md`, `docs/ENGINEERING_RULES.md`, `docs/UI_REFERENCE.html`; `docs/OFICIALNI_ZADANI.md` slouží pro obchodní kontext. Jakákoli stará formulace „prohlédni stávající projekt“ se nahrazuje **„vytvoř nový projekt“**. Současné zadání má přednost před historickými odkazy a požadavky na HR-main.

Cíl: interaktivní VALXON Academy s administrátorským importem URL, PDF, DOCX, XLSX a rešerší podloženou zdroji, ručně zadávanými bestsellery, editací a schválením, **přesně sedmi výukovými kapitolami** dodavatele, otázkou po každé kapitole a uloženým progresem. Student má získat stručný, zapamatovatelný, vizuálně atraktivní firemní příběh, nikoli technickou databázi. Údaje bez zdrojů nevymýšlej. Celý systém standalone, bez `HR-main`.

## Technické standardy
- `strict` TypeScript, Next.js + React + Tailwind frontend, NestJS REST API, konzistentní ORM a lokální persistence; DTO validace, oddělené response DTO, služby/controller/moduly/entities dle domén.
- Monorepo je vhodné; nepoužívej neúčelné abstrakce. Začínej nejmenším skutečně fungujícím vertikálním průchodem.
- **Komentáře česky:** úvod každého zdrojového souboru popíše účel; důležité třídy/metody a komponenty mají TSDoc/JSDoc; **před každým netriviálním logickým blokem komentuj co a proč**. Samozřejmé `return` a `import` mechanicky nekomentuj. Při změně chování oprav komentáře.
- Testy, typecheck, lint a reálné spuštění jsou součástí implementace, ne až budoucí práce.

## Design, který se nesmí ztratit
- Firemní barvy `#E84248` a `#35383D`, Work Sans, čistý editorial styl, hero a široký hlavní obsah, 7 kapitol s boční navigací, vhodné fotografie a vizuály. Ne generický CRM dashboard ani zástup malých uniformních karet.
- 7 kapitol dle specifikace, vize jen pokud doložená, TOP 10 bestsellery pouze při správcem doloženém seznamu, jinak reprezentativní výběr.
- Kapitola je dokončená až po **odeslání** krátké kontrolní otázky, i když je odpověď nesprávná; vysvětlení + uložený progres po reloadu.
- Administrator vidí zdroje, rozpory a stav review; student jen schválený výukový obsah. Role jsou chráněné na backendu.

## Git a bezpečnost
- GitHub repo: `uneedmadie/Valxon_suppliers_learning_module`, uživatelka má přihlášené `gh`.
- Pracuj na `develop`, `main` je stabilní. U prázdného repa můžeš nejdříve bezpečně založit počáteční commit na `main`, poté `develop`.
- Po každém hotovém/testovaném milníku: `git status` + testy + kontrola staged diff/secrets + smysluplný Conventional Commit + push `develop`. Nic nemerguj do `main` bez schválení. Nikdy nepoužívej force push.
- Ověř privátnost repa a oprávnění publikovat firemní podklady. **Interní katalogy, ceny, originální zadání a plný HTML seed nemají být ve veřejně dostupných artefaktech ani v Gitu bez výslovného oprávnění.** `.gitignore` obsahuje ochranné výjimky; neobcházej je potichu. Tajemství pouze `.env` lokálně a `.env.example` bez hodnot.
- Web scraping s limity, SSRF ochranou, respektováním přístupových omezení. Bez schváleného externího AI providera neposílej neveřejná data. Chybějící AI označ, nepředstírej reálný úspěch.

## Konkrétní rytmus
1. Nainstaluj/založ nový projekt a spusť frontend i API.
2. Implementuj skutečné importní I/O + review + publikaci pro jednoho **neznámého** dodavatele.
3. Sedm vizuálních kapitol, otázka/progres/persistence, poté vylepšení dle priorit.
4. Po každém kroku proveď reálné testy, zaznamenej výsledky, commitni a pushni develop.

**Neposílej dlouhou architektonickou dokumentaci místo kódu.** Informuj stručně o hotových souborech, skutečných testech a lokálním URL. Vývoj nesmí uváznout jen v návrhu. Skutečný AI import a autentizaci nepředstírej, pokud nejsou funkční.
