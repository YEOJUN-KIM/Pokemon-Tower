# TM disc artwork

The 18 type-specific PNG files were cropped from the user-supplied 6×3 sheet.
Each file is a transparent 256×256 crop with unchanged source pixels.
No resizing, recoloring or generated artwork was used.
URLs use `/assets/items/tm/<type>.png` and are managed by `src/web/tm-icon.tsx`.
Missing files display the existing type symbol instead of a broken image.

Required files:

```text
normal.png
fire.png
water.png
electric.png
grass.png
ice.png
fighting.png
poison.png
ground.png
flying.png
psychic.png
bug.png
rock.png
ghost.png
dragon.png
dark.png
steel.png
fairy.png
```

Use transparent PNGs with consistent padding. List icons are 28×28 CSS pixels;
detail icons are 64×64. Both use pixelated rendering.
