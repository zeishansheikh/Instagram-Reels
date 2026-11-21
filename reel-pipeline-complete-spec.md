# @noori.shed Reel Pipeline — Complete Spec

**Purpose:** everything Rio does to build and post the daily Instagram reels, written down so the whole job can be moved into code. If a rule here conflicts with an older spec file, this file wins.
**Current formula:** D3 (locked 2026-11-21). **Account:** @enoent.7 via Buffer channel "noori.shed". **Output:** 2 reels/day.
**Canonical live specs:** `~/workspace/clip-tool/swap/TEXT_SPEC.md` (text/quality rules) + cron bodies `insta-reel-build-a` / `insta-reel-build-b` (pipeline). **State:** `~/workspace/clip-tool/swap/workflow_state.json`. **Work dir:** `~/workspace/clip-tool/swap/` (never `/tmp` — it can be wiped mid-task).

---

## 1. Fixed output spec (never changes without the user's word)

| Item | Value |
|---|---|
| Final video | 1080x1920, 60fps, libx264, `-b:v 15M -maxrate 20M -bufsize 40M`, audio AAC 128k, `+faststart` |
| Master (backup) | Same video, libx264 preset slow, CRF 16 |
| Duration | Cut from source, typically 8–20s (no fixed length; the cut follows the source) |
| Source gate (ffprobe BEFORE any processing) | REJECT if width < 720, OR video bitrate < 800k, OR fps < 24. Prefer 1080x1920, higher bitrate |
| Upscale if soft | lanczos to 1080x1920 + mild unsharp `5:5:0.5` (use `5:5:0.4` if only slightly soft). Never over-sharpen (no halos) |
| 60fps | If source is NATIVE 60fps, keep it and SKIP minterpolate entirely. Otherwise `minterpolate=fps=60:mi_mode=mci:me_mode=bidir:scd=none` WITH a 1.0s lead-in (conversion starts ~1s before the cut, lead-in trimmed off), then check the first 5 frames (t=0.05–0.5s) for sharpness |
| Grade (adaptive, never one-size-fits-all) | Golden/sunset/warm scenes: `eq=contrast=1.08:saturation=1.22,colorbalance=rs=0.06:gs=0.015:bs=-0.06`. Green forest/daylight/cool scenes: `eq=contrast=1.05:saturation=1.12`, NEUTRAL balance (no warm push — forcing warmth on green daylight looks "rough"). Lighter if the source already looks cinematic |
| Light-first selection | No grade rescues bad light. REJECT flat overcast/hazy daylight at selection. Source must already have beautiful natural light (golden hour, directional sunlight, glowing highlights, real depth). Flat gray-green murk or blown-out white sky = REJECT even if luma/saturation gates pass |

---

## 2. Content formula — D3 (locked 2026-11-21, supersedes all older formulas)

- **Lines:** SAD DEEP Gen Z-style lines in ROMAN URDU, 2–3 lines. NO poet/author name anywhere — no "- Name" on screen, no attribution in the caption either.
- **Music:** SAD BEATS — a slow sad vocal OR a sad instrumental beat. The priority is the SAD EMOTIONAL mood, not the vocal-song rule.
- **Background:** REAL camera footage only, beautiful layered nature.
- **Text:** FIXED mid-centre (see §6).
- **Caption:** the lines themselves + exactly 3 hashtags. No attribution.

### 2.1 Lines — how they are written

- Language: Roman Urdu. 2–3 lines, short enough to read in one glance.
- Themes (rotate across the two daily reels, never the same theme twice in one day): loss, yaadein, waqt, tanhai, dard, hope-in-sadness.
- The lines do NOT have to match the video. Matching is fine, not required. They MUST be sad and emotional, and shareable/story-worthy (the kind people forward to a friend or put on their story). Never bulk filler.
- Never repeat a used line — check `used_lines` in `workflow_state.json` first.
- Forbidden in lines: em-dash "—" (AI feel), colons `:` and single-quotes `'` (they break the drawtext filter — reword to avoid them).
- Real examples that shipped:
  - waqt/yaadein: "sab kehte hain waqt sab theek kar deta hai, / mera waqt to bas yaadein de gaya."
  - tanhai: "sab kehte hain akela rehna buri baat hai, / par bheed mein bhi to main akela hi tha."

### 2.2 Songs — how they are picked

