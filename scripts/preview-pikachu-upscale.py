"""Non-destructive Scale4x preview of the game's original Pikachu GIF.

Scale2x rules: https://www.scale2x.it/algorithm
Preview assets only; does not change game sprite sources.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageSequence

ROOT = Path(__file__).resolve().parents[1] / 'artifacts/qa/previews/pikachu-upscale'


def scale2x(image):
    image = image.convert('RGBA')
    pixels = image.load()
    width, height = image.size
    result = Image.new('RGBA', (width * 2, height * 2))
    output = result.load()
    for y in range(height):
        for x in range(width):
            center = pixels[x, y]
            above = pixels[x, max(0, y - 1)]
            below = pixels[x, min(height - 1, y + 1)]
            left = pixels[max(0, x - 1), y]
            right = pixels[min(width - 1, x + 1), y]
            values = [center] * 4
            if above != below and left != right:
                values = [left if left == above else center,
                          right if above == right else center,
                          left if left == below else center,
                          right if below == right else center]
            for i, value in enumerate(values):
                output[x * 2 + i % 2, y * 2 + i // 2] = value
    return result


def main():
    source = Image.open(ROOT / 'original.gif')
    originals, durations, enlarged = [], [], []
    for frame in ImageSequence.Iterator(source):
        original = frame.convert('RGBA')
        # Transparent pixels have no visible color: normalize them before comparisons.
        original.putdata([pixel if pixel[3] else (0, 0, 0, 0) for pixel in original.get_flattened_data()])
        upscale = scale2x(scale2x(original))
        originals.append(original)
        durations.append(frame.info.get('duration', 100))
        enlarged.append(upscale)
        assert set(upscale.get_flattened_data()) <= set(original.get_flattened_data()), 'Invented palette color'
    originals[0].save(ROOT / 'original-frame.png')
    enlarged[0].save(ROOT / 'scale4x-frame.png')

    # One exact shared palette avoids per-frame quantization and color flicker.
    colors = sorted({pixel[:3] for image in originals for pixel in image.get_flattened_data() if pixel[3]})
    assert len(colors) <= 255
    lookup = {color: index for index, color in enumerate(colors)}
    palette = [channel for color in colors for channel in color]
    palette += [0] * (768 - len(palette))
    frames = []
    for image in enlarged:
        indexed = Image.new('P', image.size)
        indexed.putpalette(palette)
        indexed.putdata([lookup[pixel[:3]] if pixel[3] else 255 for pixel in image.get_flattened_data()])
        frames.append(indexed)
    frames[0].save(ROOT / 'scale4x-animation.gif', save_all=True, append_images=frames[1:],
                   duration=durations, loop=source.info.get('loop', 0), transparency=255,
                   disposal=2, optimize=False)
    check = Image.open(ROOT / 'scale4x-animation.gif')
    assert check.size == (source.width * 4, source.height * 4)
    def timeline(images, times):
        runs = []
        for image, duration in zip(images, times):
            pixels = tuple(pixel if pixel[3] else (0, 0, 0, 0) for pixel in image.convert('RGBA').get_flattened_data())
            if runs and runs[-1][0] == pixels:
                runs[-1] = (pixels, runs[-1][1] + duration)
            else:
                runs.append((pixels, duration))
        return runs
    decoded = [frame.convert('RGBA') for frame in ImageSequence.Iterator(check)]
    saved_durations = [frame.info.get('duration', 100) for frame in ImageSequence.Iterator(check)]
    assert timeline(enlarged, durations) == timeline(decoded, saved_durations), 'Animation or timing changed'

    font_path = 'C:/Windows/Fonts/malgun.ttf'
    title = ImageFont.truetype(font_path, 24)
    label = ImageFont.truetype(font_path, 17)
    small = ImageFont.truetype(font_path, 14)
    sheet = Image.new('RGB', (840, 380), '#303c43')
    draw = ImageDraw.Draw(sheet)
    draw.text((24, 18), '피카츄 확대 방식 비교 · 모두 같은 표시 크기', font=title, fill='#f3f4ee')
    variants = [('단순 확대', '원본 픽셀을 그대로 4배', originals[0].resize(enlarged[0].size, Image.Resampling.NEAREST)),
                ('부드러운 확대', '보간으로 경계를 부드럽게', originals[0].resize(enlarged[0].size, Image.Resampling.BILINEAR)),
                ('Scale4x 처리', '주변 픽셀로 계단형 경계 정리', enlarged[0])]
    for index, (name, description, image) in enumerate(variants):
        x = 20 + index * 274
        draw.rounded_rectangle((x, 68, x + 254, 330), radius=10, fill='#f3f4ee')
        draw.text((x + 16, 80), name, font=label, fill='#304d43')
        sheet.paste(image, (x + (254 - image.width) // 2, 118), image)
        draw.text((x + 10, 309), description, font=small, fill='#4c645a')
    draw.text((24, 348), f'원본 {source.width}×{source.height} → {check.width}×{check.height} · 원본 색상/동작 유지 · 게임 미적용', font=small, fill='#d5e1dc')
    sheet.save(ROOT / 'comparison.png')
    (ROOT / 'README.md').write_text(
        '# 피카츄 확대 확인용 샘플\n\n'
        '원본: 게임에서 사용하는 PokéAPI 5세대 피카츄 GIF.\n'
        '출처: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif\n\n'
        '방식: Scale2x를 두 번 적용한 Scale4x. AI 이미지 생성 없이 원본 픽셀 이웃과 색상으로 처리한다.\n'
        '알고리즘: https://www.scale2x.it/algorithm\n\n'
        f'원본 {source.width}×{source.height}, 처리 {check.width}×{check.height}, {len(originals)}프레임. '
        f'출력 GIF {check.n_frames}프레임(연속 중복 프레임 병합). 동작·재생 시간·원본 색상 보존 검증 완료. 원본에 없는 세부 묘사를 복원하지 않는다.\n\n'
        '`comparison.png`: 같은 표시 크기로 단순 확대/보간 확대/Scale4x 비교.\n'
        '`scale4x-frame.png`: 투명 PNG. `scale4x-animation.gif`: 투명 GIF. 게임에는 적용하지 않았다.\n', encoding='utf-8')
    print(f'Created {source.size} -> {check.size}, {len(originals)} frames; palette and timing preserved')


if __name__ == '__main__':
    main()
