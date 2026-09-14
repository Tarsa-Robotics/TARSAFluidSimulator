# TARSA Design System

> **TARSA — Facade Robotics.** A large-scale, planar **cable-driven parallel robot (CDPR)** that cleans building facades. Four motorized reels anchor at the facade corners — two on the roof, two in the ground — and tension a small payload (a camera and a rotating nozzle) anywhere across the facade plane. It cleans the way facade-cleaning drones do: a soaping solution and deionized water, pumped from the ground through a hose and applied under pressure. The difference is that TARSA is **tethered, not flown** — no battery, no flying mass over the street, no height ceiling, and none of the airspace regulation a drone carries.

This is a **from-scratch brand system**, built to Dieter Rams' Ten Principles. Its job: make TARSA read as *precise, beautiful, and trustworthy* to the people who sign off on facade contracts — property managers, CFOs, and facility engineers — not to venture investors.

## Sources

- **No codebase, Figma, or deck was attached.** Everything here is original, derived from the written brief (`TARSA Design System — Context`).
- The brief locks exactly one thing: the **name, TARSA**, and the domain, **facade robotics**. Mark, color, type, and rules are designed here.
- Academic backing (Concordia + faculty supervisor) is treated as a credibility asset, not decoration.

## The idea in one line

The whole machine is a **coordinate held in tension**: four corner anchors, four cables, one small payload positioned precisely on a plane. That geometry — four corners converging on a single node — is the entire visual language. Nothing is added that the machine doesn't already contain.

### Why this, and not the obvious thing

The first training-data reflex for "cleaning robot / cleantech" is **blue-and-white, teal, glass, gradient mesh**. The second reflex, once you reject that, is **safety-orange-on-black industrial**. TARSA is neither. It is a **drafting-table / engineering-datum** system: cool mineral neutrals, graphite ink, and a single signal vermilion used like a surveyor's marker. The specificity that keeps it from being generic Swiss-grid is the **four-corner cable geometry** — the payload as an (X,Y) datum on the facade plane. It is earned by the product, not borrowed from a style.

---

## Index

| File | Purpose |
|---|---|
| `README.md` | This file — context, content & visual foundations, iconography |
| `colors_and_type.css` | All tokens: color, type, spacing, radii, borders, motion + component recipes |
| `SKILL.md` | Portable Agent Skill manifest |
| `assets/logo/` | `tarsa-mark.svg` (ink), `-light.svg` (on dark), `-signal.svg` (active payload) |
| `preview/` | Design-system cards — Brand, Colors, Type, Spacing, Components (these populate the Design System tab) |
| `preview/motif-convergence.html` | The motif system, developed — anatomy + four in-use demos |
| `ui_kits/website/` | Marketing site recreation — hero, how-it-works, specs, why-tethered, contact, footer; bilingual FR/EN |
| `ui_kits/console/` | *(planned)* Operations console — facade map, reel tension, vision overlay |
| `slides/` | *(planned)* Pitch-deck sample slides — title, system diagram, spec, claim |

**Fonts:** Archivo (display + body) and IBM Plex Mono (data) are loaded from Google Fonts via `@import` in `colors_and_type.css`. Both are open-licensed (OFL) and need no local files. See the font note at the bottom.

---

## CONTENT FUNDAMENTALS

**Voice.** An engineer who respects your time. Plain, declarative, quietly confident. State the fact, then stop. The product is unusual enough that it doesn't need to be sold loudly — it needs to be *explained* clearly.

**Sentence shape.** Short. Often a fragment used as a hammer: *No rope. No risk.* Claims are concrete and falsifiable — a number, a mechanism, a named backer — never an adjective doing the work of evidence.

**Casing.** Sentence case for everything readable (headlines, body, buttons: *Book a survey*, not *Book A Survey*). **UPPERCASE only** for mono instrument labels (eyebrows, spec keys, status tags), and always tracked. The wordmark is **TARSA**, all caps, the one exception.

**Person.** *You* = the building owner / engineer being addressed (*your facade*, *your schedule*). *We* is used sparingly and only for commitments TARSA stands behind (*We survey every building before we quote*). Never *I*.

