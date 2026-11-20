# AUTOPUBLISH.md — Fully automated: Drive video -> Gemini quote -> render -> post to Instagram

Target command (runs by itself every day):
```
reelforge run-daily      # pick clip from Drive, write quote, render, upload, publish, log
```

## 1. How auto-publish works (Instagram Graph API)
1. Tool renders `reel.mp4`.
2. Tool uploads it to a public URL (Instagram must be able to download it): Supabase Storage public bucket or Cloudflare R2.
3. `POST /{ig-user-id}/media` with `media_type=REELS`, `video_url`, `caption`, `share_to_feed=true` -> returns a container id.
4. Poll `GET /{container-id}?fields=status_code` until `FINISHED` (error out on `ERROR`/`EXPIRED`).
5. `POST /{ig-user-id}/media_publish` with `creation_id`.
6. Delete the temp video from storage, write a row to the `publish_log` table.

## 2. Hard limits you must accept
- **No Instagram library songs via API.** An auto-published reel has either no music or music baked into the video file. For this style (ambient instrumental) the fully automated mode uses `audio.mode: royalty_free` with tracks in `assets/music/` (Pixabay Music, YouTube Audio Library, or music you own/licence). Trending-audio reach boost is not available in full-auto mode.
- Account must be Instagram **Professional** (Creator or Business).
- API publishing cap is about 100 posts / 24h; irrelevant at 1-3 per day.
- Meta changes APIs and permission names often. The agent must check the current Meta docs (Instagram Platform, content publishing) before coding and tell you any differences from this file.

## 3. One-time Meta setup (you do this by hand, about 1-2 hours)
1. Switch the Instagram account to Professional (Settings -> Account type).
2. Meta offers two routes; use whichever the current docs recommend:
   - Instagram API with **Instagram Login** (no Facebook Page needed), or
   - Instagram API with **Facebook Login** (needs a Facebook Page linked to the IG account).
3. Go to developers.facebook.com -> create an app (Business type) -> add the Instagram product.
4. Add your Instagram account as an app role (admin/tester). For your OWN account in development mode you generally do not need full app review. Verify this in the current docs.
5. Required permissions (names depend on route): content publish + basic profile access.
6. Generate a user access token, exchange it for a **long-lived token (about 60 days)**, find your `ig-user-id`.
7. Put in `.env`: `IG_USER_ID`, `IG_ACCESS_TOKEN`, `META_APP_ID`, `META_APP_SECRET`, storage keys.
8. Test with ONE manual curl publish before involving the tool.

## 4. Safety rules (non-negotiable for an unattended bot)
- `--dry-run` mode: does everything except the final publish call. Run in dry-run for a few days first.
- Daily cap in config (default 1-2 posts/day). Never exceed it even if re-run.
- Kill switch: if a file named `STOP` exists in the project root, `run-daily` exits immediately.
- Idempotency: a quote/clip/reel is published once; `publish_log` prevents double posting on retries.
- Token refresh: refresh the long-lived token automatically before expiry; if refresh fails, stop and notify.
- Notifications on any failure (Telegram bot or email). Silent failure is the main risk of automation.
- Content filter: reject quotes containing banned words/topics (config list) before rendering.
- Keep a human-review option: `review_mode: true` renders and queues, `review_mode: false` posts directly.

## 5. Scheduling
- Simplest: Windows Task Scheduler (or cron) runs `reelforge run-daily` once a day at a fixed time. Laptop must be on.
- Later: small VPS, or GitHub Actions cron (store secrets in repo secrets; ffmpeg is available on ubuntu runners; Drive/Meta tokens need careful handling).
- Start local. Move to a server only after 2 weeks of stable runs.

## 6. Prompts for the agent

### Prompt 7 — Storage uploader
```
Implement publish/storage.py with a Storage protocol: upload(path) -> public_url, delete(url).
Implement SupabaseStorage (public bucket) and optionally R2Storage. Config selects the backend.
Files get random unguessable names. Add tests with mocks.
```

### Prompt 8 — Instagram publisher
```
First read the CURRENT Meta Instagram Platform content publishing docs and tell me any difference
from AUTOPUBLISH.md before coding.
Implement publish/graph_api.py: create REELS container, poll status (timeout 10 min, backoff),
publish, return media id and permalink. Handle API errors, rate limits, and expired tokens with clear messages.
Add token refresh (publish/token.py) that refreshes the long-lived token when under 10 days left and saves it.
Add publish_log table (reel_id, container_id, media_id, status, error, created_at).
CLI: reelforge publish --reel PATH [--dry-run].
```

### Prompt 9 — Daily runner
```
Implement reelforge run-daily:
1. Exit if STOP file exists or today's daily cap is reached.
2. Pick theme from config rotation, generate quotes, take the best unused one.
3. Pick a clip from the configured provider (gdrive), render with the chosen style, audio.mode from config.
4. Run quality checks (Prompt 5 checks). If it fails, retry with another clip up to 3 times.
5. If review_mode is false and not --dry-run: upload -> publish -> delete temp file -> log.
6. On any failure send a notification and exit non-zero.
Also add notify.py (Telegram bot token + chat id from .env; email optional).
Add a docs section: how to schedule with Windows Task Scheduler and cron.
```

### Prompt 10 — Audio (royalty-free baked in)
```
Implement audio.mode royalty_free: pick a random track from assets/music/, trim to reel duration,
fade in 1s and fade out 1.5s, lower volume to -18 LUFS-ish (loudnorm), mux into the video.
Track music used recently to avoid repeating the same track back to back.
```

## 7. Rollout plan
- Days 1-2: finish Phase 0-4 (reel generation works from Drive).
- Day 3-4: Meta setup + manual curl publish test.
- Day 4-5: Prompts 7-9, dry-run only.
- Week 2: review_mode true, you approve each reel, publish 1/day.
- Week 3+: review_mode false only if reels are consistently good and no failures.
