# Instora Reel Fonts — 30 trending fonts (English + Urdu)

All fonts are from Google Fonts, free under the SIL Open Font License (OFL) —
free for personal and commercial use. No API key needed; these are the actual
`.ttf` files, ready to drop into your project as `fonts/`.

## Use in FFmpeg (Instora drawtext)

```
drawtext=fontfile=fonts/Poppins-Bold.ttf:text='your line':fontsize=30:fontcolor=white:shadowcolor=black@0.9:shadowx=0:shadowy=2
```

Just swap `fontfile=` for the font you want. All files are fixed-weight
(static) TTFs — variable fonts were baked to their listed weight, so
`drawtext` renders the exact weight in the filename.

`fonts.json` in this zip lists every font (name, file, script, style, weight)
for the picker UI.

## English — 18

| File | Style | Best for |
|---|---|---|
| Poppins-SemiBold.ttf | Sans, 600 | Clean modern quotes (default vibe) |
| Poppins-Bold.ttf | Sans, 700 | Clean modern quotes, bolder |
| Montserrat-Bold.ttf | Sans, 700 | Clean modern quotes |
| BebasNeue-Regular.ttf | Display, condensed | Hooks / big one-word titles |
| Anton-Regular.ttf | Display, heavy | Hooks / bold titles |
| Oswald-SemiBold.ttf | Sans condensed, 600 | Titles, tight bold lines |
| PlayfairDisplay-Bold.ttf | Serif, 700 | Elegant / poetic quotes |
| Lato-Bold.ttf | Sans, 700 | Readable everyday quotes |
| ArchivoBlack-Regular.ttf | Display, heavy | Loud hooks |
| AlfaSlabOne-Regular.ttf | Display slab | Retro bold titles |
| DMSerifDisplay-Regular.ttf | Serif | Elegant quotes |
| AbrilFatface-Regular.ttf | Display serif | Stylish headlines |
| Pacifico-Regular.ttf | Handwritten | Soft / friendly lines |
| Lobster-Regular.ttf | Handwritten display | Fun bold script |
| GreatVibes-Regular.ttf | Script | Elegant script lines |
| Caveat-Bold.ttf | Handwritten, 700 | Personal / diary-feel lines |
| DancingScript-Bold.ttf | Script, 700 | Romantic / soft lines |
| Inter-Bold.ttf | Sans, 700 | Clean UI-style bold text |

## Urdu — 12

| File | Style | drawtext |
|---|---|---|
| NotoNastaliqUrdu-Regular.ttf | Nastaliq, 400 | NO — see warning |
| NotoNastaliqUrdu-Bold.ttf | Nastaliq, 700 | NO — see warning |
| Gulzar-Regular.ttf | Nastaliq-style, 400 | NO — see warning |
| Amiri-Bold.ttf | Naskh, 700 | YES |
| NotoNaskhArabic-Bold.ttf | Naskh, 700 | YES |
| ScheherazadeNew-Bold.ttf | Naskh, 700 | YES |
| Harmattan-Bold.ttf | Naskh, 700 | YES |
| MarkaziText-Bold.ttf | Naskh, 700 | YES |
| ReemKufi-Bold.ttf | Kufi, 700 | YES |
| Cairo-Bold.ttf | Modern sans, 700 | YES (also has Latin) |
| Tajawal-Bold.ttf | Modern sans, 700 | YES (also has Latin) |
| ArefRuqaa-Bold.ttf | Display, 700 | YES |

## ⚠️ Nastaliq warning — read this before using Urdu script

Tested on 2026-11-24 with plain `ffmpeg drawtext`:

- **Noto Nastaliq Urdu (both weights) and Gulzar render as empty boxes / blank**
  with `drawtext`. FFmpeg's drawtext does no complex text shaping, and
  Nastaliq needs it.
- **Naskh/Kufi/modern fonts work fine with drawtext** — Amiri and Noto Naskh
  Arabic were verified on-frame rendering `وقت گزر گیا` correctly joined.
- **If you need Nastaliq on a reel:** do NOT use `drawtext`. Render the text
  through the `subtitles` filter with an `.ass` file (libass + HarfBuzz shapes
  Nastaliq correctly), or pre-render the text to a transparent PNG with
  Pillow + libraqm and overlay it.
- Roman Urdu lines (Latin script) work with **all 18 English fonts** — no
  shaping issue at all.

## Not included (on purpose)

Jameel Noori Nastaleeq and Alvi Nastaliq are the famous Urdu fonts, but they
are proprietary/paid — not on Google Fonts, so not in this pack. The fonts
above are the free equivalents.
