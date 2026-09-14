---
name: tarsa-design
description: Use this skill to generate well-branded interfaces and assets for TARSA (Facade Robotics), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## TARSA in one line

A large-scale planar **cable-driven parallel robot (CDPR)** that cleans building facades. Four corner reels (two roof, two ground) tension a small payload — a camera and a rotating nozzle — anywhere on the facade plane. It cleans like a facade drone (soap + deionized water, pumped from the ground), but it is **tethered, not flown**: no battery aloft, no flying mass over the street, no airspace permit. Audience: property managers, CFOs, facility engineers. Signal credibility and rigor, not venture hype.

## The non-negotiables (read before designing)

- **Register:** engineering datum / drafting table. Cool mineral neutrals + graphite ink + paper. **Not** cleantech-blue/teal/glass, **not** safety-orange industrial.
- **One accent only:** signal vermilion `#DE3B26`, under ~2% of any surface — the live/measured/most-important thing.
- **Type:** Archivo (display + body), IBM Plex Mono (the instrument voice: eyebrows, spec keys, data). Two families, no third.
- **Motif:** *Convergence on the coordinate field.* The field (a faint modular grid = the building's glazing) is the repeatable texture; convergence (four hairlines from the corners to a single signal node = cables → payload) is the focal mark, used once per composition. See `preview/motif-convergence.html`.
- **Sharp corners** (0/2/4/8px), **hairlines before shadows**, sentence case for reading + tracked UPPERCASE mono for labels.
- **Bilingual FR + EN**, both first-class. No -ex/-ix suffixes.
- **Rams' Ten Principles** govern every call. If an element only decorates, remove it.

## Files

- `colors_and_type.css` — all tokens + component recipes. Import it; use the CSS vars and `.btn / .tag / .field / .datum / .card / .t-*` classes.
- `assets/logo/` — `tarsa-mark.svg` (ink), `-light.svg` (on dark), `-signal.svg` (active payload). Copy out; do not redraw.
- `ui_kits/website/primitives.jsx` — reusable React parts: `Mark, Wordmark, Eyebrow, Button, Tag, Datum, Section, CoordinateField, Convergence`.
- `ui_kits/website/sections.jsx` + `index.html` — a full bilingual marketing-site recreation to lift patterns from.
- `preview/` — specimen cards for every foundation (colors, type, spacing, components, brand).

## Banned (these fail the brand and the AI-slop test)

Side-stripe accent borders · gradient text · default glassmorphism · the hero-metric template · identical icon-card grids · modal-first thinking · warm photo grades / fake grain · emoji · rounded "friendly" everything · bluish-purple gradients.
