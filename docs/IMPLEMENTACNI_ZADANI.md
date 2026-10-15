# VALXON Academy: IMPLEMENTAČNÍ ZADÁNÍ PRO CLAUDE CODE

## 0. Účel této instrukce
Tento dokument je **prováděcí příkaz k implementaci**, ne žádost o analýzu, produktovou dokumentaci, technický návrh nebo nový statický prototyp.

Přečti `docs/PRODUCT_SPEC_V2.md` jako závazný popis produktu a oficiální trial-day zadání jako kontext. **Pokud jsou v původní specifikaci instrukce typu „nejprve navrhni plán a zastav se“, tato NOVÁ instrukce je v tomto bodě nahrazuje: po krátkém zjištění stavu pokračuj přímo implementací.** Nadále respektuj firemní bezpečnost a nutnost souhlasu k práci s neveřejnými daty.

**Výsledkem musí být samostatná, lokálně spustitelná webová aplikace VALXON Academy s opravdu fungujícím importem dodavatele.** Žádná změna `HR-main`, žádné nasazení ani nevyžádané odesílání dat. Připravené referenční moduly a HTML demo můžeš použít, ale nejsou hotovým produktem.

## 1. Co má uživatel skutečně udělat v prohlížeči
1. Otevřít lokální aplikaci (např. `http://localhost:3000`).
2. V administraci stisknout **+ Přidat dodavatele**.
3. Zadat název a URL webu dodavatele a/nebo nahrát skutečný PDF, DOCX či XLSX. Může přidat více zdrojů.
4. Volitelně ručně vložit až **10 názvů bestsellerů**; nejlepší je název + SKU nebo odkaz. AI bestseller nikdy sama nevymýšlí.
5. Stisknout **Načíst a vytvořit návrh** a dostat skutečný výsledek serverového zpracování souborů/URL, nikoli imitaci, starý JSON nebo proklikávací demo. Zobrazit skutečný průběh, chyby a zdroje.
6. Vidět předpřipravených **7 výukových kapitol**, extrahovaná fakta, původ citací, nevyplněné položky, nejasnosti, shody výrobků a obrázků; možnost upravit a schválit.
7. Stisknout **Publikovat** a ihned otevřít stránku nového dodavatele z katalogu.
8. V roli studenta přečíst obsah jako mini prezentaci/one-pager rozdělený do 7 obrazovek a po každé kapitole odpovědět na jednu otázku. Po odeslání (i nesprávné) zobrazit vysvětlení, přidat přesně jeden krok progresu a stav zachovat i po reloadu.
9. Vypnout a znovu zapnout aplikaci. Publikovaný dodavatel, zdroje a uložený progres musí zůstat dostupné.

## 2. Výuková podoba: držet se schválené představy
Inspirace W3Schools pro navigaci. Vlevo **7 kapitol**, uprostřed široká elegantní **prezentační plocha**, podél článku foto/časová osa/mapa/tabulka tam, kde jsou doložená data. Minimum drobných karet a žádný generický dashboard jako hlavní obrazovka. Vizuální identita: malina `#E84248`, antracit `#35383D`, Work Sans.

Povinné kapitoly:
1. **Seznam se s dodavatelem:** kdo, odkud, v čem je dobrý, mapa VALXON → sídlo dodavatele (nepředstírat skutečnou dopravní trasu).
2. **Příběh, vize a hodnoty:** pokud existují, historie, mise/vize, milníky, logo, zakladatelé, „Věděli jste, že…?“; žádné domýšlení.
3. **Co všechno nabízejí?:** segmenty → kategorie → hlavní typy produktů, přehledně a s vizuály.
4. **TOP 10 bestsellerů:** skutečné bestsellery jen ze seznamu správce; není-li seznam dodán, sekci nadepsat **Reprezentativní produkty**, nikoli bestseller. Najít přesné stránky/fotky podle URL/SKU/názvu nebo nechat k doplnění.
5. **Technologie a specializace:** materiály, potisky, jejich omezení, konkrétní příklady.
6. **Kdy a proč tohoto dodavatele využít?:** pro jakého klienta, MOQ podmínky, lhůty, vzorky, objednávání, reklamace a slabiny. Stručné a užitečné.
7. **Co si zapamatovat?:** tři hlavní poznatky a krátké procvičení včetně „Poznáš jejich výrobek?“ pokud lze ověřit obrázek.

Obsah má čtenáře **seznámit s firmou a naučit ho prakticky rozlišovat její možnosti**, ne být technickou dokumentací produktů. Příběh značky a její vize jsou důležité, pokud jsou skutečně doložené. U Hyponu nezaměňovat recyklovaný materiál obecně za mořský odpad u všech výrobků.

