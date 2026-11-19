"""CLI entrypoint for Reel Forge."""

from __future__ import annotations

from pathlib import Path
import typer
from typing_extensions import Annotated

from reelforge.config import check_environment, load_config
from reelforge.render.pipeline import render_preview

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
def preview(
    video: Annotated[
        Path,
        typer.Option(
            "--video",
            "-v",
            help="Path to input background video (any resolution/aspect)",
            exists=True,
            file_okay=True,
            dir_okay=False,
            readable=True,
        ),
    ],
    quote: Annotated[
        str,
        typer.Option(
            "--quote",
            "-q",
            help="Quote text to overlay",
        ),
    ],
    style: Annotated[
        Path,
        typer.Option(
            "--style",
            "-s",
            help="Path to style YAML file",
            exists=True,
            file_okay=True,
            dir_okay=False,
            readable=True,
        ),
    ] = Path("styles/degraaf.yaml"),
    output: Annotated[
        Path,
        typer.Option(
            "--output",
            "-o",
            help="Destination path for preview video",
        ),
    ] = Path("output/preview/preview.mp4"),
) -> None:
    """Render a single preview reel from an input clip, quote text, and style."""
    check_environment(require_gemini=False)
    typer.echo(f"🎬 Rendering preview reel...")
    typer.echo(f"   Video: {video}")
    typer.echo(f"   Quote: \"{quote}\"")
    typer.echo(f"   Style: {style}")

    rendered_path = render_preview(
        video_path=video,
        quote=quote,
        style_path=style,
        output_path=output,
    )
    typer.echo(f"✨ Successfully rendered preview to: {rendered_path}")


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
def clean() -> None:
    """Clear temporary render cache and cached footage."""
    typer.echo("Cleaning temporary cache directory... (Not yet implemented)")


def main() -> None:
    """Main application entrypoint."""
    app()


if __name__ == "__main__":
    main()