**Discovery (in order):**
1. Live Instagram trending chart, via `song_fetch_fixed.py` (see §8). It returns only gate-"accept" picks and excludes used songs. Prefer trend_rank 1–5 + modern artists.
2. If NO chart track is a clear sad match with verdict "accept" → go OFF-CHART: pick a modern sad emotional Urdu/Hindi/Punjabi vocal or sad beat (recent release, run it through the same style gate + mood-match check). Never post a chart leftover just because it survived the filters.

**Style gate (`song_style_gate.py`, run inside `song_fetch_fixed.py`):**
- Slow: bpm < ~90. Auto-REJECT bpm >= 100 hard-beat tracks. A gate verdict of "review" = REJECT, never a fallback pick.
- REJECT: upbeat, party, hip-hop, bhangra, rap, old classics, devotional / nasheed / naat / noha / recitation, noisy/harsh audio. NEVER English songs.
- **Gate verdicts vary per file/upload — re-check per file, never trust an earlier verdict on the same song.** (Same song was gate "review" bpm 92.3 in one build and "accept" bpm 80.7 in another.)
- Ratified example: "Dil Ki Khamoshi" — alonesinghkdm (chart rank 1, bpm 80.7, vocal 77.0–92.0s, slow faryaad chorus).

**Mood-match check (mandatory, human judgement):** listen against the lines — does this sound sad and heavy-hearted like the lines? A rhythmic/dholak-driven track is AWKWARD against a reflective sad line — REJECT and try the next candidate. (Failure case: "Latthay Di Chaadar" against a Confucius line, 2026-11-20 — the reel had to be reposted with a different song.)

**Vocal-section picking (`~/workspace/clip-tool/swap_audio.py`):**
- Vocal-aware: skips the first 15s intro, scores windows by vocal-band 300–3400 Hz energy + loudness.
- Scan the FULL vocal/energy profile — the top score can be a song's dying outro (high vocal ratio, fading energy). For short reels, choose a sustained section (e.g. a chorus plateau), never the last seconds.
- Short fades on the audio. The song is trimmed to the video length.

**Song download (YouTube via yt-dlp):**
- Flags that work on this VM: `--compat-opt no-certifi --cookies ~/workspace/clip-tool/cookies.txt --extractor-args "youtube:player_client=android_creator"` (2026-11-21: the `android` player client is FULLY bot-check blocked — android/web/ios/tv/android_music all fail with "Sign in to confirm you're not a bot"; `android_creator` works. Search stays on android.)
- Bot-check can be PER-VIDEO, not IP-wide: if one video ID fails, get ~5 search results (`--flat-playlist --print "%(id)s"`) and try each ID directly — a different upload may download fine.
- `song_fetch_fixed.py`'s hardcoded USED set must stay current with the 20–21 Nov picks, or it re-picks used songs (it did this with "Dil Ki Khamoshi" on 2026-11-21 — the re-download was deleted, never used).
- faster-whisper in the PodFetch venv is broken with av 19 (`TypeError: open() got an unexpected keyword argument 'metadata_errors'`). Bypass: decode audio to raw f32le PCM with ffmpeg (`-vn -ac 1 -ar 16000 -f f32le`), load with numpy, pass the ndarray to `model.transcribe()`. Use it to confirm a vocal section is real sung vocals (e.g. Whisper tiny ur prob 1.0) — never trust a section on numbers alone.

### 2.3 Backgrounds — how they are picked

**Source: Pinterest ONLY.** (Pexels was refused by the user repeatedly — never use it.)
- Live discovery works via the user's Pinterest session cookie installed in PodFetch `.env` (expires 2027-11-15; user can revoke by logging out). NEVER print or log the cookie value. If fetching breaks again, first check whether the cookie expired/was revoked. Anonymous search returns only dead e1_ collection pins.
- Fetch: `pin_fetch_nodrive.py "<comma-separated used pin IDs from used_pins>" <keyword_file>` — it skips used pins and e1_ pins. Numeric pin IDs only (long alphanumeric IDs 404 in yt-dlp). For several candidates at once: `pin_hunt_quality.py` (downloads up to N gate-passers, extracts 3 frames each, writes summary.json).
- **The fetch tool stops at the first technically-passing video and has NO beauty or single-scene judgement.** Always hunt several candidates and frame-check them yourself; only use one that is a single continuous epic scene. (First live fetch after the cookie fix picked a 3-scene montage the user called "garbage".)
- Keywords: fresh nature keywords every time, rotated, never repeating a recent scene type. Recent used categories: misty lake, river gorge, waterfall dark rocks, alpine meadow, green cliff, autumn forest path. Keep adding creative new ones.

