---
name: Drama Soundboard
description: A live cue screen for theatre sound operators, in two switchable themes (Spike Tape, Prompt Book) on one component set.
colors:
  tape-bg: "#0d0d0f"
  tape-surface: "#1c1c20"
  tape-surface-2: "#26262c"
  tape-rule: "#34343b"
  tape-text: "#f2efe6"
  tape-muted: "#a8a59b"
  tape-fx: "#ff6b2c"
  tape-bgm: "#35c2ff"
  tape-next: "#ffd400"
  tape-danger: "#ff6a6a"
  book-bg: "#1a1b1e"
  book-surface: "#222327"
  book-surface-2: "#2b2c31"
  book-rule: "#3d3e44"
  book-text: "#e8e4d8"
  book-muted: "#a1a3a8"
  book-fx: "#e8e4d8"
  book-bgm: "#ff7eb6"
  book-next: "#d7f25c"
  book-danger: "#ff7a7a"
typography:
  tape-display:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.06em"
  tape-body:
    fontFamily: "Barlow, system-ui, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  book-display:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.02em"
  book-body:
    fontFamily: "Source Sans 3, system-ui, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  book-mono:
    fontFamily: "Courier Prime, ui-monospace, Cascadia Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.2
  label:
    fontFamily: "var(--font-ui)"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  tape: "4px"
  book: "2px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
components:
  button:
    backgroundColor: "{colors.tape-surface-2}"
    textColor: "{colors.tape-text}"
    rounded: "{rounded.tape}"
    padding: "0 16px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.tape-text}"
    textColor: "{colors.tape-bg}"
    rounded: "{rounded.tape}"
    padding: "0 16px"
    height: "44px"
  button-next:
    backgroundColor: "{colors.tape-next}"
    textColor: "{colors.tape-bg}"
    rounded: "{rounded.tape}"
    padding: "0 24px"
    height: "56px"
  field:
    backgroundColor: "{colors.tape-bg}"
    textColor: "{colors.tape-text}"
    rounded: "{rounded.tape}"
    padding: "0 12px"
    height: "44px"
  track-row:
    backgroundColor: "{colors.tape-surface-2}"
    rounded: "{rounded.tape}"
    height: "52px"
  cue-row:
    backgroundColor: "{colors.tape-surface}"
    rounded: "{rounded.tape}"
    height: "52px"
  next-band:
    backgroundColor: "{colors.tape-next}"
    textColor: "{colors.tape-bg}"
    rounded: "{rounded.tape}"
    padding: "16px"
---

# Design System: Drama Soundboard

## Overview

**Creative North Star: "The Call Sheet in the Dark"**

One component set, two worlds. The operator works in a dim wing on a laptop or tablet, so both themes are dark, flat and hairline-ruled, and both exist to make one thing unmistakable: the cue that fires next. Every sound carries its category the way a stagehand marks the floor, by a mark of material colour, never by decoration.

**Spike Tape** (default) is stage-floor black with matte gaffer-tape category marks cut at an angle: orange for effects, ice blue for BGM. Barlow Condensed in capitals carries headings and numerals. The next cue is a monumental yellow band. **Prompt Book** is a charcoal page with chalk text, pencil-grey notes, Courier Prime for cue numbers and file names, a filled pink flag for BGM and a lime highlighter stripe behind the next cue's text.

A theme only swaps token values and a few type tokens. Components read semantic names (`--c-bg`, `--c-surface`, `--c-fx`, `--c-next`, ...) and never a theme-specific one. The choice is stored in localStorage under `sb_theme` and set on `<html data-theme="tape|book">`.

**Key Characteristics:**
- Flat fills and 1px hairline rules; the board is a module grid whose gaps are rule colour.
- One reserved signal colour per theme, used only for the next cue.
- Category is a mark (tape strip or labelled flag), never the row's fill.
- Product UI: fixed rem type, 44px targets, no decorative motion.
- Offline: fonts self-hosted in `public/fonts`, icons drawn SVG from `img/icons.svg`.

## Colors

Each theme is a near-black neutral ramp, one warm-white text, two category marks and one reserved next-cue colour. Frontmatter is normative for values; the `tape-` and `book-` prefixes map to the same semantic roles.

