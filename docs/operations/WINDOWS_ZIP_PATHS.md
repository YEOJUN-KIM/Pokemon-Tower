# Windows Release ZIP 경로 검증

2026-10-26: 공개 beta.5를 다른 PC의 Windows 기본 압축 해제로 일반 다운로드 위치에 풀면 0x80010135가 발생하고 짧은 위치에서는 동작한다는 사용자 보고를 기준으로 수정했다. 원본 공개 asset은 dist/original-beta5에 별도로 보존했으며 업로드·교체·tag·commit은 수행하지 않았다.

## 원인과 수정

원본 ZIP의 최장 entry는 221자다. 공통 접두사는 `PokemonTower-Windows-v1.0.0-beta.5/node_modules/.pnpm/next@16.3.8_@playwright+tes_b856825c6311cf24e2a7ae2d5c69fa1f/node_modules/next/`이고, 최장 suffix는 `dist/client/components/router-reducer/reducers/has-interception-route-in-current-tree.js`다. 보고된 `dist/build/static-paths/app/extract-pathname-route-param-segments-from-loader-tree.js`는 접두사 포함 218자다. 다운로드 상위 폴더가 붙으면 기존 Win32 경로 범위를 넘는다.

전체 개발 node_modules를 배포한 것은 아니다. Next output:standalone에 추적된 production dependency를 복사했지만 pnpm의 peer/version 저장 경로도 그대로 따라갔다. 이 경로의 `@playwright` 문자열은 peer 정보를 포함한 store 이름이며 실제 Playwright 개발 패키지를 포함했다는 뜻은 아니다. 원본과 수정본 모두 dependency 파일 2,045개이며 ZIP에 source map은 없다.

player 전용 copyCompactStandalone은 `.pnpm/<긴 store 이름>`만 `.p/<정렬 순서의 base36 슬롯>`으로 매핑한다. 모든 실제 파일과 dependency-links의 path/target에 같은 변환을 적용한다. 패키지 내부 파일명·코드와 dependency 버전은 유지하며, 서로 다른 버전도 합치지 않는다. Next가 추적한 dev 이름의 helper도 production에서 동적으로 사용할 수 있어 이름만 보고 삭제하지 않았다. source map·타입 선언·trace metadata·cache는 기존 정책대로 제외한다. 일반 서버용 package-deploy의 기존 레이아웃은 유지한다.

ZIP 내부 최상위는 PokemonTower/로 줄인다. 외부 파일명은 PokemonTower-Windows-v1.0.0-beta.5.zip 그대로다. 사용자 요구 사항은 Windows x64와 외부 Node.js 24+이며 Python/pnpm/7-Zip은 필요 없다.

## 자동 실패 기준

scripts/windows-player-path-policy.json이 JS와 PowerShell 양쪽의 공통 기준이다.

- 압축 해제 위치에 100 UTF-16 code unit을 예약한다. 여기에는 사용자의 Downloads와 Explorer가 ZIP 이름으로 만드는 폴더가 들어갈 수 있다.
- 예약 경로 + 구분자 + ZIP entry 전체(최상위 포함)가 **240 이하**여야 한다. 임의 길이의 사용자 경로 전체를 보장하는 기준은 아니며 일반 다운로드 위치를 위한 여유 예산이다.
- 단일 component는 255 이하이며, ZIP traversal/절대 경로도 거부한다.
- package 생성 전에 folder 검증, ZIP create 전 preflight, ZIP verify에서 모두 적용한다. 초과 파일은 하나라도 있으면 nonzero다.

## 전후

| 항목 | 원본 공개본 | 수정 검증본 |
|---|---:|---:|
| 최장 ZIP 상대 경로 | 221 | 137 |
| 상위 경로 100자 가정 최장 전체 경로 | 322 | 238 |
| ZIP 파일 수 | 11,009 | 11,010 |
| ZIP bytes | 160,974,312 | 160,321,314 |
| dependency 파일 수 | 2,045 | 2,045 |
| source map 파일 수 | 0 | 0 |

최장 수정 entry는 `PokemonTower/node_modules/.p/t/node_modules/next/dist/client/components/router-reducer/reducers/has-interception-route-in-current-tree.js`다. 상위 20개 실제 경로와 hash는 작업별 로컬 audit에 기록했다. 파일 수를 줄였다고 주장하지 않으며, 긴 경로의 구조적 제거가 이번 수정의 핵심이다.

## 실제 검증 범위

Windows 탐색기 UI를 직접 조작한 테스트는 아니다. 동등한 기존 Win32 경로 제약을 검증하기 위해 windows-player-zip.ps1의 extract 모드로 ZIP 전체를 실제 생성했다. C# P/Invoke의 CreateDirectoryW/CreateFileW와 ZipArchive stream을 사용하며 확장 경로 접두사·LongPathsEnabled·7-Zip·Expand-Archive를 사용하지 않았다. 한글 포함 100자 상위 경로에 11,010개 파일을 추출했고 실제 최장 경로는 238이었다. 추출 결과 전체 파일 수와 hash도 manifest와 일치했다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/windows-player-zip.ps1 -Mode extract -Directory <새 검증 디렉터리> -ZipPath <새 ZIP>
```

관련 단위 검사 14개, TypeScript, workspace, package-deploy --check, 기본 Turbopack build, player package verify를 통과했다. 실제 EXE Job Object 정리 테스트는 반복 종료·EXE/엔진 강제 종료·실패 시 worker 정리까지 통과했다. tray open 명령도 기존 단위 검사로 재사용·health·UTF-8·서버 재시작 없음이 확인됐으며 실제 트레이 마우스 조작은 이번에 수행하지 않았다.

기존 windows-player-release 전체 자동 테스트는 이 PC에서 이미 사용 중인 3000번 포트 때문에 preflight에서 중단됐다. 실행 중인 서비스를 종료하거나 변경하지 않았다. 대신 긴 경로에서 추출한 EXE의 install-only를 사용해 최초 설치·중복 거부·빠른 재실행·갱신/저장 보존을 검증했다. 설치된 파일을 수정하지 않고 production start-deploy를 별도 3107 포트에서 실행해 health·계정·튜토리얼·신규 256P를 확인했다. PATH는 Node/System32만 두고 Python을 없는 값으로 지정했으며 개발 도구 설치/asset 생성/build 단계가 호출되지 않은 것도 확인했다.

교체용 검증 asset은 dist/explorer-fix에 있으며 SHA256은 `4ef055d105da457e53ac29945501bd895cd622e28fbec01a8fe4cbe88d738dd4`다. 실제 교체는 별도 승인 작업이다. 새로 생성하면 build ID·시간·체크섬은 달라질 수 있으므로 반드시 동반 sha256을 재계산한다.
