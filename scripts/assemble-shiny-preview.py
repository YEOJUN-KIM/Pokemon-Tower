"""Assemble actual Playwright screenshots; no generated or replaced sprites."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'artifacts/qa/previews/shiny-entry'
paths = sorted((root / 'frames-sendout').glob('*.png'))
assert len(paths) == 22, 'Run the shiny entry browser capture first.'
frames = [Image.open(path).convert('RGB') for path in paths]
target = root / 'shiny-entry.gif'
frames[0].save(target, save_all=True, append_images=frames[1:],
               duration=[160] + [80] * 20 + [600], loop=0, disposal=2)
with Image.open(target) as preview:
    assert preview.n_frames > 1
    assert preview.size == frames[0].size
print(str(target))
