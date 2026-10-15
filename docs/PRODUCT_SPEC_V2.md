# VALXON Academy | Supplier Discovery & Learning
## Finální produktová specifikace v2.0 pro Claude Code

**Datum rozhodnutí:** 15. 10. 2026  
**Stav:** schválená produktová specifikace, nikoli již dokončený software  
**Režim projektu:** samostatná lokálně spustitelná aplikace, **mimo `HR-main`**; pozdější integraci pouze umožnit exportem/API  
**Vizuální reference:** `docs/UI_REFERENCE.html` (pouze reference, nikoli funkční import)  
**Hlavní zadání:** `docs/OFICIALNI_ZADANI.md`

> **Produkt jednou větou:** Správce zadá URL dodavatele a/nebo nahraje katalogy → systém cíleně vytěží a dohledá doložené informace podle témat → správce vše ověří a doplní vlastní TOP 10 bestsellerů → automaticky vznikne jednoduchá a poutavá **sedmidílná vzdělávací prezentace dodavatele**, kterou student postupně dokončuje zodpovězením krátké otázky po každé kapitole.

---

## 1. Neměnná zadavatelská pravidla

- Hlavní funkcí není dashboard ani kvízový portál, ale **opakovatelná výroba učební části z dodavatelských podkladů**. Zaměstnanec, který dodavatele nezná, má získat základ pro další obchodní práci s ním.
- **Hypon** zpracovat nejdůkladněji, **Bottle Promotions** a **MidOcean** stejným postupem; generalistu učit přes orientaci v kategoriích, nikoli soupis tisíců SKU. Import musí fungovat i na neznámém dodavateli **bez dopisování jeho stránky do kódu**.
- Podklady dodavatele jsou faktickým základem. **Existující testové otázky nejsou zdrojem faktů pro učebnici.**
- Tvrdá fakta musí být doložitelná, neznámé údaje se neimprovizují. Informace chybějící na oficiálním webu lze dohledat externím researchem, ale výstupy musí být označené zdrojem a před zveřejněním schválené.
- Původní trial-day zadání počítá s PR do firemního repa a testem čtvrtého dodavatele. **Aktuální explicitní rozhodnutí uživatelky:** vyvíjet **samostatně mimo `HR-main`**. Toto je dočasná, vědomá odchylka od původního způsobu odevzdání. Nesmí se tvrdit, že firemní integrace nebo PR byly splněny.
- Nepřidávat nové funkce, které odvádějí pozornost od fungujícího importu a výukového obsahu.

## 2. Produktový princip: pitch deck + one-pager + mikroučení

- Každý dodavatel má vlastní vizuálně přitažlivou **produktovou prezentaci**, rozdělenou do **přesně 7 kapitol**.
- Obsah má mít charakter **dobře vystavěného příběhu**, ne generického firemního formuláře ani dlouhé encyklopedie. Vybrat to, co je na firmě skutečně důležité, typické a obchodně užitečné.
- Inspirace: přehledný obsah a navigace po kapitolách ve stylu W3Schools, silný úvod podobný prezentačnímu slidu, fotografie, mapy a stručná vysvětlení.
- Nepoužívat záplavu kartiček. Upřednostnit širší obsahové sekce, typografii, obrázky a jednoduchá srovnání.
- Výklad může mít tlačítko „Více detailů“ pro složitější obchodní parametry, aby hlavní příběh neztratil tempo.

## 3. Sedm závazných kapitol

### 01. Seznam se s dodavatelem
Kdo je, odkud je, čím se zabývá, specializace a unikátní prodejní hodnota. Krátký hero úvod a mapa **VALXON → sídlo dodavatele**, s logy a přiměřeným měřítkem. Nepředstírat dopravní trasu.

### 02. Příběh, vize a hodnoty
Pokud existuje a je doložená, uvést **vizi a misi**; dále krátká historie, zakladatelé s fotografiemi, historie loga, 2–4 významné milníky na časové ose a jeden „Věděli jste, že…?“ moment. Neznámé údaje se nevyplňují. Příklad Hypon: záměr posunout reklamu k udržitelnějším materiálům, využití vlákna s podílem mořského odpadu u relevantních produktů, doložené darování 5 % zisku Plastic Soup Foundation. **Nevydávat všechno zboží Hyponu za výrobky z mořského odpadu.**

### 03. Co všechno nabízejí?
Rychlá orientace **segmenty → kategorie → hlavní produktové skupiny**. Vizuální produktové fotografie a krátké popisy, případně rozbalení detailu. U generalistů výběr kategorií, ne úplný výpis katalogu.