**Rejection rules (all mandatory, checked on full-res frames):**
- WATERMARK: any visible watermark, logo, creator username/handle, overlaid text, or border graphics → REJECT. Inspect 2–3 frames specifically for this.
- BRIGHTNESS: REJECT if mean luma > ~0.62. A bright hazy sky filling the frame = reject even if luma passes.
- WASHED-OUT: measure saturation too (`ffmpeg -vf signalstats`, SATAVG). If mean SATAVG < 0.12 AND mean luma > 0.45 → REJECT as washed-out gray haze.
- REAL-FOOTAGE (2026-11-21): REJECT anything that looks AI-generated — over-perfect/dreamlike composition, plastic or impossibly perfect flowers/foliage, impossible lighting, weird symmetry, dreamy haze. Prefer real camera footage with natural imperfections, realistic textures, believable light.
- FOG/MIST (2026-11-21): AVOID foggy/misty/hazy low-contrast scenes — fog reads as blur after Instagram's re-encode. Prefer crisp high-detail scenes with strong contrast and visible fine detail (leaves, water texture, rock detail).
- NO-LIGHTHOUSE / NO-GLOOMY: NEVER lighthouse scenes, man-made structures (buildings, towers, bridges), or stormy/gloomy/dreary scenes. Dark/moody does NOT mean gloomy.
- CLOUDS/SKY-ONLY: single-subject sky/clouds-only statics are BORING — OUT even at correct luma. Backgrounds must be LAYERED epic scenes (mountain + lake, waterfall, valley, foreground + subject + depth).
- BEAUTY BAR: the background must be MORE beautiful than the @degraaf.david reference shots — epic, stunning, layered. "Nice" is not enough; if the clip is not clearly STUNNING, REJECT it and fetch another.
- NO-REUSE: a pin once used is NEVER used again. Check `used_pins` (pin IDs) and `used_reels` (Drive IDs) in `workflow_state.json`. Retired forever: misty-lake pin `1037939045357806520` (looked AI-generated).

---

## 3. Text — font, placement, reveal

- Font: Noto Serif SEMIBOLD, upright (NOT italic). Path: `/usr/share/fonts/truetype/noto/NotoSerif-SemiBold.ttf` (fallback: `NotoSerif-Bold.ttf`). Fontsize 30 on 1080x1920. White, no background box. Shadow: STRONG black — `shadowcolor=black@0.9:shadowx=0:shadowy=2`. (The thin Light-28 was unreadable on bright backgrounds — user complaint 2026-10-17.)
- Reveal: ALL AT ONCE — the full text block is visible from t=0 to the end (static, no line-by-line animation). Burn with a single drawtext call (or stacked per-line drawtexts with no timing logic). Line spacing ~fontsize*1.5, block centered on the chosen band.
- **PLACEMENT LOCK (2026-11-21 ~13:29, supersedes all earlier placement rules): text is FIXED in the MIDDLE-CENTRE — block centre y ≈ 960 on 1080x1920. NEVER at the top, NEVER at the bottom.**
  - MEASURE, don't guess: sample frames across the whole cut, compute mean luma per horizontal band in the CENTER column (x 340–740 on 1080x1920, where the centered text sits). Place the text block in the DARKEST calm band NEAREST the vertical centre with luma < 80.
  - If the exact centre band is unreadable (prove it with a test render), use the nearest readable band to the centre — but STAY in the middle third (y ~640–1280), never drift into the top or bottom third.
  - Frame-checks must judge READABILITY (does the text pop?), not just coordinates. Readability beats the exact y-range; never force text onto a bright band to satisfy a position.
  - History: text at the bottom was corrected 2026-11-21 ~12:51; text slightly below the top (y 330/375) was corrected the same day ~13:29 ("too high").

---

## 4. Build pipeline (in order — this is the checklist the code must follow)

