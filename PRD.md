# PRD: Reel Forge — Automated Quote Reel Generator

## 1. Overview
A Python tool that automatically produces Instagram-style quote/poetry reels (sad lines, deep quotes, moody backgrounds) in bulk. Quotes are written by Gemini, backgrounds come from a pluggable source, video is rendered with FFmpeg, and finished reels land in an output folder ready to post. The user adds the trending song manually inside Instagram at upload time.

## 2. Goals
- Generate N finished reels (1080x1920, 7-12s) per run with zero manual editing.
- Match a defined visual style (see STYLE_GUIDE.md) consistently.
- Run as a daily batch (e.g. 10 reels per run).
- Produce caption + hashtags for each reel.
- Keep every reel traceable (which quote, which clip, which style).

## 3. Non-Goals (v1)
- No scraping of Pinterest or Instagram.
- No downloading or embedding of copyrighted songs.
- No auto-attaching Instagram library audio (not possible via API).
- No web UI (CLI first).
- No multi-account management.

## 4. User
Single user (Zeeshan), runs locally on his machine, supplies his own Gemini API key.

## 5. Functional Requirements

### FR1 Quote generation
- Call Gemini with a themed prompt; return structured JSON (quote, mood, theme, caption, hashtags).
- Themes configurable: sad, heartbreak, loneliness, self-worth, silence, night thoughts, etc.
- Language configurable: English, Roman Urdu, Urdu.
- Length limit: 6-25 words per quote, max 4 lines on screen.
- Deduplicate against previously used quotes (SQLite, similarity check).

### FR2 Background provider (pluggable)
- `pexels`: search by mood keywords (rain, night city, dark ocean, window, lonely road), download portrait/landscape clips, cache locally.
- `local_folder`: pick random unused clip from `assets/backgrounds/` (user drops clips here, including ones he saves himself from any source).
- Provider interface identical so more can be added later.
- Track clip usage; avoid reusing a clip within N reels.

### FR3 Video rendering
- Output 1080x1920, 30fps, H.264, AAC (silent track or royalty-free music).
- Crop/scale any input to 9:16.
- Apply: slight blur or darken overlay for text readability, color grade (LUT or eq filter), optional vignette/grain.
- Text overlay: font, size, color, shadow, position, line breaks balanced automatically.
- Text animation: fade-in, word-by-word or line-by-line typing, per style config.
- Duration = reading time of quote + padding (clamped 7-12s).

### FR4 Audio
- Mode `none`: silent (user adds song in Instagram).
- Mode `royalty_free`: random track from `assets/music/` (user-supplied royalty-free files).
- Default: `none`.

### FR5 Output package
For each reel create folder `output/YYYY-MM-DD/reel_001/` containing:
- `reel.mp4`
- `caption.txt` (caption + hashtags)
- `meta.json` (quote, clip id, style, timestamps)

### FR6 Scheduling / posting (phase 2)
- Phase 1: manual upload from output folder.
- Phase 2: Instagram Graph API publish (needs Business/Creator account + Facebook Page + public video URL) or Meta Business Suite manual scheduling.

### FR7 CLI
```
reelforge generate --count 10 --theme sad --lang en
reelforge preview --quote "text"       # render one test reel
reelforge clean                         # clear cache
```

## 6. Non-Functional Requirements
- Render time under 60s per reel on a normal laptop.
- All secrets in `.env`, never in code.
- Idempotent: re-running does not duplicate reels.
- Logs for every step; failures skip the reel, do not crash the batch.

## 7. Success Metrics
- 10 reels generated in one command with no manual step.
- Less than 10% of reels need to be rejected for visual/text problems.
- Quote duplication rate: 0 in 30 days.

## 8. Risks & Compliance
| Risk | Decision |
|---|---|
| Pinterest scraping | Not built. Use `local_folder` for manually saved clips; user is responsible for rights of what he drops in. |
| Copyright on clips/music | Default to licensed sources (Pexels) and silent audio + manual in-app song. |
| Instagram reach drop for repetitive content | Vary styles (3-5 style presets), vary clips, keep quote quality high. |
| Gemini output quality | Strong prompt + few-shot examples + dedup + optional manual approval step. |
| API/model name changes | Model name in config, not hard-coded. |

## 9. Milestones
See TASKS.md.
