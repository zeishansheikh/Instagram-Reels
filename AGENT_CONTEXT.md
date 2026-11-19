# Instructions for the AI coding agent (Antigravity / Claude / Gemini)

Read PRD.md, ARCHITECTURE.md, STYLE_GUIDE.md, TASKS.md before writing code.

## Rules
- Follow TASKS.md phase order. Finish and test each phase before the next.
- Do NOT implement scraping of Pinterest or Instagram, or downloading copyrighted music.
- Background sources must go through the `BackgroundProvider` interface.
- Secrets only from `.env`. Model name and all style values from config, never hard-coded.
- Keep functions small, add type hints, and add at least a basic test per module.
- After each phase, explain in simple language what was built and how to run it.
- When something is ambiguous, ask instead of guessing.
- Prefer simple solutions (FFmpeg filters) over heavy libraries.
