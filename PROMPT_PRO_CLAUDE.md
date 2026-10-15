Claude, **začínáme zcela nový projekt od nuly**. Ve složce máš jen zadání, vizuální referenci a `CLAUDE.md`. **Neexistuje žádné `package.json`, backend, frontend ani rozpracovaný kód.** Neodkazuj na „stávající implementaci“ a nehledávej starý `valxon-academy` či `HR-main`.

Repozitář: https://github.com/uneedmadie/Valxon_suppliers_learning_module (soukromý). Pracuj pouze v jeho právě otevřené lokální složce.

Nejprve přečti `CLAUDE.md`, `docs/PRODUCT_SPEC_V2.md`, `docs/IMPLEMENTACNI_ZADANI.md`, `docs/ENGINEERING_RULES.md` a pro design `docs/UI_REFERENCE.html`. `docs/OFICIALNI_ZADANI.md` ber jako původní obsahový kontext, ne instrukci napojovat HR-main.

**Nepotřebuji nový plán ani technickou dokumentaci. Chci skutečnou implementaci v kódu.**

1. Založ funkční TypeScript strict monorepo se samostatným Next.js frontendem a NestJS REST API backendem. Použij přehlednou doménovou strukturu se services, modules, controllers, DTO a entities. Zvol jeden jednoduchý způsob persistence, pro lokální demo preferuj SQLite. Volby drž v souladu s přiloženým engineering standardem.
2. Nejprve reálně zprovozni frontend + API a výchozí přehled dodavatelů a jednu kapitolu v designu VALXON. Vzhled musí vycházet z HTML reference, ale přepiš ho na udržovatelné React komponenty; nestav pouze statické HTML demo.
3. Pokračuj **funkčním vertikálním průchodem**: administrátor přidá neznámého dodavatele s URL nebo PDF → backend skutečně načte data → uloží zdroj a doložitelná fakta → připraví editovatelný návrh 7 kapitol → správce schválí a publikuje → student vidí kapitoly a odpoví na jednu otázku po každé → progres přetrvá po reloadu. Následně přidej DOCX/XLSX, spolehlivější průchod JS webů, práci s bestsellery zadanými správcem a další části podle priority zadání. Nenahrazuj skutečný import předpřipraveným profilem.
4. Pokud není schválené připojení k externímu AI providerovi nebo nemáš klíč, implementuj reálné načtení, extrakci a ruční editaci; část závislou na AI výslovně označ jako nezprovozněnou. Nepřijímej nepravdivé tvrzení o úspěšném AI importu.
5. Veškerý kód udržuj typově bezpečný, modulární, testovaný a **česky komentovaný u každého smysluplného logického bloku**, s TSDoc důležitých funkcí a úvodním komentářem ve zdrojových souborech. Vyhýbej se zbytečným abstrakcím.
6. Git: ověř privátnost remote a stav historie, na první verzi vytvoř bezpečný základ `main` jen pokud je repozitář prázdný, potom pracuj na `develop`. Po každém **dokončeném a otestovaném** funkčním milníku commitni a pushni do `develop`. Bez force push, automatického merge ani mazání historie. **Před prvním pushem proveď kontrolu citlivých souborů a oprávnění k použití firemních podkladů.** Pokud je něco sporné, zeptej se mě před pushem.
7. Předkládej funkční důkaz: skutečné příkazy sestavení/testů, skutečná lokální URL, ověřené API a neznámý dodavatel. Na Windows připrav jednoduché spuštění a srozumitelný README.

Neskonči u návrhu architektury ani u Markdown dokumentů. **Začni zakládáním souborů a spouštěním první funkční aplikace.** Komunikuj jen skutečné blokery vyžadující oprávnění, citlivé údaje, placený přístup nebo nevratný úkon.