### Primary
- **Next-Cue Yellow / Lime Highlighter** (`tape-next` / `book-next`): the next cue and nothing else. Tape fills the band and the NEXT button with it; Book uses it as a stripe behind the cue text, the numeral and row outline in the list, and the NEXT button. Text on it is the theme's page colour.

### Secondary
- **Orange Tape** (`tape-fx`): effects category mark; also the playing outline and state text on an FX track.
- **Ice-Blue Tape** (`tape-bgm`): BGM category mark, progress fill and playing state.
- **Chalk Outline** (`book-fx`): effects flag; Book fills the flag with chalk and sets ink on it.
- **Pink Highlighter** (`book-bgm`): the BGM flag.

### Neutral
- **Stage Floor / Charcoal Page** (`tape-bg` / `book-bg`): page, cue column, inputs.
- **Panel / Raised Row** (`*-surface`, `*-surface-2`): side panels and header; track rows, toasts, hovered or next cue row.
- **Hairline** (`*-rule`): grid gaps, borders, progress track, scrollbar thumb.
- **Warm White / Chalk** (`*-text`): text, primary button fill, focus ring.
- **Muted / Pencil Grey** (`*-muted`): secondary text, counters, labels, done cues.
- **Danger** (`*-danger`): destructive text, error borders and form errors only.

### Named Rules
**The Next-Only Rule.** The next-cue colour appears on the next band, the next cue row (outline and numeral), and the NEXT button. Never for focus, selection, hover, success or decoration.
**The Mark Not Fill Rule.** Category colour marks a row (strip, flag, playing outline, progress fill); rows stay on neutral surfaces.
**The Chalk Focus Rule.** The focus ring is the text colour in both themes, so it cannot be mistaken for the next cue.

## Typography

**Display Font:** Barlow Condensed (Tape, uppercase, 0.06em tracking) / Source Sans 3 (Book, sentence case, 0.02em), falling back to system-ui.
**Body Font:** Barlow (Tape) / Source Sans 3 (Book).
**Label/Mono Font:** Barlow Condensed in Tape for cue numbers; Courier Prime in Book for cue numbers and file names.

**Character:** Tape reads like a stage manager's marker lettering; Book reads like a typed script with pencil notes. Tabular numerals are on globally.

### Hierarchy
- **Next numeral** (700, 3.75rem Tape / 1.75rem Book, 0.9): the next cue's number in the band.
- **Page title** (700, 1.75rem, 1.1): project list heading.
- **Headline** (700, 1.25rem, 1.1 to 1.2): app title, panel titles, project names, next-band text (1.5rem Tape / 1.25rem Book).
- **Cue number** (700, 1.25rem, mono face): right-aligned in the cue row.
- **Body** (400, 1rem, 1.4): default text and fields; project descriptions capped at 65ch.
- **Small** (400 to 700, 0.875rem): buttons sm, file names, counters, toasts, secondary lines.
- **Label** (600 to 700, 0.75rem): field labels, slider labels, flags (0.04em tracking), playing state text (uppercase, 0.06em). 12px is the floor.

Scale: 0.75, 0.875, 1, 1.25, 1.75 rem.

### Named Rules
**The Twelve Pixel Floor Rule.** No text under 0.75rem.
**The Two-Voice Rule.** Display face for headings and numerals, UI face for everything else, mono face only for cue numbers and file names.

## Layout

Fixed-height app shell: a header over a three-column hairline grid, Effects (1fr), Cues (1.7fr, widest, on the page colour), BGM (1fr), with 1px gaps in rule colour and each column scrolling internally. At 1100px and below the cue column spans the top with FX and BGM side by side beneath, lists cap at 28rem and the cue actions stick to the bottom. At 700px and below everything is one column, NEXT goes full width and the mixer stacks. The project list is a centred column (max 60rem).

Spacing is a 4px-based scale (4, 8, 12, 16, 24, 32). Panels pad 16px; rows are at least 52px; every interactive target is at least 44px (secondary small controls are 36px and sit in a 44px row context).

## Elevation & Depth