### 04. TOP 10 bestsellerů
**Názvy skutečných bestsellerů (ideálně také SKU nebo produktové URL) vždy dodává správce.** AI je **nesmí sama označit za bestsellery** podle domnělé popularity či umístění na homepage. AI podle seznamu spáruje produkty s katalogem/weby a doplní ověřenou originální fotografii, popis, materiál, varianty, technologii brandingu a obchodně zajímavou vlastnost. Nejasnou shodu správce potvrzuje. Pokud seznam není dodaný, kapitola může obsahovat označený „Reprezentativní výběr produktů“ (pro demo např. 10 výrobků Hypon), **nikoli tvrzení TOP bestsellerů**. Produktová fotografie nikdy nesmí být jen podobný výrobek vydávaný za originál.

### 05. Technologie a specializace
Jaké jsou technologie výroby, potisku a personalizace; **kam** lze logo umístit, které materiály/techniky se hodí pro různé situace a jaká mají omezení. Zobrazit příklad na reálném výrobku, ne jen definice.

### 06. Kdy a proč tohoto dodavatele využít?
Krátké reálné scénáře „Pro jakého klienta?“, praktické výhody a slabiny. Obchodně zásadní fakta přehledně: MOQ s podmínkami, výroba × expedice × doručení, vzorky, objednávky, reklamace, případně kontakt. Není třeba zaplnit povinná pole balastem, ale nováček má pochopit, kdy dodavatele zvažovat a co ověřit před poptávkou.

### 07. Co si zapamatovat?
**Tři klíčové poznatky**, stručné shrnutí, obrazová otázka „Poznáš jejich výrobek?“ nebo jiné krátké praktické cvičení a informace o dalším studiu/testu. Certifikát „Certifikovaný znalec [dodavatel]“ je navazující funkce po splnění schváleného závěrečného testu, nikoli za samotné proklikání kapitol.

**Pravidlo flexibility:** sedm názvů tvoří konzistentní navigaci. Uvnitř kapitol se struktura, míra detailu a vizuály přizpůsobí typu dodavatele a doloženým skutečnostem. Nezjištěný zakladatel, neexistující vize nebo chybějící historie loga nevytvářejí falešný obsah.

## 4. ROZHODNUTÍ B: postup studiem po odpovědi

**Definitivně schváleno uživatelkou: každá kapitola se označí za dokončenou až po zodpovězení jedné krátké kontrolní otázky, nikoli kliknutím na tlačítko „Hotovo“.**

### Přesná funkční pravidla

1. Uživatel otevře kapitolu, projde výklad a na konci uvidí **jednu krátkou kontrolní otázku** (např. A/B/C, pravda/nepravda, výběr fotografie, krátká situační úloha).
2. Dokončení se zaznamená **až po skutečném odeslání odpovědi**. Pouhé otevření stránky, scrollování nebo přechod na další kapitolu **nezvyšuje procento dokončení**.
3. Po odeslání se zobrazí **okamžité vysvětlení** odpovědi včetně souvisejícího faktu. **Nesprávná odpověď automaticky nezablokuje kapitolu**: i ta je zodpovězená a je příležitostí k učení. Nabídnout možnost opravy/zkusit znovu, ale nevyvolávat nekonečné hádání.
4. Kapitola po odpovědi získá stav `completed`. Uložit **ID uživatele, dodavatele, kapitoly, ID/verzi otázky, odpověď, správnost, datum**. Odpověď neukládat duplicitně při refreshi a nedovolit označit dokončení bez otázky.
5. Progres dodavatele = **počet kapitol `completed` / 7**. Zobrazení například `3/7 · 43 %` a sedm malých kroků. Vrátit se ke staré kapitole lze kdykoliv. Pokud se kapitola mění, neodmazávat automaticky dosažený progres; případné opakování po zásadní změně obsahu řídit verzováním a samostatným pravidlem.
6. **Dokončení sedmi kapitol není automaticky certifikace.** Certifikát patří až po úspěšném schváleném závěrečném testu, jehož hranici úspěšnosti určí VALXON. Nepředstírat oficiální certifikát dříve.
7. Otázka musí mít **doloženou správnou odpověď**. AI návrh otázky prochází schválením; nepoužívat neověřené detaily či záměrně klamavé odpovědi založené na chybných datech.
8. Pokud pro kapitolu není schválena žádná otázka, správce vidí „Chybí kontrolní otázka“ a musí ji doplnit/schválit; studentovi nezobrazovat falešně dokončitelnou kapitolu.

