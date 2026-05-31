# RALF Loop – AI Development Engine
> Tento dokument je pro ORCHESTRATOR agenta (hlavní agent v Claude Code).
> Subagenti dostávají instrukce přes task tool – viz sekce Subagenti.
## Cíl
Implementuj PRD pomocí RALF loopu (Review → Assess → Learn → Fix). Výsledkem je funkční, otestovaná, vizuálně profesionální aplikace schválená všemi review rolemi.
---
##  3 CORE PRAVIDLA – NADŘAZENÁ VŠEMU 
**R1 – Jeden blok, jeden cyklus, pak další.** Rozděl PRD do min. 3 feature bloků. Po KAŽDÉM bloku proveď RALF review ze všech 6 rolí. Implementace všeho najednou = NEPLATNÝ výstup. Po review → fix → automaticky další blok. NEPTEJ SE uživatele jestli máš pokračovat. Zeptej se JEN při nejasnosti v PRD.
**R2 – Ověřuj funkčnost, ne jen vzhled.** Playwright screenshoty ukazují JAK to vypadá. Interaction testy ověřují ŽE to funguje. V každé iteraci: pořiď screenshoty na 3 viewportech, proklikej KAŽDÝ interaktivní prvek (tlačítka, formuláře, linky, inputy), projdi hlavní user flow end-to-end. Nefunkční prvek = CRITICAL finding. Screenshoty a interaction testy pořizuj 3× za iteraci: po buildu, po review, po fixech.
**R3 – Všechno loguj, nebo se to nestalo.** DEV-LOG.md = důkaz práce. Každá iterace MUSÍ obsahovat: GATE zápisy, findings tabulku od VŠECH 6 rolí, verdict tabulku s odůvodněním, screenshot paths, interaction check výsledky. Před komunikací s uživatelem spočítej verdict tabulky v DEV-LOG.md – pokud méně než 3, NENÍ hotovo.
**Další guardrails:** Specifická pravidla pro opakující se problémy zapisuj do **AGENTS.md** (viz níže). Tři pravidla výše jsou fixní. AGENTS.md se vyvíjí za běhu.
---
## AGENTS.md – Živá paměť
AGENTS.md je soubor, který agent **čte na začátku KAŽDÉ iterace** a **aktualizuje na konci KAŽDÉ iterace**. Obsahuje naučené vzory, chyby které se nesmí opakovat, a projektově specifické guardrails.
### Vytvoř v Fázi 0, aktualizuj průběžně:
```markdown
# AGENTS.md – Operational Learnings
## Guardrails (přidávej když narazíš na problém)
- [iter 1] Playwright: po fixech VŽDY znovu screenshoty + interaction test
- [iter 2] API klíč nesmí být v .env.example – použij .env.example s placeholderem
- ...
## Patterns (co funguje dobře v tomto projektu)
- [iter 1] Streamlit: testuj přes requests + selenium, ne přes Playwright přímo
- ...
## Known Issues (problémy které ještě nejsou vyřešené)
- ...
## Tech Notes (specifika tech stacku tohoto projektu)
- ...
```
**Pravidla pro AGENTS.md:**
- Čti jako PRVNÍ krok každé iterace (hned po PRD.md)
- Na konci každé iterace přidej co ses naučil
- Nikdy nemazej starší záznamy – je to append-only log
- Pokud zjistíš, že opakuješ chybu → přidej guardrail do AGENTS.md
- Budoucí iterace (i po context rotation) čtou tento soubor a řídí se jím
---
## Completion Promise
Loop končí POUZE když agent vyprodukuje:
```
<promise>COMPLETE</promise>
```
Tento tag smíš vyprodukovat POUZE když jsou splněny VŠECHNY exit conditions (viz Exit Condition). Pokud nejsou splněny → neprodukuj tag → pokračuj v další iteraci.
Před vyprodukovám tagu proveď finální self-check:
1. Přečti DEV-LOG.md → 3+ verdict tabulky?
2. Přečti PRD.md → všechny features implementované?
3. Spusť testy → prochází?
4. Spusť interaction test → vše funguje?
5. Přečti AGENTS.md → žádné open known issues?
Pokud JAKÁKOLI odpověď = NE → NEVYPRODUKUJ tag. Vrať se a fixni.
---
## Test-Driven Development
Celý vývoj je striktně TDD:
```
RED    → Napiš test PŘED kódem. Musí selhat.
GREEN  → Minimální kód aby test prošel.
REFACTOR → Vyčisti. Testy stále prochází.
```
Aplikuje se na: backend logiku, API endpointy, frontend komponenty, user flows (Playwright E2E), integraci s externím API (mock responses). Výjimka: čistý vizuální styling se ověřuje screenshoty.
Commit pořadí: `test:` (RED) → `feat:` (GREEN) → `refactor:` → `style:`. CTO role v review kontroluje git log chronologii. Kód bez předchozího testu = CRITICAL finding.
---
## Skills a nástroje
### Povinné SKILL.md – přečti PŘED relevantní prací:
| Kdy | Skill | Cesta |
|-----|-------|-------|
| UI/frontend práce | frontend-design | `/mnt/skills/public/frontend-design/SKILL.md` |
| Theming | theme-factory | `/mnt/skills/examples/theme-factory/SKILL.md` |
| Generování .docx | docx | `/mnt/skills/public/docx/SKILL.md` |
| Generování .pdf | pdf | `/mnt/skills/public/pdf/SKILL.md` |
### Playwright
Playwright slouží ke DVĚMA účelům: (1) vizuální screenshoty a (2) **interaktivní funkční testování**. Obojí je povinné.
```bash
npm init -y && npm install playwright @playwright/test && npx playwright install chromium
```
**A) Screenshot script** (`tests/visual-check.spec.ts`):
```typescript
import { test } from '@playwright/test';
const viewports = [
 { name: 'mobile', width: 375, height: 812 },
 { name: 'tablet', width: 768, height: 1024 },
 { name: 'desktop', width: 1440, height: 900 },
];
test.describe('Visual Check', () => {
 for (const vp of viewports) {
   test(`${vp.name}`, async ({ page }) => {
     await page.setViewportSize({ width: vp.width, height: vp.height });
     await page.goto('http://localhost:PORT');
     await page.waitForLoadState('networkidle');
     await page.screenshot({ path: `screenshots/${vp.name}-full.png`, fullPage: true });
   });
 }
});
```
**B) Interaction test template** (`tests/interaction-check.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';
test.describe('Interaction Check', () => {
 test('hlavní user flow funguje', async ({ page }) => {
   await page.goto('http://localhost:PORT');
   // Proklikej KAŽDÝ interaktivní prvek na stránce:
   // 1. Najdi všechny buttony → klikni → ověř response
   // 2. Najdi všechny formuláře → vyplň → odešli → ověř výsledek
   // 3. Najdi všechny linky/navigaci → klikni → ověř přechod
   // 4. Najdi všechny inputy → zadej text → ověř že se zobrazí
   // 5. Ověř error states: odešli prázdný formulář → zobrazí se chyba?
   // Přizpůsob dle user stories z PRD.
 });
});
```
**Po screenshotu VŽDY `view` tool → posuď vizuální kvalitu.**
**Po interaction testu VŽDY zkontroluj výsledky – prošly VŠECHNY interakce?**
---
## Správa souborů
| Soubor | Pravidlo |
|--------|---------|
| **PRD.md** | Readonly. Nikdy neměnit. |
| **AGENTS.md** | Živá paměť. Čti na začátku, aktualizuj na konci každé iterace. |
| **DEV-LOG.md** | Append-only. Formát viz níže. Píše POUZE orchestrator. |
| **ARCHITECTURE.md** | Živý dokument. Tech decisions + seznam feature bloků. |
| **screenshots/** | `iter-{X}-{fáze}-{viewport}.png`. Nikdy nemazat. |
| **reports/** | Výstupy subagentů: `{role}-iter-{X}.md`. |
| **HANDOFF.md** | Vytvořit na konci. Jak spustit, co je TODO, known issues. |
### Adresářová struktura
Přizpůsob tech stacku z PRD. Příklad pro typickou web app:
```
project/
├── PRD.md / AGENTS.md / DEV-LOG.md / ARCHITECTURE.md / HANDOFF.md
├── screenshots/
├── reports/
├── tests/           ← unit, integration, e2e, visual-check, interaction-check
└── src/             ← dle tech stacku z PRD
```
### DEV-LOG.md šablona iterace
```markdown
---
## Iterace X – [YYYY-MM-DD HH:MM]
 Status: Iterace X/N | Feature blok: [název] | Bloky zbývají: Y
### GATE Status
- GATE 1: PASSED/FAILED
- GATE 2: PASSED/FAILED
- GATE 2b: PASSED/FAILED
### Změny
- [hash] `test:` [popis] (RED)
- [hash] `feat:` [popis] (GREEN)
- [hash] `refactor:` / `style:` / `fix:` [popis]
### Review Findings (všech 6 rolí)
| # | Role | Finding / Verdikt | Severity | Status |
|---|------|-------------------|----------|--------|
| 1 | CEO  | ... | HIGH/MED/LOW | FIXED/OPEN |
| 2 | CTO  | ... | ... | ... |
| ... | ... | ... | ... | ... |
### Visual Check
- **After Build:** Desktop / Tablet / Mobile: / → `screenshots/iter-X-build-*.png`
- **After Review (fresh):** Desktop / Tablet / Mobile: / → `screenshots/iter-X-review-*.png`
- **After Fix:** Desktop / Tablet / Mobile: / → `screenshots/iter-X-fix-*.png`
### Interaction Check
- Tlačítka: [seznam] → /
- Formuláře: [seznam] → /
- Navigace/linky: [seznam] → /
- Hlavní user flow:  end-to-end OK /  selhává v kroku [X]
- Error states:  zobrazují se /  chybí [které]
### Testy
- Unit: X/Y | Integration: X/Y | E2E: X/Y | Coverage: X%
### Verdict tabulka
| Role | Verdict | Odůvodnění | Open |
|------|---------|------------|------|
| CEO  | APPROVED/BLOCKED | [proč] | X |
| CTO  | APPROVED/BLOCKED | [proč] | X |
| CPO  | APPROVED/BLOCKED | [proč] | X |
| Security | APPROVED/BLOCKED | [proč] | X |
| QA   | APPROVED/BLOCKED | [proč] | X |
| Designer | APPROVED/BLOCKED | [proč] | X |
### AGENTS.md update
[Co jsem se naučil v této iteraci – zapíšu do AGENTS.md]
### Souhrn + plán další iterace
```
---
## Role v review panelu
Každá role MUSÍ v KAŽDÉ iteraci zapsat:
- **Buď findings** (Severity: CRITICAL / HIGH / MEDIUM / LOW)
- **Nebo explicitní "NO FINDINGS"** s odůvodněním (přípustné od iterace 2+, v iteraci 1 má KAŽDÁ role co najít)
Verdict tabulka vyžaduje sloupec **Odůvodnění** – nestačí napsat "APPROVED".
### 1. CEO (Product Owner)
- Jsou implementované features z aktuálního feature bloku?
- Funguje user journey pro tento blok end-to-end?
- Odpovídá to business cílům z PRD?
- Je scope bloku kompletní vzhledem k PRD milestones?
### 2. CTO (Architekt & Code Quality)
- **TDD audit:** `test:` commit PŘED `feat:` v git logu? Kód bez testu = CRITICAL.
- Kód je čistý, DRY, správně strukturovaný?
- Test coverage dostatečná? (`coverage report`)
- Error states a edge cases ošetřené – a otestované?
- Integrace s externím API robustní? (retry, timeout, rate limit)
- Credentials nejsou hardcoded/plaintext?
- Dependencies pinnuté a minimální?
### 3. CPO (UX & Design)
*Používá Playwright screenshoty + interaction testy + frontend-design SKILL.md principy.*
- Screenshoty na 3 viewportech → vizuálně profesionální?
- **Spusť interaction test → KAŽDÉ tlačítko, formulář, link funguje?** Pokud ne = CRITICAL.
- **Projdi hlavní user flow z PRD přes Playwright** → funguje end-to-end?
- Fonty, barvy, spacing záměrné a konzistentní?
- UX flow intuitivní? Error UX srozumitelná?
- Responsive design funkční? WCAG AA?
### 4. Security & Privacy Officer
- Jak se ukládá API klíč? (plaintext = CRITICAL)
- API volání přes HTTPS? Input sanitizovaný?
- Dependencies bez vulnerabilities? (`npm audit` / `pip audit`)
- Nelogují se citlivá data?
- Jaká f odchází na externí servery?
### 5. QA Engineer
*Používá Playwright pro E2E testy A interaktivní proklikání. Ověřuje TDD compliance.*
- **Spusť interaction test** → projdi KAŽDÝ interaktivní prvek, ověř funkčnost
- **Proklikej celý user flow z PRD** → funguje od začátku do konce?
- **Nefunkční prvek = CRITICAL finding**
- TDD audit: test existuje a byl napsán PŘED kódem? (git log)
- Celý test suite prochází? Coverage: 80%+ backend, 100% kritické flows?
- Testy smysluplné? Edge cases? Error recovery?
- Browser console errors? (Playwright `page.on('console')`)
### 6. Designer (Visual Polish)
*Čte frontend-design SKILL.md + theme-factory SKILL.md. Používá screenshoty.*
- Odpovídá designu z frontend-design SKILL? (NE generic AI look)
- Typografie distinctive? Color palette cohesive?
- Layout composition zajímavá? Visual hierarchy jasná?
- Loading states, empty states, error states vizuálně řešené?
- Porovnání s předchozí iterací – je vidět progres?
---
## Proces RALF Development Loop
### Fáze 0: Setup
1. Přečti PRD.md kompletně
2. Přečti frontend-design SKILL.md + theme-factory SKILL.md
3. Vytvoř ARCHITECTURE.md: tech stack, architektura, **seznam min. 3 feature bloků**
4. **Vytvoř AGENTS.md** s prázdnými sekcemi (Guardrails, Patterns, Known Issues, Tech Notes)
5. Inicializuj projekt dle tech stacku z PRD
6. Nastav Playwright (nebo zaloguj fallback – viz Error Recovery)
7. Vytvoř DEV-LOG.md
8. Commit: `init: project setup`
9. **GATE 0** → zapiš do DEV-LOG.md
10. Vypiš: ` GATE 0 PASSED | Setup done | Feature bloky: [seznam] | Next: Build blok 1`
### Fáze 1: Build (TDD, JEDEN feature blok)
0. **Přečti AGENTS.md** – řiď se guardrails z předchozích iterací
1. **RED:** Napiš testy → spusť → musí selhat → commit `test:`
2. **GREEN:** Minimální implementace → testy prochází → commit `feat:`
3. **REFACTOR:** Vyčisti kód → testy stále OK → commit `refactor:`
4. **VISUAL:** Styling dle SKILL.md → screenshoty + interaction test → commit `style:`
**GATE 1:** Testy prochází? Screenshoty na 3 viewportech pořízeny A prohlédnuty? Interaction testy prošly? `test:` před `feat:` v git logu?
→ Zapiš do DEV-LOG.md. Vypiš: ` GATE 1 PASSED | Blok [X] built | Next: RALF Review`
→ **IHNED pokračuj Fází 2.**
### Fáze 2: RALF Review (POVINNÉ, NEPŘESKAKOVAT)
1. **Pořiď ČERSTVÉ Playwright screenshoty** na 3 viewportech (ne recyklované z buildu) → prohlédni přes `view`
2. **Spusť interaction testy** → zaloguj výsledky
3. Review ze **VŠECH 6 rolí** → findings NEBO odůvodněné "NO FINDINGS"
4. Findings tabulka + verdict tabulka + screenshot paths + interaction results do DEV-LOG.md
**GATE 2:** Všech 6 rolí má verdikt? Čerstvé screenshoty pořízeny? Interaction testy zalogov GATE 2 PASSED | Findings: X (C:_, H:_, M:_, L:_) | Next: Fix`
→ **IHNED pokračuj fixováním.**
### Fáze 2b: Fix
1. Fixni CRITICAL a HIGH findings (povinné)
2. Fixni MEDIUM pokud možné, jinak zaloguj
3. Testy stále prochází? Commit fixy.
4. **Playwright screenshoty + interaction testy PO fixech** → prohlédni → ověř že fixy nenarušily UI ani funkčnost
5. Zapiš do DEV-LOG.md
6. **Aktualizuj AGENTS.md** – co ses naučil v této iteraci?
**GATE 2b:** CRITICAL=0, HIGH=0? Testy OK? Post-fix screenshoty a interaction testy prošly?
→ Zapiš. Vypiš: ` GATE 2b PASSED | Iter X done | Bloky zbývají: Y | Next: [Build blok N / GATE 3]`
→ **Přečti PRD.md: jsou features které JEŠTĚ NEJSOU implementované?**
→ **ANO → IHNED Fáze 1 s dalším blokem. NEZASTAVUJ SE.**
→ **NE (všechno hotové) → GATE 3.**
### GATE 3: Minimum iterací
Přečti DEV-LOG.md, spočítej verdict tabulky.
- **Méně než 3?** → Vrať se na Fázi 2: proveď review celého dosavadního kódu.
- **3 nebo více?** → Pokračuj Fází 3.
→ Zapiš. Vypiš: ` GATE 3 PASSED | Iterací: X | Next: Visual Polish`


### GATE 2c: Real Data Validation


Before proceeding to the next feature block, verify:


- Supabase connection succeeds
- Database queries succeed
- Real records are returned
- Home Feed displays database content
- No mock data is present


Evidence must be logged in DEV-LOG.md.


Required evidence:


- Query result count
- Example records returned
- Confirmation that data originates from Supabase


Failure of this gate blocks further progress.


A working UI without real data is not considered complete.


📍 GATE 2c PASSED | Real data loaded | Supabase connected | No mock data detected | Next: [Build next block / GATE 3]




### Fáze 3: Visual Polish
1. Přečti AGENTS.md + frontend-design SKILL.md
2. Pořiď screenshoty → porovnej s iter-1 screenshoty (visual regression)
3. Designer role hloubková kontrola:
  - Typografie, barvy, layout, states (loading/empty/error/success)
  - Responsivita, micro-interactions, porovnání s předchozí iterací
4. Aplikuj theme-factory pokud potřeba
5. CPO + Designer dají verdikt → pokud BLOCKED, opakuj
6. Commit: `style: visual polish iteration`
7. Finální screenshoty + interaction testy
### Fáze 4: Final Validation
1. Přečti AGENTS.md – jsou tam open known issues? Vyřeš je.
2. Spusť kompletní test suite (unit + integration + E2E + visual + interaction)
3. Security check (`npm audit` / `pip audit` + credentials review)
4. Finální verdikt od VŠECH 6 rolí
5. Self-check: 3+ verdict tabulky? Všechny GATE? Testy OK? Interaction testy OK? PRD features kompletní?
6. DEV-LOG.md: finální status tabulka
7. Finální update AGENTS.md
8. Vytvoř HANDOFF.md
9. Vypiš: ` RALF COMPLETE | Iterací: X | All roles: APPROVED`
10. **`<promise>COMPLETE</promise>`**
---
## Exit Condition
Všechny podmínky SOUČASNĚ – teprve pak `<promise>COMPLETE</promise>`:
- GATE 3 PASSED (3+ iterace)
- Všech 6 rolí: APPROVED (s odůvodněním)
- CRITICAL = 0, HIGH = 0
- Všechny testy prochází, coverage ≥ 80% backend
- TDD compliance ověřena v git logu
- Playwright screenshoty potvrzují vizuální kvalitu
- Playwright interaction testy: VŠECHNY prvky fungují
- Hlavní user flow z PRD proklikán end-to-end
- Security check prošel
- AGENTS.md: žádné open known issues
Nesplněno? → Neprodukuj `<promise>COMPLETE</promise>`. Vrať se a fixni.
---
## Error Recovery
| Problém | Fallback |
|---------|----------|
| **Playwright instalace selže** | Použij `curl` + `view` HTML. Zaloguj do AGENTS.md. |
| **npm/pip install selhání** | Zaloguj chybějící dependency, pokračuj s tím co máš. |
| **Chybí API klíč** | Testuj s mock responses. Zdokumentuj v HANDOFF.md. |
| **Testy selhávají na infra issue** | Zaloguj odděleně od code bugs. Fixni infra, re-run. |
| **Context window se plní** | Zapiš stav do DEV-LOG.md + AGENTS.md: "CONTEXT LIMIT – pokračuj od Fáze X, Iterace Y". |
| **PRD je nejednoznačný** | Zaloguj interpretaci do ARCHITECTURE.md. Zeptej se JEN při zásadní nejasnosti. |


### Playwright Fallback Policy


If Playwright installation or browser execution is not possible due to environment restrictions:


Allowed fallback:


1. Document the exact failure reason.
2. Log the failure in AGENTS.md.
3. Log the failure in DEV-LOG.md.
4. Continue development using:
   - Unit tests
   - Integration tests
   - Component tests
   - Static UI review


In this situation:


- Missing screenshots are not considered a blocking issue.
- Missing Playwright execution is not considered a CRITICAL finding.
- The limitation must be clearly documented.


When the project is executed in a real environment, Playwright validation must be completed before production release.


---
## Subagenti (Claude Code task tool)
### Výchozí mód: Sekvenční
1. **Backend Builder** → `test:` + `feat:` commits → report
2. **Frontend Builder** → `test:` + `feat:` commits → report
3. **Security Auditor** → audit report
4. **Tester** → E2E + interaction testy + screenshoty → report
5. **Designer** → visual polish → commit + report
6. **Reviewer** → RALF review ze 6 rolí → report
7. **Orchestrator** syntetizuje reports → DEV-LOG.md + AGENTS.md
### Opt-in: Paralelní mód
```
Paralelní A:  Backend Builder + Frontend Builder + Security Auditor
── BARRIER ──
Paralelní B:  Tester + Designer
── BARRIER ──
Sekvenční:    Reviewer → Orchestrator
```
### File ownership
Každý subagent smí zapisovat POUZE do své zóny (definuj dle tech stacku). Shared soubory (package.json, config, .env) edituje POUZE orchestrator. Subagent zapíše `DEPENDENCY REQUEST: [co potřebuje]` do reportu.
### Task template
```
Task: "[Role] iter X: [Úkol]. TDD: testy PŘED kódem.
     Přečti AGENTS.md jako první. Přečti [SKILL.md pokud relevantní].
     Piš POUZE do [zóna].
     Na konci commitni a vytvoř reports/[role]-iter-X.md."
```
---
## Spuštění
**NEPŘESKAKUJ ŽÁDNÝ KROK. NEČEKEJ NA POTVRZENÍ.**
1. Přečti PRD.md
2. Přečti frontend-design SKILL.md + theme-factory SKILL.md
3. Rozděl PRD do min. 3 feature bloků → ARCHITECTURE.md
4. Vytvoř AGENTS.md
5. Inicializuj projekt + Playwright → GATE 0
6. **Blok 1:** AGENTS.md → Build (TDD) → GATE 1 → Review → GATE 2 → Fix → GATE 2b → update AGENTS.md
7. **Blok 2:** AGENTS.md → Build (TDD) → GATE 1 → Review → GATE 2 → Fix → GATE 2b → update AGENTS.md
8. **Blok 3:** AGENTS.md → Build (TDD) → GATE 1 → Review → GATE 2 → Fix → GATE 2b → update AGENTS.md
9. GATE 3 → Visual Polish → Final Validation → HANDOFF.md → `<promise>COMPLETE</promise>`
**Začni TEĎ. PRD je níže nebo v souboru PRD.md.**
---
## Pokračování v existujícím projektu
Pokud spouštíš RALF loop nad projektem kde už proběhly předchozí iterace:
### Krok 1: Audit
1. Přečti AGENTS.md (pokud existuje) – jaké guardrails jsou nastavené?
2. Přečti DEV-LOG.md – kolik iterací proběhlo? Jaké GATE prošly?
3. Přečti PRD.md – které features CHYBÍ?
4. Spusť testy + interaction testy – co funguje, co ne?
5. Přečti reports/ – jaké findings byly z minulých review?
### Krok 2: RE-ENTRY záznam do DEV-LOG.md
```markdown
---
## RE-ENTRY AUDIT – [YYYY-MM-DD HH:MM]
### Stav projektu
- Předchozích iterací: X
- Feature bloky hotové: [seznam]
- Feature bloky CHYBÍ: [seznam]
- Testy: X/Y | Interaction testy: / [co nefunguje]
### Identifikované problémy
| # | Problém | Severity |
|---|---------|----------|
| 1 | [popis] | CRITICAL/HIGH/... |
### Plán
Pokračuji od Fáze [X], iterace [Y]. Bloky: [seznam].
```
### Krok 3: Pokračuj
- NEMAŽ DEV-LOG.md, screenshots/, reports/, testy, AGENTS.md
- Pokud AGENTS.md neexistuje → vytvoř
- Počítadlo iterací pokračuje (byly 2 → další je 3)
- Můžeš smazat HANDOFF.md pokud projekt není hotový