**Numbers & units.** Tabular, mono, with a thin space before the unit: `2,800 psi`, `8.4 m/min`, `84 m`. Percentages: `99.2 %`. Numbers are never rounded up to flatter — honesty is the brand (Rams #6).

**Bilingual (FR + EN).** Both languages are first-class; French is never an afterthought translation. Names and taglines must hold up in French and avoid cheap startup suffixes (no -ex, no -ix). Examples that work in both:
- EN *Precision at height* · FR *La précision en hauteur*
- EN *Tethered, not flown.* · FR *Relié, pas en vol.*
- Descriptor: EN *Facade robotics* · FR *Robotique de façade*

**Emoji:** never. **Exclamation marks:** essentially never. **Tooltips explaining the obvious:** never (Rams #4 — the design explains itself).

**Sample copy, in register:**
> Four corners. One payload. No flight.
> TARSA strings a small robot across your facade on four cables and washes the glass with soap and deionized water, pumped from the ground. It cleans like a facade drone — without the battery, the airspace permit, or the flying mass over the street. The cables carry the load; the ground carries the water.

---

## VISUAL FOUNDATIONS

### Surface & field
- **Page:** `--paper` `#F3F4F5` — a cool, mineral off-white, like a matte aluminium panel or drafting sheet. Deliberately **not cream** (that lane is its own cliché now) and not pure white.
- **Cards/panels:** `--surface` `#FFFFFF`, separated from the page by a **1px hairline** (`--n-200`), almost never by a shadow.
- **Dark field:** `--ink-bg` `#16181C` (graphite, never pure black) for the console and for high-contrast deck moments. Light text is `--paper`, not white.

### Color vibe
- Overwhelmingly **graphite + mineral gray + paper**. Color is an event, not a wash.
- **One accent:** `--signal` `#DE3B26` vermilion. It marks the *live / measured / single most important* thing — an active reel, a primary CTA, a datum tick. Budget it to **under ~2 % of any surface**. If two things are red, neither is.
- **Semantic states** (`--clean` muted green, `--soiled` amber, `--fault` = signal) exist for the console and are kept desaturated so they never become decoration.
- **Imagery** stays cool and neutral: true white balance, no warm grade, no fake film grain, no lifestyle gloss. Product, CAD, and **raw prototype footage** all sit in the same hairline frames with a mono caption — raw is captioned and owned, never hidden or apologised for.

### Typography
- **Archivo** — display and body. An engineered grotesque with a structural, slightly architectural feel; far from the Inter/Roboto reflex. Headings set **tight** (`-0.02`/`-0.03em`), heavy (700). Body at 400/16/1.55.
- **IBM Plex Mono** — the *instrument voice*. Eyebrows, spec keys, status tags, captions, all data. Uppercase + tracked for labels; tabular nums for figures. Plex was drawn for an engineering company; using it here is honest, not costume.
- Two families, full stop (Rams #10). No serif, no third face.

### Spacing & grid
- **8px base, 4px sub-unit.** Scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128.
- Layouts are built on an explicit column grid with a **plumb line** (1px spine) marking the active column — a guide that is also literally one of the machine's cables.
- Reading width capped at ~64ch.

### The two structural motifs (both functional, per Rams #2)
- **Datum rule** (`.datum`) — a hairline with fine ticks, like a ruler/scale bar. Used as a section divider *and* as an honest spatial reference. A `--signal` variant marks the active section.
- **Plumb line** (`.plumb`) — a 1px vertical spine for alignment. It earns its place as a layout guide; it just happens to be one of the machine's cables.

### Corners, borders, shadows
- **Radii are small and sharp:** 0 / 2 / 4 / 8. Default 2px. The hardware is reels, cable, and a boxy payload — all straight edges; the brand is too. This also sidesteps the rounded-card AI tell.
- **Borders before shadows.** Depth is communicated by hairlines and the grid. Two shadow tokens exist (`--shadow-menu`, `--shadow-modal`) and are reserved strictly for *floating* chrome — menus, modals — never for static cards.
- **No glassmorphism, no gradient text, no side-stripe accents, no hero-metric template.** These are banned by construction.

### Motion & states
- **Unobtrusive and linear-ish:** `--ease: cubic-bezier(0.2,0,0,1)`, durations 120/200/320ms. No bounce, no spring, no decorative loops. Animation is allowed only when it conveys real change (a value updating, a section becoming active) — a measured *draw*, never a flourish.
- **Hover:** a tint shift (`--n-100` fill) or border darkening to `--ink`. Never a lift, never a glow.
- **Press:** opacity dip to ~0.72 (`.pressable`) or a one-step-darker fill. Elements do not scale or deform — the material is honest.
- **Focus:** a crisp 1px inset ink ring, never a soft blue halo.

---

## ICONOGRAPHY

TARSA uses **Material Symbols (Sharp, weight 300)** — square-cut terminals, thin uniform stroke, an instrument feel that matches the drafting register and the IBM Plex Mono labels. Rounded/friendly icon sets (the SaaS reflex) are rejected. Icons are loaded from Google's CDN:

```html
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@24,300,0,-25">
```
Usage: `<span class="material-symbols-sharp">arrow_forward</span>`. Keep them small (18–24px), graphite or `--fg-2`, and **rare** — most UI here is type and rule, not icon (Rams #10).

- **Emoji:** never. **Unicode glyphs as icons:** never. **Multi-color icons:** never — icons are monochrome; color is reserved for the signal/state system.
- **Substitution flag:** Material Symbols Sharp is a *chosen substitute*, not an exported house set (there is no source design file). It is the closest CDN match to the intended square-terminal, thin-stroke drafting look. If TARSA later commissions a bespoke icon set, replace the CDN link and update this section.

The **logo mark** (`assets/logo/`) is the one piece of bespoke geometry: four corner reels with cables converging on a small central payload, built from precise rectangles and lines. The payload renders as a neutral **square** — the real payload's orientation is still TBD, so the mark commits to no rotation. It is not an icon and not drawn with an icon font — it is the brand's single constructed mark.

---

*(Content fundamentals + visual foundations above were written to be read top-to-bottom by a designer with no other context. Per the brief, get final signoff from Jose before locking.)*