1. **State:** read `workflow_state.json`. Pick a video category DIFFERENT from `last_category`, a song DIFFERENT from `last_song`, fresh lines not in `used_lines` (and a different theme from the other slot's reel today). Slot B must also differ from slot A's picks the same day.
2. **Video:** fetch ONE fresh vertical reel for the chosen category (Pinterest only, §2.3). Verify its pin_id is not in `used_pins` — if it is, fetch again.
3. **Song:** fetch ONE sad trending song (live IG chart, §2.2), different from `last_song`. If fetch fails, fall back to a saved sad song from Drive (different from `last_song`) and note it.
4. **Download** both to `~/workspace/clip-tool/swap/`.
5. **QUALITY GATE (mandatory):** ffprobe — REJECT if width < 720 or bitrate < 800k or fps < 24. Log the values.
6. **BRIGHTNESS CHECK:** 3 frames, mean luma + mean SATAVG. REJECT if luma > ~0.62; bright hazy sky = reject; washed-out = reject if SATAVG < 0.12 and luma > 0.45.
7. **WATERMARK CHECK (mandatory):** 2–3 frames inspected for watermark/logo/username/overlaid text/borders. REJECT if found.
8. **REAL-FOOTAGE + FOG CHECK (mandatory):** full-res frames inspected — REJECT if the scene looks AI-generated or foggy/misty low-contrast.
9. **QUALITY PREP:** 1080p60 graded base — lanczos upscale if <1080p (+unsharp 5:5:0.5); native 60fps → SKIP minterpolate, else minterpolate to 60fps with a 1.0s lead-in; ADAPTIVE grade per §1; gentle unsharp only if soft. Verify 1080x1920@60.
10. **Audio swap** via `swap_audio.py` (vocal-aware, NOT loudest-only). Short fades. MOOD-MATCH sanity check (mandatory, §2.2).
11. **Write fresh lines** per §2.1, burn with the locked font spec + ALL-AT-ONCE reveal + placement lock (§3), libx264 preset slow CRF 16 master.
12. **DOUBLE-CHECK (mandatory):** sample frames spread across the WHOLE video — check an early frame (t~1s) and a late frame to confirm the full text is visible throughout; text must clear all subjects, be crisp and readable, placement correct, picture natural and sharp, NO watermark. A fix only counts when the re-checked frames prove it is fixed. + audio-verify (audio is audible, not silent).
13. **IG ENCODE:** libx264 1080x1920 60fps `-b:v 15M -maxrate 20M -bufsize 40M`, aac 128k, `+faststart`. Verify with ffprobe.
14. **STAGE:** copy final to `~/workspace/clip-tool/swap/ready_to_post/reel_YYYY-MM-DD_a.mp4` (slot A) or `_b.mp4` (slot B) + write `manifest_a.json` / `manifest_b.json` (see §6). Upload final to Drive as backup (Podcasts folder, §6), record link in manifest. Append used pin ID to `used_pins`. DO NOT POST (a separate post job posts).
15. **Reporting:** on success, stay silent (the post job reports). On ANY failure, report exactly which step failed and why.

---

## 5. Verification checklist (run before staging — and again before posting)

- ffprobe the final file: 1080x1920, ~60fps (r_frame_rate and avg_frame_rate both 60), video bitrate ~15 Mbps, duration matches the cut, audio stream present (AAC ~128k).
- Frames read across the whole video (early t≈0.1, middle, late): text mid-centre and readable in ALL of them; first frames sharp (no start-of-reel blur); no watermark; background is real crisp footage.
- Audio audible: `volumedetect` mean around −10 dB, max 0.0 dB (not silent, not clipping throughout).
- Caption file matches the on-screen lines exactly (same words, same line breaks).
- The pin, lines and song are all absent from `used_pins` / `used_lines` / `used_songs` before the build, and appended after it.

---

## 6. Posting, caption, state, Drive

- **Posting:** Buffer "Publish Now" (direct publish, never queue/schedule), channel "noori.shed" → @enoent.7. The post job reads its slot's manifest, verifies date == today (Asia/Karachi) + file exists + 1080x1920@~60fps, posts, reports the live link, and emails the user. If the manifest is missing/stale, it reports the reel is not ready and does NOT post.
- **Caption format:** the lines themselves, blank line, then exactly 3 hashtags (sad-genre fitting, e.g. `#sad #dard #tanhai` — rotate fitting tags). No attribution anywhere.
- **Manifest** (`ready_to_post/manifest_a.json` / `manifest_b.json`):
  ```json
  {"date":"YYYY-MM-DD","slot":"a","video_path":"<abs path>","caption":"<text>","hashtags":["#a","#b","#c"],"song":"<song name>","quote":"<quote>","drive_backup":{"id":"<file id>"}}
  ```
- **State file** `~/workspace/clip-tool/swap/workflow_state.json`:
  - `used_pins`: list of pin IDs (strings) ever used. `used_lines`: list of line-strings ever used. `used_songs`: list of dicts `{"song": "<title> - <artist> ...", "date": "YYYY-MM-DD..."}`. `used_reels`: list of `"PIN:<pin id>"` strings ever posted.
  - `last_category`, `last_song`, `last_quote`: the most recent build's picks (drives the "different from last" rule). `last_run`: last build tag (e.g. `2026-11-21-d3`) — the daily monitor checks its date.
  - Counts on 2026-11-21 after the test reel posted: used_pins 25, used_lines 47, used_songs 38, used_reels 44.
- **Drive backup:** EVERYTHING uploaded to Google Drive goes inside the "Podcasts" folder — id `14mOs_5rZlsr5Dtp40qXf9nmGEhTYvwLg` (owner woundedsoul14367@gmail.com, shared drive). Upload: `hatch_gws_cli drive +upload <path> --parent 14mOs_5rZlsr5Dtp40qXf9nmGEhTYvwLg`. Subfolders: "trending songs", "clips", "pinterest". Never change a Drive link's sharing without asking.
  - Drive upload quirk: PodFetch's resumable upload intermittently fails with HttpError 411 "Length Required" on this VM — use a simple (non-resumable) upload instead; it succeeded for an 18.6 MB file.
- **Email:** EVERY task gets an email to `zeishanmaqsood143@gmail.com` (live link + caption after posting; summaries for one-off tasks). Send via `/opt/hatch/bin/hatch_gws_cli gmail +send --to ... --subject ... --body ...`. Serious issues get an immediate direct email, not just the daily monitor. The daily monitor cron `issue-email-alerts` (20:45 PKT) checks both manifests dated today, `workflow_state.json` last_run date, today's post-job runs, PodFetch `automation.log` ERROR lines, and disk >90% — emails only on issue, silent otherwise.

---

## 7. Schedule (locked, resumed 2026-11-21)

| Job | When (PKT) |
|---|---|
| Build A | daily 08:30 |
| Build B | daily 16:00 |
| Posts (slot A) | Mon 11:30, Tue 11:00, Wed 11:30, Thu 12:00, Fri 11:00, Sat 10:30, Sun 10:30 |
| Posts (slot B) | Mon 19:30, Tue 20:00, Wed 19:30, Thu 20:00, Fri 19:00, Sat 20:30, Sun 19:30 |
| Issue email alerts | daily 20:45 |

- 17 jobs total (2 builds + 14 posts + 1 monitor), all reporting to the main chat. Build jobs stay silent on success; post jobs report the live link.
- NOT resumed (stay off): `insta-meta-token-refresh` (IG token expires 2026-12-12, no auto-renew — Buffer posting works without it), `devreel-daily-buffer-1830`, `podfetch-daily-auto`.

---

## 8. Toolchain and environment quirks (things the code must know)

- **PodFetch** (at `~/workspace/clip-tool/extracted/PodFetch`): Pinterest discovery/download + live IG chart songs + style gate. Run with its venv: `.venv/bin/python`. Env for every PodFetch run: `PODFETCH_PREFER_SYSTEM_CERTS=1 SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt`. YouTube cookies: `PODFETCH_YT_COOKIES_FILE=$HOME/workspace/clip-tool/cookies.txt`, `PODFETCH_YT_IMPERSONATE=chrome`.
- **Scripts** (all under `~/workspace/clip-tool/swap/` unless noted):
  - `pin_fetch_nodrive.py` — fetch one Pinterest video, skipping used pins. `pin_hunt_quality.py` — hunt several candidates, 3 frames each, summary.json. `pin_hunt_b.py` — DB-pool hunt (pool is badly degraded — expect many rounds or failure). `dl_pins_by_id.py` / `fetch_one_pin.py` — fetch a specific pin.
  - `song_fetch_fixed.py` — live IG chart → gate → download (the one that works). `try_chart_tracks.py` — tries chart tracks one by one. `song_style_gate.py` — bpm/beat gate. `c_offchart.py` — off-chart song helper. `ig_fetch_nodrive.py` — BROKEN (SSL failures on every download; never use). `list_songs.py` — list saved songs.
  - `~/workspace/clip-tool/swap_audio.py` — vocal-aware audio swap (NOT in swap/). `burn_text.py` — text burn helper. `up_drive.py` / `dl_drive.py` — Drive up/download helpers. `refresh_meta_token.py` — IG token refresh (auto-refresh currently DISABLED). `set_pinterest_cookie.py` — installs the Pinterest session cookie from stdin, never prints it.
- **ffmpeg/ffprobe:** quality gate, luma/saturation measurement (`-vf signalstats`), frame extraction, minterpolate, grade, IG encode.
- **Buffer:** posting only (Publish Now). Direct Instagram API posting is unavailable (`instagram-cli accounts` returns `[]`).
- **Python notes:** the PodFetch venv HAS numpy (installed 2026-10-18). numpy 2.x removed `ndarray.ptp()` — use `np.ptp(arr)`. `swap_audio.py` silently falls back to the loudest section when numpy is missing — always run it where numpy exists, or cut the vocal section manually after profiling.
- **VM quirks:** `/tmp` can be wiped mid-task (tmpfs) — keep intermediates under `~/workspace/clip-tool/swap/`. Local DNS lies (synthetic 198.18.x answers) — verify domains via Google DoH (`curl https://dns.google/resolve?name=<domain>&type=A`; Status 3 = NXDOMAIN).
- **Pinterest keywords env override does NOT work:** PodFetch `config.py` runs `load_dotenv(override=True)`, which clobbers `os.environ`. To force keywords for one run, write them into `pinterest_keywords.txt` directly and restore from backup afterwards.

---

## 9. Decision trees (the judgement calls, as if-then)

- **Chart has a gate-accept sad track** → use the best-ranked one (rank 1–5 preferred).
- **Chart has NO gate-accept sad track** (all "review"/rejected/download-failed) → go OFF-CHART (§2.2), never post a leftover.
- **Song download bot-checks on one video ID** → try other upload IDs for the same song; if all fail, try another player client (`android_creator` currently works).
- **Centre band luma >= 80 or busy subject in the band** → test-render; if unreadable, use the nearest readable band to the centre, staying in the middle third (y 640–1280). If NO band in the middle third is readable → pick a different clip, do not force text onto a bright band.
- **Source fails the quality gate** → discard, re-fetch a different pin. Never post a low-quality reel.
- **Candidate looks AI-generated / foggy / watermarked / man-made / gloomy / sky-only** → reject, hunt the next candidate. Do not try to fix a bad background with grading.
- **Build fails at any step** → stop, report exactly which step failed and why. Do not post a partial build.
- **Manifest missing/stale at post time** → do not post; report "reel not ready".

---

## 10. Superseded rules (do NOT re-add these)

- Philosopher quotes with "- Name" attribution (old formula, 2026-10-13 → 2026-11-20). Folk/Sufi taste profile ("Chalre Chalre Waal" feel, Coke Studio-style; OUT: soft indie-pop/lo-fi, polished Bollywood playback, Bollywood-composer folk). Never-beats-only song rule (sad beats now allowed). Text "slightly below top or mid-centre" (now FIXED mid-centre). Text at the bottom (never). Line-by-line text reveal (rejected 2026-10-18 — all-at-once only). One-size-fits-all warm grade (now adaptive). Fixed 8 PM single post (now 2/day at day-specific times). Thin Noto Serif Light 28 (now SemiBold 30). 12M IG encode (now 15M/20M/40M).

---

## Appendix — file inventory

| File | What it is |
|---|---|
| `~/workspace/clip-tool/swap/TEXT_SPEC.md` | Canonical text/quality spec (kept in sync with this file) |
| `~/workspace/clip-tool/swap/workflow_state.json` | Used pins/lines/songs/reels + last picks (see §6) |
| `~/workspace/clip-tool/swap/ready_to_post/` | Staged finals + manifests (`reel_YYYY-MM-DD_a/b.mp4`, `manifest_a/b.json`) |
| `~/workspace/clip-tool/swap/QUOTES.md` | Starter line bank (old; lines are now written fresh daily) |
| `~/workspace/clip-tool/extracted/PodFetch/` | PodFetch repo (Pinterest + IG chart + gate) |
| `~/workspace/goals/insta-daily-reel-workflow-8-pm-direct-post/GOAL.md` | Goal notes (formula + status history) |
| `~/workspace/goals/insta-daily-reel-workflow-8-pm-direct-post/crons/` | The 17 cron job definitions (2 builds, 14 posts, 1 monitor) |
| `~/AGENTS.md` | VM lessons (cookie, android_creator, Drive 411, faster-whisper bypass, etc.) |
| `~/MEMORY.md` | Locks + history (placement lock updates, resume, post log) |
| This file | The whole job in one place, for moving it into code |

*Written 2026-11-21 from the live cron bodies, TEXT_SPEC.md, AGENTS.md lessons, and the day's builds (d/d2/d3 + test reel).*