**Akceptační scénář:** Před odpovědí se průběh nezmění; po kliknutí na odpověď a jejím odeslání se zvýší právě o jeden sedminový krok, zobrazí se vysvětlení a po obnovení stránky stav zůstane. Špatná odpověď zobrazí vysvětlení a kapitolu označí za zodpovězenou. Certifikát se tím nevydá.

## 5. Reálný import a AI rešeršní agent (P0)

**Jednoduchý správcovský vstup:** `+ Přidat dodavatele` → název, **URL a/nebo více souborů PDF/DOCX/XLSX**, volitelný text a pole **TOP 10 bestsellerů vyplňované správcem** (názvy, doporučeno SKU/URL).

1. **Sběr podkladů:** načíst oficiální web, relevantní podstránky (About/History/Vision/Products/Printing/Delivery/FAQ/Contact), katalogy, ceníky. Zaznamenat URL/dokument, datum a konkrétní podstránku nebo stránku PDF.
2. **Cílené otázky:** sedm kapitol určuje výzkumný plán. Systém hledá jen fakta k požadovaným tématům, ne všechen obsah internetu. Řeší i jinou strukturu u jednotlivých dodavatelů.
3. **Druhotná rešerše:** chybějící fakta hledat na veřejném internetu přes důvěryhodné externí zdroje. Každé tvrzení mít citaci/URL/datum a jasné rozlišení oficiální vs. externí zdroj. Nalezené informace nejsou automaticky schválené. Nepoužívat články k přepsání oficiálních MOQ či dodacích závazků.
4. **Dynamické JavaScriptové weby:** nejprve zkusit strukturovaná data, sitemap/feed/API, pak podle potřeby serverový prohlížeč (např. Playwright) pro vykreslení JS a extrakci produktových odkazů a obrázků. Nepřekonávat omezení přístupu nebo login bez oprávnění. Pokud je web neprůchodný, nabídnout ruční nahrání katalogu, export stránek nebo doplnění odkazu.
5. **Párování bestsellerů:** první SKU či přesná URL, poté přesný název + varianty; při více kandidátech zobrazit možnosti pro výběr správcem. Originální fotografie se váže na potvrzený výrobek, ukládá se zdroj a licence/oprávnění k užití. Pokud fotografii nelze bezpečně ověřit, nechat ji prázdnou a požádat o upload.
6. **Extrakce + report:** sestavit profil s typem dodavatele, segmenty, obsahem kapitol a zdroji; vypsat rozpory, chybějící informace, nejisté shody produktů, neúspěšné URL a doporučení, co ručně doplnit.
7. **Schválení:** editor upraví/ověří fakta, text a fotografie, schválí otázky, zobrazí studentský náhled a publikuje. Výsledkem je nový profil a sedm kapitol, **bez změny kódu specifické pro dodavatele**.

**Nesimulovat reálný import:** pouhý výběr souborů a stažení manifestu, načtení předem uloženého AI výstupu nebo fiktivní úspěch neprokazují funkčnost importu.

## 6. Dvě role a vizuální identita

**Student:** vidí čitelnou sedmidílnou prezentaci, navigaci kapitol, malé kroky progresu, fotografie, příběhy, otázky a jejich vysvětlení. Nevidí rušivé stavy ověření, interní ceny ani proces schvalování. Jen schválené fakta.

**Správce:** import dodavatele, hlášení o průběhu, ověřování jednotlivých zdrojů/údajů, řešení rozporů a fotek, zadání TOP 10, schvalování otázek a publikace. Kontroly oprávnění na serveru, ne jen frontendový přepínač.

**Brand:** VALXON malina `#E84248`, antracit `#35383D`, font Work Sans. Klidný moderní editorial styl, ne dashboard plný mini kartiček. Krátké kapitoly, výrazné obrázky, přehledné interakce. Mapy respektují lokaci a nepředstírají přepravní trasu.

## 7. Spolehlivost a bezpečnost

- Žádná smyšlená čísla, bestsellery, historie nebo obrázky. Podmíněné hodnoty jako MOQ/lead times **zachovávat s podmínkami** a správnými jednotkami.
- U tvrdých údajů zdroj, přesná citace, datum a stav ověření; citace sama o sobě nezaručuje správnou interpretaci.
- Skryté interní nákupní ceny a soubory nesmí být v klientském HTML/JSON. Externí AI nad neveřejnými daty jen se schválením VALXONu.
- URL ingest: limit požadavků, ochrana před SSRF, timeouty, validace formátu, respektování omezení webů. Dokumenty: typ/velikost, případné OCR u skenů, bezpečné ukládání. Fotografie: zdroj, oprávnění, správná varianta produktu.
- Stav studia i schválení persistovat do úložiště; lokální browser demo není validní důkaz persistence.

