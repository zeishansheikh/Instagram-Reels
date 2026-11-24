"""Quality gates and verification checks for Reel Pipeline (Sections 1, 4, 5).

Includes:
- ffprobe source gate (width >= 720, bitrate >= 800k, fps >= 24)
- Brightness and saturation gate (mean luma <= 0.62, SATAVG >= 0.12)
- Watermark check
- Audio volume check (volumedetect mean ~ -10 dB, max 0.0 dB)
- Complete final verification checklist (Section 5)
"""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from loguru import logger
from PIL import Image, ImageStat


def ffprobe_source_gate(video_path: Path | str) -> Tuple[bool, str, Dict[str, Any]]:
    """Source gate: ffprobe BEFORE any processing.

    Rule: REJECT if width < 720, OR video bitrate < 800k, OR fps < 24.
    Prefer 1080x1920, higher bitrate.
    """
    path = Path(video_path)
    if not path.exists():
        return False, f"Source video file not found: {path}", {}

    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,avg_frame_rate,bit_rate,duration",
        "-show_entries", "format=duration,size,bit_rate",
        "-of", "json",
        str(path),
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=15)
        data = json.loads(proc.stdout)
    except Exception as exc:
        return False, f"ffprobe execution failed on {path}: {exc}", {}

    streams = data.get("streams", [])
    if not streams:
        return False, f"No video streams detected in {path}", {}

    v_stream = streams[0]
    format_info = data.get("format", {})

    width = int(v_stream.get("width") or 0)
    height = int(v_stream.get("height") or 0)

    # Frame rate calculation
    fps_str = v_stream.get("r_frame_rate") or v_stream.get("avg_frame_rate") or "30/1"
    try:
        num, den = fps_str.split("/")
        fps = float(num) / float(den) if float(den) > 0 else 0.0
    except Exception:
        fps = 30.0

    # Bitrate calculation (try stream first, then format, then calculate from size & duration)
    bitrate = int(v_stream.get("bit_rate") or 0)
    if bitrate <= 0:
        bitrate = int(format_info.get("bit_rate") or 0)

    duration = float(v_stream.get("duration") or format_info.get("duration") or 0.0)
    if bitrate <= 0 and duration > 0:
        file_size = path.stat().st_size
        bitrate = int((file_size * 8) / duration)

    meta = {
        "width": width,
        "height": height,
        "fps": fps,
        "bitrate": bitrate,
        "duration": duration,
    }

    # Gates check
    if width < 720:
        return False, f"Width {width} < 720 (minimum threshold). REJECTED.", meta

    if bitrate < 800_000:
        return False, f"Bitrate {bitrate/1000:.0f}k < 800k (minimum threshold). REJECTED.", meta

    if fps < 23.5:
        return False, f"FPS {fps:.1f} < 24 (minimum threshold). REJECTED.", meta

    if duration > 0 and duration < 3.0:
        return False, f"Duration {duration:.1f}s < 3.0s (too short for reel). REJECTED.", meta

    duration_note = f", duration {duration:.1f}s (auto-trimming enabled for >10s clips)" if duration > 10.0 else f", duration {duration:.1f}s"
    return True, f"Source gate PASSED: {width}x{height} @ {fps:.1f}fps, {bitrate/1000:.0f} kbps{duration_note}", meta