## 3. Skutečný import a pátrání po informacích
- Serverová pipeline: uložit přijatý dokument/URL → bezpečně získat dostupný obsah → extrahovat fakta podle sedmi kapitol → evidovat přesnou citaci/stranu/URL → navrhnout kapitoly a otázky → ruční review → publikace.
- Nejdříve vlastní web a dokumenty dodavatele; chybějící informace z externího webu dohledávat pouze pokud je dostupná legálně přístupná rešeršní služba nebo vlastní schválený nástroj. Oficiální zdroje mají přednost u obchodních pravidel.
- Pro weby vytvářené JavaScriptem používat povolené veřejné API/sitemap/strukturovaná data a podle potřeby browser rendering (např. Playwright). Při blokaci zobrazit jasné selhání a nabídnout další zdroj. **Nesimuluj úspěšné fetchování.**
- Externí AI nesmí dostat interní data bez schválení a nakonfigurovaného klíče. Pokud AI není povolená nebo klíč chybí, vytvoř pravdivý stav „AI extrakce nedostupná“, umožni načtení deterministických polí a manuální doplnění; **nepředstírej, že agent provedl research**.
- Produktové fotografie musí patřit k přesnému produktu (SKU/URL, nebo schválená shoda). Pokud fotku nelze spolehlivě potvrdit, nabídni správci ruční nahrání.
- Neveřejné nákupní ceny nesmějí být vystaveny studentské webové aplikaci ani v jejích volně dostupných JSON/HTML odpovědích.
- Na veřejné URL používej ochranu proti SSRF, časové limity, limity objemu a požadavků. Respektovat přístupová omezení cílových webů.

## 4. Schvalování a role
- **Správce** vidí zdroje, citace, stav ověření, rozpory a tlačítka Upravit / Schválit / Publikovat. Data může přezkoumat před publikací.
- **Student** vidí čistou schválenou prezentaci, bez interních stavu a cen. Oprávnění kontrolovat na serveru. Pokud jde pro demo o zjednodušený lokální účet, pravdivě ho označit jako vývojový, nikoliv produkční ochranu.
- Při publikaci nesmí vzniknout údaj, který neprošel příslušnou kontrolou; nepřevádět automaticky neověřené tvrzení na ověřené.

## 5. Implementační pořadí, nikoli dokumentační fáze
**Předběžná inventura:** ověř pouze přiložená zadání a dostupné běhové prostředí; aplikace začíná od nuly. Stačí několik vět; **nezastavuj se s žádostí o schválení plánu**. Ptej se pouze při bezpečnostním problému, potřebě externího placeného API, nevratné operaci nebo chybějících oprávněních.

**Milník A (nejvyšší priorita):** samostatná aplikace se startovacím skriptem a skutečným importem alespoň jednoho veřejně dostupného URL nebo dodaného souboru, s uložením výsledku, citací a chybovým stavem. Ověřit funkčně od nuly.

**Milník B:** editace/review/publikace dodavatele; univerzální sedmikapitolová studentská šablona nad importovanými daty.

**Milník C:** otázka po každé kapitole, uložený progres a vizuální kvalita podle referenční v3. Studentská kapitola má skutečný výklad, ne jen několik prázdných placeholderů.

**Milník D:** administrátorem vložené bestsellery a párování fotek, import dalších dvou odlišných dodavatelů stejnou cestou; pokud nejsou zdroje dostupné, to pravdivě uveď a nepředstírej úspěch.

**Milník E:** lokální end-to-end test, jednoduché spuštění na Windows, krátké README a závěrečný report.

**Nenahrazuj milníky diagramy, brainstormem, produktovou dokumentací ani statickým HTML demo souborem.** Dokumentace je doprovodný artefakt, nikoli dodávka.

## 6. Povinné doklady fungování
Na konci ukaž:
- Konkrétní změněné nebo vytvořené **zdrojové soubory** a jejich cesty.
- Skutečně vykonané instalační/build/testovací/spouštěcí příkazy a jejich výsledky (ne vymyšlené „testy prošly“).
- URL lokálního běžícího webu a postup, jak ho otevřít na Windows (`npm run dev` nebo skutečný příkaz dle package.json).
- Ověřený scénář: nový dodavatel → podklad → serverový import → review → publikace → sedm kapitol → jedna odpověď → uložený progres po reloadu.
- Screenshot úvodní studentské kapitoly a správcovského importu, pokud prostředí umožní otevřít web v prohlížeči.
- Přehled toho, co je **HOTOVÉ / ČÁSTEČNÉ / NEFUNGUJE**, se stručným vysvětlením a případným blokátorem.

Pokud chybí podklady nebo povolení pro AI, vytvoř uživatelsky funkční ne-AI část a přesně pojmenuj blokovaný AI krok. Neoznačuj aplikaci za hotovou, pokud import opravdu nefunguje.

## 7. Důležité výslovné zákazy
- Žádné úpravy `HR-main`.
- Žádné destruktivní Git operace, překrývání historie nebo nasazení bez schválení.
- Žádné automatické odesílání interních souborů třetí straně.
- Žádný nový dashboard/CRM/LMS mimo sedm kapitol.
- Žádné domyšlené zakladatele, bestsellery, prodejní čísla, MOQ, dodací lhůty nebo produktové fotografie.
- Žádná odpověď typu „hotovo“ bez fungujícího serveru a ověřeného skutečného importu.

**TEĎ ZAČNI VÝVOJEM. Nepiš další produktovou ani technickou specifikaci. První odpověď má potvrdit, které soubory upravíš a jaký první funkční scénář zavedeš; poté změny skutečně proveď.**