## 8. Priority a hotová práce

**P0: prokazatelně fungující import z URL/PDF/DOCX/XLSX → evidence → review → publikovaná učebnice sedmi kapitol** v samostatné aplikaci; zpracování Hypon/Bottle Promotions/MidOcean stejným generátorem; minimální kontrolní otázka po každé kapitole + trvalý progres. Vstup TOP 10 správcem a párování s reálnými daty jsou součástí workflow; pokud nejsou názvy dodané, označit reprezentativní produkty, ne bestsellery.

**P1:** rozšířený veřejný research agent s kontrolou odkazů, spolehlivější extrakce z JS katalogů, vyšší vizuální kvalita, pokročilé typy otázek a propojení návrhů otázek s budoucí akademií.

**P2:** certifikát po schváleném závěrečném testu, případné automatické audity starých otázek, pokročilé opakování, API integrace do firemního `HR-main` **až na výslovné zadání**.

**Hotový produkt vs. referenční soubory:** balíček obsahuje původní kód vázaný na `HR-main` a statické UI demo. Obojí jsou pouze **reference**. Je potřeba postavit a spustit novou nezávislou aplikaci; nic z uvedeného samo nedokazuje reálný import.

## 9. Akceptační testy

- [ ] Nový dodavatel bez speciálního kódu: URL + dokument → skutečné zpracování → doložený profil → review → publikace.
- [ ] JavaScriptový produktový web: systém vytěží data povoleným způsobem nebo jasně vysvětlí blokaci; nepředstírá úspěch.
- [ ] Správcem zadaný bestseller se přes SKU/URL/jméno propojí s přesným produktem a autentickou fotografií, nebo se označí k ruční kontrole.
- [ ] Externě dohledaná historie/vize má konkrétní URL a stav ke schválení; nevznikají smyšlené informace.
- [ ] Hypon má kvalitní výukový příběh, vizi, průřez 10 výrobky a obchodní informace; Bottle Promotions a MidOcean používají totožnou pipeline.
- [ ] Kapitola 1 zůstane nedokončená po pouhém otevření; dokončí se po odeslání otázky a zobrazí zpětnou vazbu.
- [ ] Po obnovení stránky je progres zachovaný, 7 kapitol = 7 zodpovězených otázek; nesprávná odpověď nezablokuje progres.
- [ ] Student nevidí interní ceny ani stavy schvalování. Správce má kontrolu zdrojů a možnost publikace.
- [ ] Certifikát není vydán pouhým dokončením sedmi kapitol. Nasazuje se až po schváleném závěrečném testu.

## 10. Co je ještě třeba dodat (nepředstírat, že je dodáno)

1. **Seznam TOP 10 bestsellerů** pro Hypon (a následně další dodavatele), nejlépe název + SKU/URL; uživatelka potvrdila, že je může dodat, ale v této konverzaci konkrétní seznam zatím **není**.
2. **Originální katalogy a další podklady**, které má VALXON poskytnout schváleným způsobem. Uživatelka potvrdila záměr je dodat; jejich úplné původní sady zatím nemáme.
3. **Pravidlo dokončení kapitol je UZAVŘENÉ:** varianta **B, jedna odeslaná otázka na konci kapitoly**. Neptat se znovu, zda A/B/C.
4. Pravidla přístupu k neveřejným podkladům a případně schválený AI provider je třeba ověřit před využitím.

---

### Aktuální prováděcí pokyn pro Claude Code

Nejprve přečti tento dokument a soubor `docs/IMPLEMENTACNI_ZADANI.md`. Po základním ověření zadání v novém, zatím prázdném repozitáři **založ a implementuj** nejkratší bezpečný funkční průchod ke skutečnému importu; **nezastavuj se tvorbou dalšího plánu**. Nesmíš upravovat `HR-main`. Neimplementuj další dashboard, velký LMS ani automatické prohlašování produktů za bestsellery. Dodrž sedm kapitol a pravidlo dokončení **B**. V důležitých pochybnostech dej přednost pravdivým údajům a schválení správce před zdánlivě kompletní prezentací.
