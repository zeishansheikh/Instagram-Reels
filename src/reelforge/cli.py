"""CLI entrypoint for Reel Forge."""

from __future__ import annotations

import typer
from typing_extensions import Annotated

from reelforge.config import check_environment, load_config

app = typer.Typer(
    name="reelforge",
    help="Reel Forge: Automated Instagram Quote & Poetry Reel Generator.",
    add_completion=False,
)


@app.callback()
def main_callback() -> None:
    """Reel Forge CLI: Bulk generator for aesthetic Instagram reels."""
    pass


@app.command()
def check() -> None:
    """Validate system prerequisites (FFmpeg and API credentials)."""
    check_environment(require_gemini=True)
    typer.echo("✅ All prerequisites met: FFmpeg and GEMINI_API_KEY are configured.")


@app.command()
def generate(
    count: Annotated[int, typer.Option("--count", "-c", help="Number of reels to generate")] = 10,
    theme: Annotated[str, typer.Option("--theme", "-t", help="Quote theme (e.g. reflective, sad)")] = "reflective",
    lang: Annotated[str, typer.Option("--lang", "-l", help="Language code (en, ur, roman_ur)")] = "en",
    style: Annotated[str, typer.Option("--style", "-s", help="Style preset name")] = "default",
) -> None:
    """Generate finished quote reels in bulk (Phase 4)."""
    check_environment(require_gemini=True)
    config = load_config()
    typer.echo(f"Starting batch generation: count={count}, theme={theme}, lang={lang}, style={style} (Not yet implemented)")


@app.command()
def preview(
    quote: Annotated[str, typer.Option("--quote", "-q", help="Quote text for preview reel")] = "Still waters reflect the heavens.",
    style: Annotated[str, typer.Option("--style", "-s", help="Style preset name")] = "default",
) -> None:
    """Render a single test reel for visual review."""
    check_environment(require_gemini=False)
    typer.echo(f"Rendering preview reel: quote='{quote}', style={style} (Not yet implemented)")


@app.command()
def clean() -> None:
    """Clear temporary render cache and cached footage."""
    typer.echo("Cleaning temporary cache directory... (Not yet implemented)")


def main() -> None:
    """Main application entrypoint."""
    app()


if __name__ == "__main__":
    main()

