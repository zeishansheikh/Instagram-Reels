"""CLI entrypoint for Reel Forge."""

from __future__ import annotations

from pathlib import Path
from typing import Optional
import typer
from typing_extensions import Annotated

from reelforge.config import check_environment, load_config
from reelforge.quotes.generator import generate_quotes
from reelforge.render.pipeline import batch_generate_reels, render_preview
from rich.console import Console
from rich.table import Table

app = typer.Typer(
    name="reelforge",
    help="Reel Forge: Automated Instagram Quote & Poetry Reel Generator.",
    add_completion=False,
)
console = Console()


@app.callback()
def main_callback() -> None:
    """Reel Forge CLI: Bulk generator for aesthetic Instagram reels."""
    pass


@app.command()
def check() -> None:
    """Validate system prerequisites (FFmpeg and API credentials)."""
    check_environment(require_gemini=True)
    typer.echo("✅ All prerequisites met: FFmpeg and GEMINI_API_KEY are configured.")


@app.command("gdrive-login")
def gdrive_login(
    credentials: Annotated[
        Path,
        typer.Option("--credentials", "-c", help="Path to OAuth client credentials.json"),
    ] = Path("credentials.json"),
    token: Annotated[
        Path,
        typer.Option("--token", "-t", help="Path to output token.json"),
    ] = Path("token.json"),
) -> None:
    """Run Google Drive OAuth desktop login flow to authorize read-only access."""
    from reelforge.backgrounds.gdrive import authenticate_gdrive

    typer.echo("🔑 Initiating Google Drive OAuth authentication flow...")
    try:
        authenticate_gdrive(credentials_file=credentials, token_file=token)
        typer.echo(f"✅ Successfully authenticated! Token saved to '{token}'.")
    except Exception as e:
        typer.echo(f"❌ Authentication failed: {e}", err=True)
        raise typer.Exit(1)


@app.command()
def quotes(
    count: Annotated[int, typer.Option("--count", "-c", help="Number of quotes to generate")] = 10,
    theme: Annotated[str, typer.Option("--theme", "-t", help="Quote theme (e.g. hope, solitude, gratitude)")] = "hope",
    lang: Annotated[str, typer.Option("--lang", "-l", help="Language code: en, roman-urdu, urdu")] = "en",
) -> None:
    """Generate, validate, deduplicate, and display quotes using Gemini (Phase 2)."""
    check_environment(require_gemini=True)
    clean_lang = lang.lower().strip()
    if clean_lang not in ("en", "roman-urdu", "roman_urdu", "urdu"):
        typer.echo(f"❌ Unsupported language '{lang}'. Choose from: en, roman-urdu, urdu", err=True)
        raise typer.Exit(1)

    typer.echo(f"✨ Generating {count} quotes for theme '{theme}' (lang: {clean_lang})...")
    generated = generate_quotes(theme=theme, lang=clean_lang, count=count)

    if not generated:
        typer.echo("⚠️ No quotes could be generated or accepted.")
        return

    typer.echo(f"\n✅ Accepted {len(generated)} quotes:\n")
    for idx, q in enumerate(generated, 1):
        typer.echo(f"[{idx}] \"{q.text}\"")
        typer.echo(f"    Mood: {q.mood} | Theme: {q.theme}")
        typer.echo(f"    Caption: {q.caption}")
        typer.echo(f"    Hashtags: {' '.join(q.hashtags)}\n")


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
    typer.echo("🎬 Rendering preview reel...")
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
    theme: Annotated[str, typer.Option("--theme", "-t", help="Quote theme (e.g. hope, solitude, gratitude)")] = "hope",
    lang: Annotated[str, typer.Option("--lang", "-l", help="Language code (en, roman-urdu, urdu)")] = "en",
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
    provider: Annotated[
        Optional[str],
        typer.Option(
            "--provider",
            "-p",
            help="Override background provider (local_folder, gdrive, pexels)",
        ),
    ] = None,
) -> None:
    """Generate finished quote reels in bulk with video, caption, and metadata packaging."""
    check_environment(require_gemini=True)
    clean_lang = lang.lower().strip()
    if clean_lang not in ("en", "roman-urdu", "roman_urdu", "urdu"):
        typer.echo(f"❌ Unsupported language '{lang}'. Choose from: en, roman-urdu, urdu", err=True)
        raise typer.Exit(1)

    typer.echo(f"🚀 Starting bulk reel generation...")
    typer.echo(f"   Count: {count} | Theme: {theme} | Language: {clean_lang} | Style: {style}")

    results = batch_generate_reels(
        count=count,
        theme=theme,
        lang=clean_lang,
        style_path=style,
        provider_name=provider,
    )

    # Print summary table
    table = Table(title="Batch Reel Generation Summary", show_lines=True)
    table.add_column("#", style="dim", width=4)
    table.add_column("Status", width=10)
    table.add_column("Mood", width=10)
    table.add_column("Quote", width=35)
    table.add_column("Output / Reason", width=42)

    ok_count = 0
    fail_count = 0

    for r in results:
        is_ok = r["status"] == "ok"
        if is_ok:
            ok_count += 1
            status_str = "[bold green]OK[/bold green]"
            detail = r["output"]
        else:
            fail_count += 1
            status_str = "[bold red]FAILED[/bold red]"
            detail = r["reason"]

        quote_text = r["quote"]
        snippet = quote_text[:32] + "..." if len(quote_text) > 32 else quote_text
        table.add_row(str(r["index"]), status_str, r["mood"], snippet, detail)

    console.print()
    console.print(table)
    console.print(f"[bold]Total:[/] {len(results)} | [bold green]Successful:[/] {ok_count} | [bold red]Failed:[/] {fail_count}\n")


@app.command()
def review(
    output_dir: Annotated[
        Path,
        typer.Option("--output-dir", "-o", help="Root output directory to inspect"),
    ] = Path("output"),
    style: Annotated[
        Path,
        typer.Option("--style", "-s", help="Style YAML preset for regenerations"),
    ] = Path("styles/degraaf.yaml"),
) -> None:
    """Interactively review generated reels: keep, discard, or regenerate."""
    from reelforge.render.review import review_all_reels

    review_all_reels(output_base=output_dir, style_path=style)


@app.command()
def clean() -> None:
    """Clear temporary render cache and cached footage."""
    typer.echo("Cleaning temporary cache directory... (Not yet implemented)")


def main() -> None:
    """Main application entrypoint."""
    app()


if __name__ == "__main__":
    main()
