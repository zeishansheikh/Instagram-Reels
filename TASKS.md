# Build Plan (do in order, do not skip ahead)

## Phase 0 — Setup (1 hour)
- [ ] Install Python 3.11+, FFmpeg (`ffmpeg -version` works)
- [ ] Create project, venv, `pip install google-genai typer pydantic python-dotenv httpx loguru pillow pyyaml`
- [ ] `.env` with GEMINI_API_KEY (and PEXELS_API_KEY, free from pexels.com/api)
- [ ] 10 clips in `assets/backgrounds/`, 1 font in `assets/fonts/`

## Phase 1 — One reel by hand (Day 1)
- [ ] Hard-code one quote + one clip, render with FFmpeg: crop 9:16, darken, text, fade-in
- [ ] Compare against reference reels, tune style yaml until it looks right
Done when: one reel looks 80% like the reference.

## Phase 2 — Gemini quotes (Day 1-2)
- [ ] `quotes/generator.py` with JSON output + validation
- [ ] SQLite dedupe
- [ ] CLI: `reelforge quotes --count 10` prints quotes

## Phase 3 — Backgrounds (Day 2)
- [ ] `local_folder` provider with usage tracking
- [ ] `pexels` provider with mood keyword mapping + caching

## Phase 4 — Full pipeline (Day 3)
- [ ] `reelforge generate --count 10`
- [ ] Output folder with reel.mp4, caption.txt, meta.json
- [ ] Error handling: one failed reel does not stop batch

## Phase 5 — Quality (Day 4-5)
- [ ] 3 style presets rotating
- [ ] Text animation variants
- [ ] Optional manual approval step (preview, keep/discard)

## Phase 6 — Optional later
- [ ] Graph API publishing
- [ ] Simple web dashboard
- [ ] Reuse pieces in Vortixa as a "content automation" service for clients

## Rule
Total time box: 5 days. If it passes that, stop and go back to Vortixa outreach and client work.
