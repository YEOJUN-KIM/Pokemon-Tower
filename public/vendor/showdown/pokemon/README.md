# Modern Pokémon pixel sprites

Imported unchanged from https://play.pokemonshowdown.com/sprites/ on 2026-10-09.

- `gen5` / `gen5-back`: static pixel front and back sprites.
- `gen5ani` / `gen5ani-back`: pixel animations, used independently for each available orientation. An unavailable or failed animation uses its matching static pixel sprite.
- Local files cover modern species and distinct supported battle image keys. They avoid external image-server/CORS failures during gameplay.
- File URLs, sizes and SHA256 hashes: `artifacts/reports/pixel-sprite-assets.json`.
- Inventory: `src/data/pixel-sprites.json`; regeneration: `scripts/audit-pixel-sprites.ts` and `scripts/import-pixel-sprites.ts`.

Artwork belongs to its original Pokémon and community creators. The Showdown engine's MIT license and the separate CC0 notices for `../fx` do not apply automatically to these sprites. These files are not original project artwork. Preserve this source notice; see `docs/THIRD_PARTY.md` for the project's image provenance and reuse limitations.
