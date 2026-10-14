"""Reassemble attributed texture atlases into local transparent GIFs. Requires Pillow."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image
import shutil

jobs_path = Path(sys.argv[1])
jobs = json.loads(jobs_path.read_text(encoding="utf-8"))
for job in jobs:
    if "sourceGif" in job:
        with Image.open(job["sourceGif"]) as original:
            if getattr(original, "n_frames", 1) < 2:
                job["rejected"] = "single frame GIF"
                continue
            images = []
            for index in range(original.n_frames):
                original.seek(index)
                images.append(original.convert("RGBA").tobytes())
            if len(set(images)) < 2:
                job["rejected"] = "identical frames"
                continue
            job["frames"] = original.n_frames
            job["uniqueFrames"] = len(set(images))
            job["size"] = list(original.size)
            original.seek(0)
            Path(job["png"]).parent.mkdir(parents=True, exist_ok=True)
            original.convert("RGBA").save(job["png"])
        Path(job["gif"]).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(job["sourceGif"], job["gif"])
        job["sha256"] = hashlib.sha256(Path(job["gif"]).read_bytes()).hexdigest()
        continue
    atlas = json.loads(Path(job["atlas"]).read_text(encoding="utf-8"))
    frames = []
    textures = atlas.get("textures")
    if textures is None:
        entries = atlas["frames"]
        if isinstance(entries, dict):
            entries = [dict(filename=name, **entry) for name, entry in entries.items()]
        textures = [dict(image=atlas.get("meta", {}).get("image", Path(job["atlas"]).with_suffix(".png").name), frames=entries)]
    for texture in textures:
        sheet = Image.open(Path(job["atlas"]).parent / texture["image"]).convert("RGBA")
        for entry in texture["frames"]:
            rect = entry["frame"]
            tile = sheet.crop((rect["x"], rect["y"], rect["x"] + rect["w"], rect["y"] + rect["h"]))
            if entry["rotated"]:
                tile = tile.transpose(Image.Transpose.ROTATE_90)
            size, pos = entry["sourceSize"], entry["spriteSourceSize"]
            image = Image.new("RGBA", (size["w"], size["h"]))
            image.paste(tile, (pos["x"], pos["y"]))
            frames.append((entry["filename"], image, entry.get("duration", 100)))
    frames.sort(key=lambda item: item[0])
    # A repeated PNG is not an animation, even if its atlas has many frame names.
    unique = {hashlib.sha256(frame.tobytes()).hexdigest() for _, frame, _ in frames}
    if len(unique) < 2:
        job["rejected"] = "identical frames"
        continue
    width = max(frame.width for _, frame, _ in frames)
    height = max(frame.height for _, frame, _ in frames)
    # One palette for the whole loop prevents colors flickering between frames.
    contact = Image.new("RGB", (width, height * len(frames)))
    for index, (_, frame, _) in enumerate(frames):
        contact.paste(frame.convert("RGB"), (0, height * index))
    palette = contact.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    images = []
    for _, frame, _ in frames:
        canvas = Image.new("RGBA", (width, height))
        canvas.paste(frame, (0, 0))
        indexed = canvas.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE)
        indexed.paste(255, mask=canvas.getchannel("A").point(lambda alpha: 255 if alpha < 128 else 0))
        indexed.info["transparency"] = 255
        images.append(indexed)
    output = Path(job["gif"])
    output.parent.mkdir(parents=True, exist_ok=True)
    images[0].save(output, save_all=True, append_images=images[1:], duration=[duration for _, _, duration in frames],
                   loop=0, transparency=255, disposal=2, optimize=False)
    frames[0][1].save(job["png"])
    with Image.open(output) as result:
        assert result.n_frames > 1, output
        job["frames"] = result.n_frames
        job["uniqueFrames"] = len(unique)
        job["size"] = [result.width, result.height]
    job["sha256"] = hashlib.sha256(output.read_bytes()).hexdigest()
jobs_path.write_text(json.dumps(jobs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"converted": sum("frames" in job for job in jobs), "checked": len(jobs)}))
