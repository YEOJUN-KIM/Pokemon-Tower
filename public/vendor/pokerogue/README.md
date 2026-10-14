# Additional pixel animations

These assets supplement Pokémon views that previously displayed static artwork.
Existing working animations retain their original paths.

Sources:

- [PokéRogue assets](https://github.com/pagefaultgames/pokerogue-assets/tree/325c7de68e6c323e12243271ea510c6b0e1b992e), pinned commit `325c7de68e6c323e12243271ea510c6b0e1b992e`.
- [Pokémon Showdown pixel sprites](https://play.pokemonshowdown.com/sprites/gen5ani/) and the matching back/shiny directories.

PokéRogue texture atlases were reassembled in filename order, restoring trimmed
frame offsets and transparency. They are converted to looping GIFs with a shared
palette, using source frame durations when supplied and 100 ms otherwise. Each
GIF includes multiple distinct frames; the matching PNG is its first frame.
Showdown GIFs are copied without modification, with first-frame PNG fallbacks.

Original source URLs, frame counts, output hashes and transformations are recorded
in `sources.json`. Original notices are preserved as `source-README.md`,
`source-REUSE.toml`, `source-images-REUSE.toml` and `source-LICENSES-*.txt`.
Artist attribution is retained in `CREDITS.md` and the source REUSE annotations.
These images remain subject to the original Pokémon rights and the source asset
notices; they are not covered by the game engine's source-code license.

Reproduce with `node --import tsx scripts/import-additional-animations.ts`
(Python with Pillow required for atlas conversion). Download caches stay in
`.data/cache/import/animation-reaudit/`. The importer retains already connected
animations and checks only remaining static views, plus missing Showdown files.
