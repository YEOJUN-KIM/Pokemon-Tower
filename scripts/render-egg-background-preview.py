"""Compose the six actual game cards captured by egg-result-presentation.spec.ts."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
source = root / 'test-results/egg-palette-frames'
output = root / 'artifacts/qa/previews/egg-results'
output.mkdir(parents=True, exist_ok=True)
regions = json.loads((source / 'regions.json').read_text())
labels = ['준전설 · 하늘색', '울트라비스트 · 보라색', '패러독스 · 민트색', '초전설 · 샴페인 골드', '환상 · 연분홍', '이로치 · 선명한 금색']
font_path = Path('C:/Windows/Fonts/malgun.ttf')
font = ImageFont.truetype(str(font_path), 17)
title_font = ImageFont.truetype(str(font_path), 23)
tile_width = round(max(region['width'] for region in regions))
tile_height = round(max(region['height'] for region in regions))
padding, gap, header, label_height = 20, 16, 62, 34
size = (padding * 2 + tile_width * 3 + gap * 2, padding * 2 + header + (tile_height + label_height) * 2 + gap)
frames = []
legendary_frames = []
for path in sorted(source.glob('frame-*.png')):
    screenshot = Image.open(path).convert('RGB')
    frame = Image.new('RGB', size, '#edf1eb')
    draw = ImageDraw.Draw(frame)
    draw.text((padding, padding), '부화 결과 · 배경색과 이펙트 비교', font=title_font, fill='#273c41')
    for index, region in enumerate(regions):
        x = padding + (index % 3) * (tile_width + gap)
        y = padding + header + (index // 3) * (tile_height + label_height + gap)
        draw.text((x + 5, y), labels[index], font=font, fill='#273c41')
        crop = screenshot.crop((round(region['x']), round(region['y']), round(region['x'] + region['width']), round(region['y'] + region['height'])))
        frame.paste(crop, (x, y + label_height))
    frames.append(frame)
    region = regions[3]
    closeup = Image.new('RGB', (tile_width + padding * 2, tile_height + 70), '#edf1eb')
    closeup_draw = ImageDraw.Draw(closeup)
    closeup_draw.text((padding, 12), '초전설 · 백금빛 광채와 반짝임', font=font, fill='#273c41')
    closeup.paste(screenshot.crop((round(region['x']), round(region['y']), round(region['x'] + region['width']), round(region['y'] + region['height']))), (padding, 50))
    legendary_frames.append(closeup)
if not frames:
    raise RuntimeError('Run the browser presentation test to capture frames first.')
frames[len(frames)//2].save(output / 'background-colors.png')
palette = frames[0].quantize(colors=256, method=Image.Quantize.MEDIANCUT)
indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
indexed[0].save(output / 'background-effects.gif', save_all=True, append_images=indexed[1:], duration=160, loop=0, optimize=False, disposal=2)
legendary_indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in legendary_frames]
legendary_indexed[0].save(output / 'legendary-effects.gif', save_all=True, append_images=legendary_indexed[1:], duration=160, loop=0, optimize=False, disposal=2)
print(json.dumps({'frames': len(frames), 'size': size, 'gif': str(output / 'background-effects.gif'), 'png': str(output / 'background-colors.png')}, ensure_ascii=False))
