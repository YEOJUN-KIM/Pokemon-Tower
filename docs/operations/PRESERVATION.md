# Git + Google Drive 보존과 증분 운영

- Status: Active
- Updated: 2026-11-03
- Baseline Commit: `aaf6a8298c829f025ae2bb89270fcb7e2921019f`
- Applies To: beta.6 개발 상태; package/Windows 공개본은 beta.5
- Branch: `main` (실제 실행 시 manifest의 branch/HEAD를 다시 확인)
- Last Drive Review: 2026-11-03 KST; 업로드 완료 여부·ID·해시는 Drive receipt가 기준

[프로젝트 인덱스](https://docs.google.com/document/d/1XjHkRaclJ8JB9GZ489yJ0FB0dm6TuCU-tCG_gybkpBw/edit)는 기존 [Projects/포켓몬](https://drive.google.com/drive/folders/1x17jXMjJRPjaK5E8WXtrKmq0Kaj3iLd4)의 `00_프로젝트_인덱스`에 있다. 이번 조사 전 해당 프로젝트 폴더는 목록·parent 검색 모두 비어 있었다. 다른 위치의 과거 대화 CURRENT/RAW_STATUS는 복구 원본을 대신하지 않으며 변경하지 않는다.

## 관리 경계

| 분류 | 적용 대상·조치 |
|---|---|
| Git | src, scripts 및 scripts/data, tests/e2e, schema, 설정·lockfile, README/docs, 작은 runtime JSON. 현재 추적 자산과 과거 문서도 유지 |
| Drive 보존 | Git 제외 runtime sprite, 외부 원본·동봉 권리 고지, 가변 upstream에서 얻은 동일 버전 데이터, 고정 실험 입력/원자료 |
| Drive 기존 자료 업데이트 | 동일 목적 index/분석 문서 및 manifest/receipt. 이름을 바꿔 중복 생성하지 않음 |
| Drive 새 복구패키지 | clone만으로 부족하고 개별 복원이 복잡하거나 기준 자산 구조가 바뀔 때만 검토 |
| Archive | 비Git 과거 AI·밸런스·진행 구조·의사결정 근거. 당시 manifest/소스 해시 보존; 현재 규칙으로 다시 표기하지 않음 |
| 로컬 유지 | 개인 실행기, 세션 dump/플레이 캡처, 검토되지 않은 일회성 진단·과거 작업 사본 |
| 폐기 후보 | node_modules/.next/store/dist/test-results, 임시 검증 사본, 테스트 DB, 반복 로그·debug screenshot. 이번 작업에서 삭제하지 않음 |
| 민감정보 업로드 금지 | .env 및 개인 운영 설정, 실제 DB·WAL·SHM, backups/transfers, 인증 자료·계정·세션·개인정보. 경로·종류만 보고 |

`external/third-party`의 CC0 참고 원본, NeoDGM OFL 글꼴, 현재 CC0 BGM/VFX, 자체 제작 알·TM·포털·beam·제목/branding 원본은 Git에 있다. 이번에는 Git 파일을 제거하거나 Drive에 전체 복제하지 않는다. source JSON·lock·recipe·라이선스는 해당 자산과 함께 유지한다. Git 추적 이미지는 AI 생성 여부와 무관하게 clone으로 동일 bytes가 복구된다. 별도 PSD/미보존 AI 원본이 새로 생기면 Drive 후보로 추가한다.

## 최초 기준선과 원본

초기 HEAD는 지정 기준과 같았고 작업 트리는 clean이었다. 조사·업로드를 위해 추가한 스크립트/문서만 이후 변경으로 구분한다. 커밋·push는 실행하지 않는다. 원래 tracked 파일의 삭제·자산 경로 이동은 없다.

외부 자산 공식 검사는 `node scripts/assets/manage.mjs verify`이며 조사 당시 여섯 aggregate가 모두 통과했다. pinned source는 재다운로드의 동일성을 검사하지만 제공원의 장기 존속을 보장하지 않는다. 따라서 Git 제외 runtime과 `external/pokemon-ip` 원본을 함께 보존한다. `.data/cache/import` 및 `.data/cache/forms`는 일반 캐시 제외의 예외다. 원본 CSV·수집 목록·sprite·고지가 섞여 있고 일부 URL은 master/live이므로 받은 bytes를 보존한다. TLS 진단 캐시는 업로드하지 않는다.

Drive 역할은 `10_복구자료` 외부 자산, `08_분석보고서` v2 진행 구조와 자산 감사, `99_Archive` 과거 실험 원자료다. 각 ZIP에 `PRESERVATION_MANIFEST.json`과 `RESTORE_README.md`가 포함된다. 새 복구 ZIP의 근거는 Git 제외 수천 개 runtime/원본의 오프라인 동일 복원이며, 연구 ZIP은 수백 개의 당시 입력/결과/추적 파일을 함께 해석하기 위한 묶음이다. 이전 복구 패키지가 없어 최초 기준 패키지를 만든다. 코드·의존성·전체 프로젝트 ZIP은 만들지 않는다.

예외 조사에서 `artifacts/qa/previews/player-trainer/original-sheet.png`(1983×793)는 자동 캡처가 아닌 AI 생성 원본으로 확인되어 복구 팩에 포함한다. Git의 384×128 runtime과 해시·해상도가 다르다. 문서에 언급된 정면 `front-generated.png`는 현재 없어 보존할 수 없으며 최종 PNG/프롬프트는 Git에 있다. 옛 `.data/raid-stat-baseline/artifacts/reports`에는 현재 보존 후보/Git과 해시가 다른 원자료 5개가 있어 해당 5개만 Archive 예외로 보존한다. 같은 사본의 나머지 분석/입력은 보존 후보와 해시가 같아 다시 묶지 않는다.

과거 `battle-data-source.json`의 CSV 9종 중 로컬에 남은 moves/move_names/abilities/pokemon 네 CSV는 기록된 SHA-256과 일치한다. pokemon_species, move_flavor_text, ability_names, version_groups, pokemon_moves 다섯 CSV는 현재 원본이 없다. URL이 master이므로 향후 같은 bytes 재확보를 보장하지 않으며 최신 파일로 대체해 과거 원본으로 표시하지 않는다. Git runtime 데이터의 실행 복원과 과거 ETL 전체 재현을 구분한다.

## 라이선스와 IP

현재 판단은 [THIRD_PARTY](../references/THIRD_PARTY.md), [소유권 감사](../assets/ASSET_OWNERSHIP.md), [자산 인덱스](../assets/README.md), 파일별 source/REUSE/LICENSES를 따른다. 이번 보존은 기존 기록의 보존이며 새 권리 허가를 확인한 작업이 아니다.

- 재사용 가능: 전투 어댑터·튜토리얼·영입·100층·경제·UI/VFX 구조·테스트/분석 도구의 자체 구현. 포함 dependency 고지는 별도 유지.
- 교체 필요: Pokémon sprite·이름/기술명·캐릭터/타입 매핑·원작 데이터와 관련 표현. 커뮤니티 그림은 제작자 고지도 확인. Showdown 엔진 MIT와 Pokémon 그림/음원 권리는 별개.
- 확인 필요: AI 생성물의 원본 프롬프트/참고 이미지와 Pokémon 표현, 데이터 포함 실험 자료의 자체 IP 전환 범위. 파일별 확인 없이 전부 재사용 가능으로 표시하지 않음.
- 동봉 기록상 CC0: OpenGameArt BGM 6원곡/8파일, Kenney 참고 SFX, 명시된 Showdown VFX 22개, DevWizard 선정 원본. NeoDGM은 OFL-1.1. DevWizard 팩은 스타일 부적합으로 실전 미채택.
- Pokémon 그림/cry의 재사용 허가는 확인 필요. `LicenseRef-FAIR-USE`는 upstream의 표기이며 우리 프로젝트의 사용 허가를 뜻하지 않음. cry 실제 파일은 현재 없다.
- 루트 통합 REUSE.toml/.reuse/완성 SPDX inventory는 없다. 동봉 upstream 고지·과거 REUSE 관련 자료를 보존하며, 프로젝트 전체 REUSE/SPDX 준수 검사를 통과했다고 보고하지 않는다.

## 새 PC에서 복구

1. Git clone 후 `git rev-parse HEAD`, `git status --short`를 확인한다. 이번 기준으로 복원할 때는 위 commit을 별도 checkout한다. 새 개발 HEAD를 임의로 되돌리지 않는다.
2. Node.js 24+, pnpm 11.19.0, 개발용 Python/Pillow를 [개발자 명령어](../development/DEVELOPER_COMMANDS.md)에 따라 준비하고 `pnpm install --frozen-lockfile`을 실행한다.
3. Drive 인덱스에서 해당 기준 manifest·receipt·ZIP을 찾는다. ZIP 전체 SHA-256을 receipt와 비교한다.
4. 아래 검증 명령으로 ZIP 내부 파일을 확인하고 **새 임시 폴더**에 압축을 푼다. 각 경로는 프로젝트 루트 상대 경로다. 기존 파일과 다르면 덮어쓰지 말고 비교한다. `public/vendor/...`, `public/sprites/...`, `external/pokemon-ip/...`, `.data/cache/import/...`, `.data/cache/forms/...`를 해당 위치에 복원한다.
5. `pnpm assets:verify`로 모든 runtime golden을 확인한다. 필요한 경우 기존 `pnpm assets:setup`/`--offline` 절차를 사용한다. ZIP에 runtime도 포함되므로 일반 실행에 재변환을 요구하지 않는다.
6. 분석/Archive ZIP은 원래 `artifacts/...` 경로에 선택 복원한다. 과거 보고서의 날짜/commit/AI 버전과 현재를 구분한다. 과거 결과는 현재 사람 승률이나 전체 테스트 green의 증거가 아니다.
7. 환경값은 `.env.example`에서 별도 설정한다. 개인 저장은 일반 Drive 패키지에 없다. [BACKUPS](BACKUPS.md)/[COMPUTER_MOVE](COMPUTER_MOVE.md)를 따라 별도 비공개 저장소에서 검증한 스냅샷을 새 경로에 복원한다. 실제 DB·WAL/SHM을 삭제하거나 혼합하지 않는다.
8. `pnpm dev` 실행 후 새 저장으로 기본 동작을 확인한다. 이번 보존 작업은 새 PC 실제 실행이나 개인 DB 복원을 수행한 것은 아니다.

이번 신규 운영 파일은 아직 미커밋이므로 기준 commit만 clone하면 `preservation-audit.py`가 없다. 이 경우 ZIP 전체는 `Get-FileHash -Algorithm SHA256 -LiteralPath '다운로드 ZIP'`로 receipt와 비교하고, 내부 파일은 아래 Python 표준 라이브러리만으로 검증한다. 기존 Git에 없는 이번 도구가 필요하다고 복원을 중단하지 않는다.

```powershell
@'
import hashlib, json, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    entries = json.loads(z.read('PRESERVATION_MANIFEST.json'))['files']
    for e in entries:
        assert z.getinfo(e['path']).file_size == e['bytes'], e['path']
        with z.open(e['path']) as f:
            assert hashlib.file_digest(f, 'sha256').hexdigest() == e['sha256'], e['path']
    print('Verified', len(entries), 'files')
'@ | python - '다운로드 ZIP의 전체 경로'
```

## 다음 개발 작업 종료 시 증분 검사

먼저 기존 Drive 인덱스와 receipt를 읽고 기준 manifest를 확보한다. 산출물은 `artifacts/preservation/`에 두며 Git에 원자료/ZIP을 넣지 않는다. 아래 명령은 파일 조회와 로컬 보고서 생성만 하며 업로드·삭제·commit·push를 하지 않는다. Python 3.12+가 필요하다.

```powershell
git rev-parse HEAD
git status --short
git diff --name-status aaf6a8298c829f025ae2bb89270fcb7e2921019f HEAD
python scripts/preservation-audit.py --output artifacts/preservation/next-review --compare artifacts/preservation/baseline-2026-11-03/PRESERVATION_MANIFEST.json
```

`PRESERVATION_MANIFEST.json`은 tracked/ignored·경로·크기·SHA-256·분류·복원 위치를 기록하고, `DELTA.json`은 추가/변경/없어진 경로를 보고한다. 파일 없음을 삭제 승인으로 해석하지 않는다. 생성물은 수/용량만 집계하고 `.git`, directory symlink/junction, `artifacts/preservation` 자체 출력은 집계에서 제외한다. 에러가 있으면 패키징을 중단한다. 민감 경로는 해시/내용을 수집하지 않는다. 정규식 검사는 보조 수단이므로 신규 경로·보고서·캡처·압축 파일의 실제 공개 적합성을 별도 검토한다. 기본 제외 디렉터리에 사람이 만든 원본이 생겼다면 분류 규칙에 예외를 추가하고 다시 조사한다.

검토 순서는 Git 변경 → 새 untracked/ignored → ExternalAssets 역할의 실제 public/external/cache → 신규 이미지·오디오·CSV/JSON/ZIP 및 대용량 파일 → 라이선스 변경 → 기존 Drive manifest 비교다. Git 코드/문서 변경은 검토 후 별도 커밋하고, 새로운 비Git 원본은 재확보 가능성·버전 동일성·권리·복원 비용에 따라 보존한다. 현재 HEAD가 기준과 달라져도 기준을 자동 변경하지 않는다.

기존 문서 내용만 바뀌면 같은 ID의 Docs를 갱신한다. 소수 원본은 개별 보존 또는 기존 ZIP의 in-place 갱신을 검토한다. beta/자산 구조·대규모 교체 등 기준선이 바뀔 때만 새 패키지를 검토한다. `--package assets` / `--package analysis` / `--package history`는 검토 후 필요한 종류만 명시한다. 매 실행 전체 ZIP을 만들거나 Drive에 새 이름으로 올리지 않는다. manifest와 Drive receipt에는 파일 ID·URL·크기·SHA-256·검증 결과·마지막 Drive 갱신일을 유지한다.

연결 도구의 단일 업로드 한도는 100MiB다. 최초 통합 ZIP은 로컬 검증용으로 유지하고 Drive에는 runtime/원본의 복구 2개, v2 분석 1개, 과거 AI·밸런스/샘플·이전진행·결정 2개의 독립 ZIP으로 나눴다. 바이너리 분할 파일이 아니므로 각 ZIP을 개별 검증·선택 복원할 수 있다. 이후 `--package`도 이 논리적 분할을 사용하고 한도 초과 시 더 작은 범위를 검토하도록 중단한다. 검토 후 기준선을 바꿀 때는 `--baseline-commit <명시적으로 선택한 commit>`을 지정하고 Drive 인덱스/receipt를 함께 갱신한다. 지정하지 않으면 이번 기준 commit을 계속 사용한다.

```powershell
python scripts/preservation-audit.py --verify-package '내려받은 패키지.zip'
```

## 삭제 후보와 유지 제한

`.next`, `node_modules`, `.pnpm-store`, `dist`의 배포/검증 사본, `artifacts/temporary`, `artifacts/windows-release`, `.data/tests`, 자동 QA 캡처·일시 로그는 폐기 후보 또는 로컬 유지다. 이번에는 실제 삭제하지 않는다. `artifacts/build-progression-audit/test-temp`의 tsx cache를 분석 원본과 구분한다. `.data/cache` 전체를 일괄 폐기하지 않으며 원본 예외는 위와 같다. 실제 백업/개인 DB/환경·인증 자료는 폐기 후보가 아니다.
