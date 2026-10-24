# 폴더와 파일 관리

| 폴더 | 역할·보관 기준 |
|---|---|
| `src/` | 실제 게임 코드와 런타임 데이터 |
| `public/` | 게임이 제공하는 이미지·음악·글꼴과 해당 출처 |
| `scripts/` | 재사용하는 가져오기·생성·실험·검증·배포 도구 |
| `scripts/data/` | 생성기에 필요한 입력 데이터. 결과물과 구분 |
| `tests/`, `e2e/` | 코드·브라우저 자동 테스트 |
| `docs/` | Git 추적하는 현재 설계·정책·확정 결정·배포 안내·장기 출처 기록 |
| `artifacts/experiments/` | AI·밸런스·샘플별 실험 보고서와 입력/결과/manifest |
| `artifacts/reports/` | Git 제외 자동 보고서·NPC 리뷰·일회성 분석. 공식 정책은 docs로 승격 |
| `artifacts/qa/` | 문서나 재검증에서 실제 사용하는 화면·자산 검사 자료 |
| `artifacts/temporary/` | 일회성 검증 결과. 해결 후 삭제 |
| `%LOCALAPPDATA%/PokemonTower/` | Windows 사용자 설치·저장·로그. 프로젝트 폴더 밖이며 정리 대상에서 제외 |
| `.data/` | 실제 로컬 저장·운영 설정·수동 DB 백업 |
| `.data/backups/` | 과거 실제 DB 스냅샷과 개인 검사 기록. 테스트 출력과 구분하여 보존 |
| `.data/transfers/` | 받은 개인 저장 묶음·manifest·검사 결과. 실행 중인 DB와 분리 |
| `.data/cache/` | 재생성 가능한 가져오기 캐시 |
| `.next/`, `.pnpm-store/`, `node_modules/` | 실행·빌드 캐시와 의존성. 사용자 문서를 넣지 않음 |
| `dist/` | 배포 명령이 생성하는 배포 묶음. 오래된 묶음은 제거 가능 |
| `vendor/` | 실제 사용하는 외부 원본·참고 코드·라이선스 |

## 로컬 검증 산출물의 보관

- `.local-backups/`: clean clone·자산 복원·EXE 설치를 확인한 임시 사본은 검증 완료 후 제거합니다. 실제 저장 백업과 혼동하지 않으며 개인 DB·고유 원자료 여부를 먼저 확인합니다. 코드 이력은 Git으로 관리합니다.
- `artifacts/`: 작은 검증 결과·필요한 보고서는 남기되 반복 생성한 installed package, 압축 해제본, 테스트 DB, 구형 검증 사본은 제거할 수 있습니다. 고정 실험 입력이나 실제 계정 백업은 자동 삭제하지 않습니다.
- `dist/`: 현재 공개 버전의 배포 폴더·ZIP·SHA256을 한 벌만 보관합니다. 배포 폴더는 package:verify/test의 입력, ZIP은 전달용이므로 용도가 다릅니다. 실패한 incomplete·구버전·중간 QA 묶음은 검증 후 제거합니다.

정기 백업은 미설정이며 실제 DB는 [저장과 백업](../operations/BACKUPS.md)을 따릅니다. `%LOCALAPPDATA%/PokemonTower`와 실제 개발 `.data`는 위 정리와 별개입니다. 정리 도구는 junction을 따라 외부 원본이나 공유 의존성을 지우지 않아야 합니다.

## 작업을 마칠 때

1. 새 clone에서 필요한 고정 입력은 `scripts/data/`·`tests/fixtures/`·공식 출처 manifest에 둡니다. 과거 실험 원자료만 로컬 artifacts에 둡니다.
2. 재사용할 도구는 `scripts/`, 테스트 코드는 `tests/`·`e2e/`에 둡니다.
3. 완료된 문제의 일회성 캡처·확인 코드·폐기한 미리보기는 삭제합니다. QA 자료는 문서·재검증에서 사용하는 것만 보관합니다.
4. 실제 DB·환경 설정·출처·라이선스와 코드/테스트 입력은 생성물 정리 대상에 포함하지 않습니다.
5. `pnpm check:workspace`로 문서 링크·루트 문서 배치·스크립트 경로·DB/AI 기준·보고서 생성기를 검사합니다. `pnpm clean:temp`는 알려진 테스트/임시 출력만 제거합니다.

파일 이동 시 Markdown 링크·스크립트 출력·테스트 입력·manifest 경로를 함께 갱신합니다. 과거 manifest의 소스 해시는 당시 측정 버전의 기록이며 경로 변경 후 현재 소스 해시로 바꾸어 새 실험처럼 보이게 하지 않습니다. 이동 기록 (로컬 전용: `artifacts/reports/history/WORKSPACE_RELOCATION-2026-10-14.json`)은 개발 검사 용도입니다.


구버전 코드/배포 묶음과 일회성 확인 스크립트는 Git 이력으로 대체합니다. 현재 NPC export와 공용 Raid 시뮬레이터를 사용하며 단계별 옛 bootstrap·Raid 튜닝 전용 명령은 유지하지 않습니다. 기능 테스트와 저장 재생용 버전 코드는 보존하고, 과거 특정 변경에서 파일이 한 바이트도 안 바뀌었는지만 검사하는 일회성 보존 검사는 지속 회귀 검사에서 제거합니다.

Git에 있던 JSON/CSV를 이동할 때는 새 위치의 .gitignore 예외도 확인합니다. 대용량 로컬 원자료를 함께 올리는 넓은 예외를 추가하지 않습니다. docs/images의 촬영 시점과 현행 README 사용 여부는 images/README를 따릅니다. 역할이 바뀐 이전 UI를 최신 화면으로 표기하지 않습니다.