Flat. Depth comes from tonal layering (page, panel, raised row) and 1px rules. The only overlay treatment is the dialog backdrop (70% black). No shadows, glows or gradients.

### Named Rules
**The Flat-Always Rule.** State is shown by border, outline or fill swap, never by shadow.

## Shapes

Small, square-ish corners: 4px in Tape, 2px in Book (`--radius`). Buttons, fields, rows, toasts and dialogs share it. Tape category marks are 10px by 28px strips skewed -10deg like cut tape; Book flags are small filled labels with the same radius. The dropzone uses a 1px dashed rule border. The progress bar is 4px high.

## Components

All components share one markup in both themes.

### Buttons
- **Shape:** radius token, 44px min height, 16px side padding, 600 weight, 1rem.
- **Default:** raised surface, rule border; hover brightens border to text colour; active drops to rule colour; disabled 45% opacity.
- **Primary:** text colour fill with page-colour text; hover inverts.
- **Ghost / Danger / Sm:** transparent; danger-coloured text; 36px height at 0.875rem.
- **Next:** 56px, display face, 1.25rem, next-cue fill; hover inverts to ink fill with next-colour text. Sole button allowed the next colour.
- **Icon button:** 44px square, rule border; quiet variant has no border, muted, danger on hover.

### Fields
- 44px, page-colour fill, rule border, hover border muted, focus border chalk plus the 2px chalk outline. Labels are 12px muted above. Compact variant is 36px. Native checkbox, range and switch inputs use the text colour as accent.

### Segmented Control and Switch
- Segments are 36px bordered buttons; the checked one fills with text colour and page-colour text. Focus shows a 2px chalk outline.

### Toast and Dialog
- Toast: raised surface, rule border, bottom-right, slides up 8px over 200ms; error toasts take a danger border and icon.
- Dialog: panel surface, rule border, 24px padding, max 28rem, actions right-aligned.

### Dropzone
- Dashed rule border, muted text; hover and drag-over move border and text to chalk.

### Category Mark
- Tape: skewed strip. Book: labelled flag, filled. Tape keeps the flag text for assistive tech only. Colour comes from the row's kind.

### Track Row
- Raised surface, 52px min. File name in the mono face, mark, key chip, play toggle. Playing state: category outline (1px, inset), uppercase state text, pressed play button filled with the category colour and a pause icon. BGM shows a 4px progress bar and time.

### Cue Row
- Grid of number, mark, summary, actions. Done: muted, regular weight, with a done icon. Editing: inline editor expands full width. Next: raised surface, 1px next-colour outline, next-colour numeral.

### Next Band (signature)
- The largest object on the screen. Tape: solid next-cue fill, monumental numeral, text in ink. Book: transparent with rule border, typed numeral, cue text on a highlighter stripe. An empty state is transparent and muted. It is the only element that may fill with the next colour.

### Mixer Sliders
- Two labelled range sliders with 44px hit area, a stop button with a chalk border, bordered above by a rule.

### Project List
- Hairline-ruled stack of panel-colour rows: name in display face, muted description and meta.

## Do's and Don'ts

### Do:
- **Do** read colour only from semantic tokens; add a theme by swapping values, not by adding components.
- **Do** reserve the next-cue colour for the next cue, its row, numeral and button.
- **Do** keep 44px targets, 12px minimum text, AA contrast, and the 2px chalk focus ring with 2px offset.
- **Do** show playing as outline plus state text plus pause icon, so it never relies on colour alone.
- **Do** use 160ms ease-out for state changes; honour `prefers-reduced-motion`.
- **Do** use icons from `img/icons.svg` and self-hosted fonts from `public/fonts`.
- **Do** theme scrollbars, selection, caret and accent colour from tokens.

### Don't:
- **Don't** use the next-cue colour for focus, hover, success, category or decoration.
- **Don't** add kickers, eyebrows or small uppercase lead-in labels above headings.
- **Don't** use coloured side borders thicker than 1px, gradients, glows, text shadows or offset shadows.
- **Don't** use emoji, glyph or icon-font icons, or load fonts or assets from a network.
- **Don't** fill whole rows with a category colour; category is a mark.
- **Don't** put theme conditionals in components beyond the existing mark and cue-grid rules in the page stylesheet.
