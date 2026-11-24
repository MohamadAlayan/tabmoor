"""Package extension/ into dist/tabmoor-<version>.xpi (a zip with manifest.json at the root).

Usage:  python scripts/build.py
"""

import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "extension"
DIST = ROOT / "dist"
SKIP = {".DS_Store", "Thumbs.db"}


def main() -> None:
    manifest = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    DIST.mkdir(exist_ok=True)
    target = DIST / f"tabmoor-{version}.xpi"

    files = sorted(p for p in SOURCE.rglob("*") if p.is_file() and p.name not in SKIP)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as xpi:
        for path in files:
            # Firefox needs forward slashes inside the archive, on every OS.
            xpi.write(path, path.relative_to(SOURCE).as_posix())

    print(f"Built {target.relative_to(ROOT)} ({len(files)} files, {target.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
