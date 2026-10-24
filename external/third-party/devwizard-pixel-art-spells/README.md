# Pixel Art Spells · 선정 원본 8종

**현재 상태: Reviewed / Rejected for primary battle VFX (2026-10-24).** 실제 데스크톱 Pokémon 배틀 화면에서 디테일 밀도·명암·확대 픽셀 크기가 기존 스프라이트와 어울리지 않는 것으로 확인했다. 라이선스와 파일 관리 구조는 적합하며, 구현 오류가 아닌 시각 스타일 판단에 따른 미채택이다. 유효한 화면 검증 결과로 보존한다. 대표 8기술의 시험 연결과 전용 렌더러는 제거하고 기존 VFX로 복원했다. 원본·카탈로그는 외부 후보/참고 자료로만 유지한다.

DevWizard의 [원본 배포 페이지](https://opengameart.org/content/pixel-art-spells)에서 CC0와 선택적 크레딧 조건을 확인했다. [라이선스 기록](LICENSE.txt), 원본 ZIP·파일 해시·전체 목록·8종 선정 설정은 [sources.json](sources.json)이 기준이다. 상세 조사와 사용/보류 판단은 [기술 연출 문서](../../../docs/engineering/MOVE_EFFECTS.md#pixel-art-spells--projectile-후보-8종)를 따른다.

- `pack/PNG Files/`: 원본 파일명을 유지한 PNG 8개. 변환·리컬러하지 않았다.
- `pack/Asprite Files/`: 위 PNG에 대응하는 원본 `.ase` 7개. 폴더의 철자도 원본 그대로다. Arcane Bolt의 ASE는 ZIP에 없다.
- 원본 전체 ZIP은 조사용으로만 확보했다. 미선정 14개 PNG와 14개 ASE, 전체 ZIP을 이 원본 폴더나 runtime에 추가하지 않는다.
- 웹 제공 위치는 기존 정책의 `public/assets/external-generated/devwizard-pixel-art-spells/`다. 생성 사본 8개는 Git 제외이며 이 폴더의 추적 원본에서 오프라인 재현한다.

저장소 루트에서:

```powershell
node scripts/assets/pixel-art-spells/runtime.mjs prepare
node scripts/assets/pixel-art-spells/runtime.mjs verify
```

prepare는 참고 사본이 필요할 때만 사용하는 오프라인 명령이다. 해시·PNG 크기·ASE 프레임 정보를 먼저 검증한 뒤 선정 PNG만 원본 bytes 그대로 복사한다. 기존 사본이 다르면 덮어쓰지 않고 오류를 반환한다. 주력 배틀 VFX 미채택 팩이므로 전체 필수 자산 준비 목록에는 추가하지 않았다. 사본이 있더라도 게임은 이 팩을 자동 로드하거나 기술에 연결하지 않는다.
