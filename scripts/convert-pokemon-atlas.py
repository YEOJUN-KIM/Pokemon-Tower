"""Compatibility entry point for the historical combined animation importer."""
import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).parent / "assets" / "pokerogue" / "convert.py"), run_name="__main__")
