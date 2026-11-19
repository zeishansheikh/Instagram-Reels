# Style Guide (filled from @degraaf.david content profile, checked 19 Nov 2026)

Benchmark: epic nature footage, one calm scene, centred white reflective text, ambient mood. Reels carry a feeling; the text is the message.

## What was verified vs not
- Verified from profile file: subjects, light, text themes, white centred text over the calmest part of the frame, ambient instrumental audio, short captions, light hashtags (#nature #positivity #naturetherapy), single static or slow-moving shots.
- NOT verified (do not guess, test visually): exact font, text size, reel length, exact grade values, text animation. Defaults below are starting points only.

## Visual rules
- Real, wide, layered nature: alpine lake reflections, mountain peaks, golden larches, sunsets with birds, snowy peaks above clouds.
- Light first: golden hour, sunrise, sunset, alpenglow. Avoid flat overcast clips.
- One calm scene per reel, little camera movement. No fast cuts, no heavy filters.
- Clip quality gate: minimum 1080p, no watermark, no visible people's faces, rejects shaky footage.
- Text sits on the calmest area (sky / still water). Light darken overlay (0.15-0.30) only if needed for readability; no heavy blur.

## Text rules
- White, centred, shadow for contrast, 3-4 lines max, appears calmly (fade or line-by-line).
- Voice: personal, reflective, hopeful. Themes: hope, gratitude, childhood dreams, not wasting life, starting over, sunsets, quiet beauty.
- Not generic motivational-poster lines. Never copy his actual lines.

## Audio rules
- Default `audio.mode: none`. At upload, add a slow ambient instrumental (piano, strings, soft synth, drone) from Instagram's audio library. Pick music that matches the scene mood; avoid beats and trending dance audio for this style.

## Caption rules
- One or two lines, often the quote or a single reflective sentence + one emoji (✨).
- 3-5 hashtags only: #nature #positivity #naturetherapy plus one theme tag.

## Cadence
- Photos/carousels are his bulk; the reel tool covers reels only. Realistic target: 3-4 reels a week, not 10 a day. Volume is not what made his reels work.

## Background search keywords (Pexels / your manual folder tags)
`alpine lake reflection`, `mountain golden hour`, `larch autumn forest`, `sunset birds flying`, `snowy peaks above clouds`, `lake sunrise mist`, `mountain waterfall`, `calm ocean sunset`

## Gemini quote prompt (replaces the sad-lines prompt in prompts.py)
```
You write short reflective lines for nature reels on Instagram.
Tone: warm, personal, hopeful, quiet. Written like one person talking to another.
Themes: {themes}. Language: {lang}.
Rules:
- 10 to 25 words, displayed as max 4 short lines
- Concrete and emotionally honest, not cliche motivational-poster language
- No emojis or hashtags inside the quote
- Every quote must differ in structure and opening words
- Do not imitate or reuse any known viral quote
- Give: mood keyword (one of: lake, mountain, sunset, forest, snow, ocean, sky),
  a one-line caption, and 3 hashtags
Return a JSON array of 10 objects:
[{"text": "...", "mood": "...", "theme": "...", "caption": "...", "hashtags": ["#..."]}]
Avoid these recent quotes: {recent_quotes}
```
