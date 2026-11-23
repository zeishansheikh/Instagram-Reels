# Architecture

## Stack
- Python 3.11+
- Gemini API via `google-genai` SDK (model name in config; verify the current Flash model in Google AI docs)
- FFmpeg (system install) driven via `subprocess` or `ffmpeg-python`; Pillow for text image rendering if needed
- SQLite for state (quotes, clips, reels)
- `typer` for CLI, `pydantic` for config, `python-dotenv`, `httpx`, `loguru`

## Folder layout
```
reel-forge/
  .env                    # GEMINI_API_KEY, PEXELS_API_KEY
  config.yaml             # global settings
  styles/
    default.yaml          # see STYLE_GUIDE.md
  assets/
    backgrounds/          # local_folder provider reads here
    music/                # optional royalty-free
    fonts/
  cache/                  # downloaded clips
  output/                 # finished reels
  db/instora.db
  src/instora/
    cli.py
    config.py
    db.py
    quotes/
      generator.py        # Gemini call, JSON parse, validation
      prompts.py
      dedupe.py
    backgrounds/
      base.py             # BackgroundProvider interface
      pexels.py
      local_folder.py
    render/
      pipeline.py         # orchestrates one reel
      text_layout.py      # line breaking, font fitting
      ffmpeg_cmd.py       # builds filter graph
      grade.py            # blur, darken, LUT, grain, vignette
    packaging/
      caption.py
      writer.py           # output folder + meta.json
    publish/
      graph_api.py        # phase 2
  tests/
```

## Data flow
```
CLI generate
  -> quotes.generator (Gemini) -> validated Quote objects
  -> dedupe against DB
  -> backgrounds.provider.get_clip(mood) -> local clip path
  -> render.pipeline(quote, clip, style) -> reel.mp4
  -> packaging.writer -> output/DATE/reel_NNN/{reel.mp4, caption.txt, meta.json}
  -> DB records quote, clip, reel
```

## Key interfaces
```python
class BackgroundProvider(Protocol):
    def get_clip(self, mood: str, min_seconds: float) -> Path: ...

@dataclass
class Quote:
    text: str
    mood: str
    theme: str
    caption: str
    hashtags: list[str]
    lang: str
```

## DB tables
- `quotes(id, text, text_hash, theme, lang, created_at, used)`
- `clips(id, source, source_id, path, last_used_at, use_count)`
- `reels(id, quote_id, clip_id, style, path, created_at, status)`

## Render spec
- Canvas 1080x1920, 30fps, yuv420p, libx264 crf 20, preset medium
- Background: scale+crop to 9:16, loop or trim to duration
- Layers: video -> darken overlay (0.25-0.45) -> optional blur -> grade -> grain/vignette -> text
- Text: centered, safe margins 90px, max width 80%, shadow for contrast
- Animation: fade-in 0.6s, line-by-line stagger 0.5s, fade-out 0.5s (configurable)
- Duration: max(7, min(12, words * 0.45 + 3)) seconds

## Gemini call rules
- Request `response_mime_type: application/json` with a schema
- Ask for 10 quotes per call, validate each (length, language, banned words)
- Retry up to 3 times with backoff; skip batch on failure

## Error handling
- Each reel in a try/except; log and continue
- Missing FFmpeg or API key -> fail fast at startup with clear message

## Phase 2: posting
- Graph API: create media container (REEL) -> poll status -> publish. Needs a public video URL, so upload to storage first (e.g. Cloudflare R2 / Supabase storage).
- Alternative: skip API and use Meta Business Suite scheduling by hand.
