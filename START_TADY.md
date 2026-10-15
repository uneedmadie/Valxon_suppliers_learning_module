# START TADY | VALXON Academy od nuly

**Důležité: zatím neexistuje žádná aplikace.** Tento ZIP obsahuje pouze zadání, pracovní pravidla a vizuální HTML referenci. Není v něm `package.json`, backend ani frontend. Claude Code má projekt teprve založit a skutečně implementovat.

## 1. Windows: nový projekt a GitHub

GitHub CLI (`gh`) je již přihlášené jako `uneedmadie`. Otevři PowerShell a zkontroluj Git:

```powershell
git --version
```

Pokud Git chybí: `winget install --id Git.Git -e`; zavři a znovu otevři PowerShell.

Vytvoř pracovní adresář a naklonuj soukromý repozitář:

```powershell
New-Item -ItemType Directory -Force -Path "$HOME\Projects" | Out-Null
Set-Location "$HOME\Projects"
gh repo clone uneedmadie/Valxon_suppliers_learning_module
Set-Location .\Valxon_suppliers_learning_module
```

U prázdného repozitáře je zpráva `You appear to have cloned an empty repository` normální.

**Rozbal obsah tohoto ZIPu přímo do složky `Valxon_suppliers_learning_module`.** Uvnitř složky musí být přímo `CLAUDE.md`, `.gitignore`, `PROMPT_PRO_CLAUDE.md`, `START_TADY.md` a `docs/`. Nesmí vzniknout o úroveň navíc vnořená složka.

Pak otevři Claude Desktop → Code → Local a vyber `Valxon_suppliers_learning_module`. Nevybírej `C:\Windows\System32`. Zvol režim umožňující úpravy souborů (ne Plan) a ponech schvalování rizikových operací.

## 2. První prompt

Do Claude Code vlož celý obsah `PROMPT_PRO_CLAUDE.md`. Neposílej starý ZIP ani dřívější prompty. `CLAUDE.md` se používá jako hlavní dlouhodobé pravidlo projektu.

## 3. Výstup první etapy

Claude musí **založit skutečný TypeScript monorepo** s Next.js frontendem a NestJS backendem, spustit ho a zobrazit alespoň první reálně funkční obrazovku. Potom pokračovat postupně k skutečnému importu URL/dokumentů → review → publikovaná učebnice → otázka/progres. Samotný HTML soubor v `docs/` je jen reference.

Po prvním úspěšném startu ti sdělí přesný příkaz pro spuštění na Windows a adresu v prohlížeči. Po testech Git commit a push do `develop`.

## 4. Repo a bezpečnost

Repo: `https://github.com/uneedmadie/Valxon_suppliers_learning_module`.
Před prvním `git push` musí Claude ověřit, že je soukromé, a prohlédnout všechny soubory určené ke commitu. **Soukromý osobní repozitář neznamená automaticky povolení zveřejnit firemní interní zadání ani data.** `.gitignore` proto standardně vylučuje lokální `docs/OFICIALNI_ZADANI.md` a `docs/UI_REFERENCE.html`, oba soubory může Claude lokálně číst. Pokud má VALXON jiné požadavky, respektuj je.

Nikdy necommitovat API klíče, `.env*` s výjimkou `.env.example`, katalogy/ceníky, soukromé dokumenty, databázové soubory nebo `node_modules`.

## 5. Co tento ZIP NEOBSAHUJE

- Žádný dosavadní spustitelný projekt.
- Žádný přístup k placené AI službě a žádný AI API klíč.
- Kompletní původní katalogy ani seznam skutečných bestsellerů.
- Integrační kód firmy `HR-main`.

Claude musí chybějící části implementovat a omezení transparentně přiznat.
