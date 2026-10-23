# Pokémon Showdown 연출 원본 (연동 전 검토용)

출처: https://github.com/smogon/pokemon-showdown-client

고정 버전: `c0f6bfc707a5e3bba4da3785e9cb06c8ae04f8d9`

2026-10-04 다운로드. 원본 파일의 저자/라이선스 고지는 그대로 보존했다.

- `battle-animations.ts`: 헤더에 배틀 재생/연출 엔진 자체 MIT 명시. 해당 파일에는 다수 효과 정의의 CC0 및 이미지별 예외도 명시되어 있다.
- `battle-animations-moves.ts`: 헤더 `@license CC0-1.0`. 화염방사, 파도타기, 냉동빔, 10만볼트, 베어가르기 등 기술별 기존 연출 구현.
- `../../../public/vendor/showdown/fx`: 해당 파일의 이미지 이용 고지에 따라 CC0 대상으로 확인한 효과 이미지 22개. icicle/lightning/bone 및 rocks/rock1/rock2는 별도 라이선스 또는 고지 불명확성을 이유로 이번 수집 대상에서 제외했다.

게임에 아직 연결하지 않았다. 이 원본은 Next.js/TypeScript 빌드 입력 범위 밖이다. 전체 클라이언트의 AGPL 라이선스를 이 파일별 예외와 혼동하지 않는다. Pokémon 캐릭터 스프라이트나 공식 음원에 이 라이선스가 확장되는 것으로 간주하지 않는다.

파일 무결성/출처 기록: `../../../docs/assets/manifests/resource-manifest.json`.