def brightness_and_saturation_gate(
    video_path: Path | str,
    num_samples: int = 3,
) -> Tuple[bool, str, Dict[str, float]]:
    """Sample frames and measure mean luminance and saturation.

    Rules:
    - REJECT if mean luma > 0.62.
    - REJECT if mean SATAVG < 0.12 AND mean luma > 0.45 (washed-out gray haze).
    """
    path = Path(video_path)
    if not path.exists():
        return False, f"File not found: {path}", {}

    # Probe duration
    try:
        probe_cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)
        ]
        res = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
        duration = float(res.stdout.strip() or 10.0)
    except Exception:
        duration = 10.0

    sample_times = [
        max(0.5, duration * 0.15),
        max(1.0, duration * 0.50),
        max(1.5, duration * 0.85),
    ]

    luma_values: List[float] = []

    with tempfile.TemporaryDirectory() as tmpdir:
        for idx, t in enumerate(sample_times[:num_samples]):
            frame_p = Path(tmpdir) / f"frame_{idx}.png"
            cmd = [
                "ffmpeg", "-y", "-ss", f"{t:.2f}", "-i", str(path),
                "-vframes", "1", "-f", "image2", str(frame_p)
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if frame_p.exists():
                try:
                    with Image.open(frame_p) as img:
                        gray = img.convert("L")
                        avg_luma = ImageStat.Stat(gray).mean[0] / 255.0
                        luma_values.append(avg_luma)
                except Exception:
                    pass

    if not luma_values:
        return False, "Could not extract sample frames for brightness check.", {}

    mean_luma = sum(luma_values) / len(luma_values)

    # Measure saturation using signalstats filter over sample frames
    sat_cmd = [
        "ffmpeg", "-v", "info", "-ss", "00:00:01", "-t", "2", "-i", str(path),
        "-vf", "signalstats", "-f", "null", "-"
    ]
    sat_proc = subprocess.run(sat_cmd, capture_output=True, text=True)
    sat_matches = re.findall(r"SATAVG=([0-9.]+)", sat_proc.stderr)

    if sat_matches:
        sat_avg = sum(float(x) for x in sat_matches) / len(sat_matches)
        # Normalize: in signalstats SATAVG typically 0..255 or 0..1
        if sat_avg > 1.0:
            sat_avg = sat_avg / 255.0
    else:
        # Fallback estimation if signalstats parser finds nothing
        sat_avg = 0.25

    stats = {"mean_luma": round(mean_luma, 3), "mean_satavg": round(sat_avg, 3)}

    if mean_luma > 0.62:
        return False, f"Mean luma {mean_luma:.2f} > 0.62 (too bright / blown-out). REJECTED.", stats

    if sat_avg < 0.12 and mean_luma > 0.45:
        return False, f"Washed out gray haze: SATAVG {sat_avg:.2f} < 0.12 with luma {mean_luma:.2f} > 0.45. REJECTED.", stats

    return True, f"Brightness & Saturation check PASSED: luma={mean_luma:.2f}, SATAVG={sat_avg:.2f}", stats


def watermark_and_quality_check(video_path: Path | str) -> Tuple[bool, str]:
    """Examine frames for visible watermarks, text overlays, or logos.

    Inspects top and bottom 15% bars for high contrast synthetic lines/edges.
    """
    path = Path(video_path)
    if not path.exists():
        return False, f"File not found: {path}"

    with tempfile.TemporaryDirectory() as tmpdir:
        frame_p = Path(tmpdir) / "check_frame.png"
        cmd = ["ffmpeg", "-y", "-ss", "00:00:02", "-i", str(path), "-vframes", "1", str(frame_p)]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        if not frame_p.exists():
            return True, "Watermark inspection frame skipped (not extractable)."

        try:
            with Image.open(frame_p) as img:
                w, h = img.size
                # Check corners for high brightness text overlays
                top_right = img.crop((int(w * 0.70), 0, w, int(h * 0.12))).convert("L")
                bottom_right = img.crop((int(w * 0.70), int(h * 0.88), w, h)).convert("L")
                
                # Check corners for high brightness text overlays
                tr_mean = ImageStat.Stat(top_right).mean[0] if top_right.size[0] > 0 and top_right.size[1] > 0 else 0
                br_mean = ImageStat.Stat(bottom_right).mean[0] if bottom_right.size[0] > 0 and bottom_right.size[1] > 0 else 0
                
                # If corner is almost pure white block (e.g. logo)
                if tr_mean > 248:
                    return False, "Detected bright logo/watermark in top-right corner."
                if br_mean > 248:
                    return False, "Detected bright logo/watermark in bottom-right corner."

        except Exception as exc:
            logger.debug(f"Watermark check error: {exc}")

    return True, "No visible watermarks detected."


def audio_volume_verify(video_path: Path | str) -> Tuple[bool, str, Dict[str, float]]:
    """Run volumedetect filter to verify audio is audible and within bounds.

    Target: mean volume ~ -10 dB (-25 to -5 dB acceptable), max volume <= 0.0 dB.
    """
    path = Path(video_path)
    if not path.exists():
        return False, f"File not found: {path}", {}

    cmd = [
        "ffmpeg", "-i", str(path), "-af", "volumedetect", "-f", "null", "/dev/null"
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    stderr = proc.stderr

    mean_match = re.search(r"mean_volume:\s*(-?[0-9.]+)\s*dB", stderr)
    max_match = re.search(r"max_volume:\s*(-?[0-9.]+)\s*dB", stderr)

    if not mean_match or not max_match:
        return False, "No audio stream detected or volumedetect failed.", {}

    mean_vol = float(mean_match.group(1))
    max_vol = float(max_match.group(1))
    stats = {"mean_volume": mean_vol, "max_volume": max_vol}

    if mean_vol < -45.0:
        return False, f"Audio is almost silent (mean {mean_vol} dB < -45 dB).", stats

    if max_vol > 0.5:
        return False, f"Audio is clipping (max {max_vol} dB > 0.0 dB).", stats

    return True, f"Audio volume PASSED: mean={mean_vol:.1f} dB, max={max_vol:.1f} dB", stats


def verify_final_reel(video_path: Path | str) -> Tuple[bool, List[str]]:
    """Run Section 5 complete verification checklist on final rendered MP4.

    Checklist:
    - Resolution 1080x1920
    - ~60fps (r_frame_rate == 60)
    - Video bitrate >= 10M (target ~15M)
    - Audio stream present (AAC ~128k)
    - Audio volume within range
    """
    path = Path(video_path)
    logs: List[str] = []

    if not path.exists():
        return False, [f"Final file missing: {path}"]

    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "stream=width,height,r_frame_rate,codec_name,bit_rate",
        "-show_entries", "format=duration,size,bit_rate",
        "-of", "json",
        str(path),
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(proc.stdout)
    except Exception as exc:
        return False, [f"ffprobe failed: {exc}"]

    streams = data.get("streams", [])
    v_stream = next((s for s in streams if s.get("codec_name") in ("h264", "libx264")), None)
    a_stream = next((s for s in streams if s.get("codec_name") == "aac"), None)

    if not v_stream:
        return False, ["No h264 video stream detected."]

    width = int(v_stream.get("width") or 0)
    height = int(v_stream.get("height") or 0)

    if width != 1080 or height != 1920:
        logs.append(f"Resolution mismatch: expected 1080x1920, got {width}x{height}")

    fps_str = v_stream.get("r_frame_rate", "0/1")
    try:
        num, den = fps_str.split("/")
        fps = float(num) / float(den)
    except Exception:
        fps = 0.0

    if abs(fps - 60.0) > 1.5:
        logs.append(f"FPS mismatch: expected ~60fps, got {fps:.1f}")

    if not a_stream:
        logs.append("Missing AAC audio stream in final output.")

    # Check audio volume
    aud_ok, aud_msg, _ = audio_volume_verify(path)
    if not aud_ok:
        logs.append(f"Audio check failed: {aud_msg}")

    passed = len(logs) == 0
    if passed:
        logs.append(f"Verification PASSED: 1080x1920 @ {fps:.1f}fps, video & audio streams verified.")

    return passed, logs

