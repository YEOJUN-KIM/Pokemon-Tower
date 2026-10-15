"""Encode the actual browser frames from e2e/run-event-preview.spec.ts."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'test-results/run-event-preview'
output = root / 'artifacts/qa/previews/events'
output.mkdir(parents=True, exist_ok=True)
manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
frames = [Image.open(source / f'frame-{n:03}.png').convert('RGB') for n in range(manifest['frames'])]
# Build one palette across both the closed chest and the gold reward effect.
samples = Image.new('RGB', (frames[0].width, frames[0].height * 3))
for row, index in enumerate((0, len(frames) // 2, len(frames) - 1)):
    samples.paste(frames[index], (0, row * frames[0].height))
palette = samples.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
durations = [manifest['durationMs']] * len(indexed)
durations[-1] = 1400
target = output / 'chest-event.gif'
indexed[0].save(target, save_all=True, append_images=indexed[1:], duration=durations, loop=0, optimize=True, disposal=1)
with Image.open(target) as check:
    assert check.is_animated and check.n_frames > 10
    print(json.dumps({'file': str(target), 'frames': check.n_frames, 'size': check.size, 'bytes': target.stat().st_size, 'reward': manifest['reward']}, ensure_ascii=False))
