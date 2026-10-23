# Pokémon IP 원본

향후 pokeapi/·showdown/·pokerogue/·pokesprite/·cries/·move-vfx/별 원본을 둘 수 있다. 현재 파일을 복제하지 않는다. 제공원의 엔진 코드 라이선스와 그림·음원 권리는 별개이며, 제공원 이름만으로 재배포 허용을 추정하지 않는다. 이 README 외의 원본은 Git 제외다. 공식 출처는 [기존 manifest](../../docs/assets/README.md)를 사용한다.

PokéRogue 독립 복원은 `pokerogue/source/`를 단일 pinned 원본·재사용 캐시로 사용한다. .data/cache와 동기화하지 않는다. `pnpm assets:pokerogue`로 기존 runtime URL을 유지하며 생성하고 `--offline`으로 캐시만 재사용한다. 원본과 임시 work는 Git 제외이고 복원 recipe·해시·필수 metadata snapshot은 scripts/assets/pokerogue 및 docs에 보존한다. [복원 절차와 요구 사항](../../docs/assets/POKEROGUE_RESTORE.md)을 따른다.

혼합 자산은 `mixed/<provider-group>/source/`에 source cache를 둔다. [소유권과 복원 명령](../../docs/assets/MIXED_RUNTIME_ASSETS.md)을 따르며 자체 제작/사용자 제공/metadata 파일을 cache에서 재생성하지 않는다.
