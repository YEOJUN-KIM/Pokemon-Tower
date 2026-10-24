# v1.0.0-beta.5 Windows 배포 준비

이 문서는 로컬 배포 파일과 수동 공개 절차다. commit/tag/GitHub Release 생성·업로드는 자동 실행하지 않는다. 기준 소스는 `341e4707a7afef4e1507db72fef9376164630df5`이며, 실제 파일은 이 기준에 배포 자동화·버전 변경을 적용한 작업 트리로 빌드한다.

## 생성과 재검사

Windows x64 개발 환경에서 `pnpm install --frozen-lockfile`, `pnpm assets:setup` 후:

```sh
pnpm player:package
pnpm player:package:verify
pnpm player:package:test
```

이미 존재하는 결과는 덮어쓰지 않는다. 보관할 결과를 별도 위치로 옮긴 후 다시 실행한다. 실패한 결과는 검증 완료된 배포본이 아니다. ZIP 내부의 모든 파일을 해제 전 SHA256으로 다시 검사한다. 파일별 manifest는 작업 트리 변경 포함 여부·기준 커밋을 기록한다. secret 검사에는 금지 경로/개인 경로/알려진 토큰 형식/현재 환경의 민감값 검사를 사용하며, 임의의 모든 비밀정보 탐지를 보증하는 것은 아니다.

```text
dist/
  PokemonTower-Windows-v1.0.0-beta.5/
    PokemonTower.exe
    README.txt
    release-manifest.json
    server.js
    package.json
    .next/             # production 서버와 정적 파일
    node_modules/      # Next가 추적한 runtime 의존성만
    public/            # 외부 runtime 8,578개 포함
    scripts/           # 실행기·서버 시작·자산 검사
    docs/assets/manifests/  # 자산 검증 필수 JSON만
    licenses/
  PokemonTower-Windows-v1.0.0-beta.5.zip
  PokemonTower-Windows-v1.0.0-beta.5.zip.sha256
```

## GitHub Release에 수동으로 올릴 파일

태그/Release 이름: `v1.0.0-beta.5` (prerelease). 권장 asset은 `PokemonTower-Windows-v1.0.0-beta.5.zip`이며 `.zip.sha256`도 무결성 확인용으로 함께 올릴 수 있다. `PokemonTower.exe` 단독 업로드는 권장하지 않는다. 주변 서버·자산·실행 스크립트가 없으면 동작하지 않는다. GitHub의 자동 Source code ZIP도 플레이어 배포 ZIP을 대체하지 않는다.

사용자 안내: Windows 11 x64에서 Node.js 24 이상 설치 → Windows ZIP 다운로드 → 완전 압축 해제 → `PokemonTower.exe` 실행. 별도 pnpm/Python/Pillow/Git/Visual Studio/.NET SDK는 필요 없다. Windows에 포함된 .NET Framework를 사용한다. 자세한 [사용자 안내](../operations/SETUP.md), [내부 설치 구조](../operations/WINDOWS_PLAYER.md) 참조.

최초 실행은 동봉 자산 검증과 사용자 package 복사 후 서버를 시작한다. marker 버전이 같으면 다음부터 빠른 경로를 쓴다. beta.4/이전 버전 marker는 beta.5와 달라 한 번 새 파일을 준비한다. `%LOCALAPPDATA%/PokemonTower/saves/tower.sqlite`는 보존한다. 로그는 같은 home의 `logs/`에 남는다. 개발자 DB/계정/설치 기록은 배포 파일에 넣지 않는다. 중복 EXE는 기존 lock에서 거부하며 기존 서버를 유지한다. 트레이의 열기 기능으로 다시 연다.

## 다른 Windows PC 실기 체크리스트

- [ ] 기존 게임/개발 환경이 없는 Windows 11 x64 PC
- [ ] Node.js 24+만 설치 (Git/pnpm/Python 없는 조건)
- [ ] Release ZIP 다운로드·완전 압축 해제
- [ ] PokemonTower.exe 최초 준비·한글 안내 정상
- [ ] 기본 브라우저에서 게임 열림
- [ ] 회원가입/로그인 및 새 게임 초기 성장포인트 256P
- [ ] 파티 선택·성장·배틀 진입
- [ ] 트레이 더블클릭/우클릭의 열기로 화면 재열기
- [ ] 실행 중 EXE 여러 번 열어도 서버 중복 없음
- [ ] 트레이 종료 후 해당 launcher/Node/server 모두 종료
- [ ] 실행→종료 3회 반복 후 프로세스 누적 없음
- [ ] 다음 실행에 전체 준비를 반복하지 않음
- [ ] PC 재시작 후 실행·저장 유지
- [ ] 이전 버전 설치가 있다면 beta.5로 한 번 갱신·저장 유지
- [ ] 배포 ZIP/폴더를 교체해도 저장 유지

무인 테스트는 위 실기 확인 전체를 대체하지 않는다. 실제 트레이 마우스 조작, 새 PC의 보안 경고, 브라우저 선택, 재부팅은 해당 PC에서 확인한다.

## 로컬 검증 기록 (2026-10-24)

새 배포 파일 혼입 방지·ZIP 변조 검사 2개를 포함한 전체 단위 테스트 1,530/1,530, typecheck/workspace 검사 통과. Release EXE로 Windows Job 테스트(정상 종료 3회/EXE 강제 종료/엔진 강제 종료/서버 실패) 통과. 실제 standalone EXE의 독립 home 설치·빠른 재실행 2회·중복 실행 거부·강제 종료 전체 PID 정리·stale lock 재시작·beta.4 버전 marker 갱신과 계정/성장포인트 보존을 통과했다. 한글/공백/`&`/괄호 경로, 개발 도구를 제외한 PATH를 사용했다. beta.4 검사는 이전 버전 marker를 모델링하며 beta.4 별도 바이너리에서 시작한 전체 업그레이드 실기를 뜻하지 않는다.

파일 검사에서 8,578개 외부 자산과 ZIP 내부 전체 파일 해시를 확인한다. DB·환경 파일·로그·설치 marker·개발자 경로는 배포에 포함하지 않는다. 개인 DB는 테스트에 사용하지 않는다. 브라우저/트레이 마우스 조작은 이번 무인 검사에 포함하지 않는다.

최종 ZIP은 160,974,312 bytes이며 단일 최상위 배포 폴더 아래 11,009개 파일을 담는다. `pnpm player:package`와 `pnpm player:package:verify` 모두 통과했다. SHA256: `323555dd1ef66cac16d614a53d84a4c8d301cf8619e03d9f6068577b01540ae7`.

최종 ZIP을 한글 경로에 실제 압축 해제한 뒤 `TOWER_RELEASE_DIRECTORY`를 지정한 `pnpm player:package:test`도 통과했다. 동일한 설치·빠른 실행·256P·중복 차단·강제 종료·버전 marker 갱신/저장 보존 시나리오를 해제본에서 재검증했다. 실제 검증 OS는 Windows 11 Home x64다.
