# v1.0.0-beta.5 Windows 공개·검증 완료 기록

2026-10-24, [Pokémon Tower v1.0.0-beta.5](https://github.com/YEOJUN-KIM/Pokemon-Tower/releases/tag/v1.0.0-beta.5)를 GitHub **공개 prerelease**로 배포했다. 공개 기준 커밋은 `54e10401a14ce2525581adf8bfe900abdad99b14`, package 버전은 `1.0.0-beta.5`다.

## 공개 asset

| 파일 | 확인한 정보 |
|---|---|
| [PokemonTower-Windows-v1.0.0-beta.5.zip](https://github.com/YEOJUN-KIM/Pokemon-Tower/releases/download/v1.0.0-beta.5/PokemonTower-Windows-v1.0.0-beta.5.zip) | 160,974,312 bytes, 단일 최상위 폴더, 11,009개 파일 |
| [ZIP SHA256 파일](https://github.com/YEOJUN-KIM/Pokemon-Tower/releases/download/v1.0.0-beta.5/PokemonTower-Windows-v1.0.0-beta.5.zip.sha256) | 공개 ZIP의 검증용 sidecar |

ZIP SHA256: `323555dd1ef66cac16d614a53d84a4c8d301cf8619e03d9f6068577b01540ae7`.

2026-10-24 GitHub Release API에서 draft=false, prerelease=true, 두 asset의 uploaded 상태와 ZIP 크기/digest를 확인했다. 공개 ZIP digest는 로컬 검증 기록과 일치한다. 공개 시각은 2026-10-24 12:51:58 KST다.

EXE 단독 asset은 제공하지 않는다. 주변 서버·자산·스크립트가 필요하며 GitHub 자동 Source code ZIP도 Windows ZIP을 대체하지 않는다.

```text
PokemonTower-Windows-v1.0.0-beta.5/
  PokemonTower.exe
  README.txt / release-manifest.json
  server.js / package.json
  .next/ / node_modules/ / public/
  scripts/ / docs/assets/manifests/ / licenses/
```

## 적용 내용

- EXE production 실행·한국어 안내·트레이 재열기/종료·프로세스 정리.
- 로그인 중심 계정 UX·하단 보조 링크·가입 완료 후 게임 시작·2단계 비밀번호 찾기.
- 신규 게임 초기 성장포인트 256P 최초 1회 지급. 튜토리얼 진행/스킵 동일, 반복 요청 추가 지급 없음.
- 도감 관리와 출전 편성 분리. 모두 보기/보유 중 기본, 같은 저장 공유.
- 외부 runtime 자산의 Git 분리·독립 복원/검증과 완성 ZIP 자산 동봉.

현재 규칙은 [STATUS](../STATUS.md)·[게임 안내](../gameplay/README.md), 실행은 [SETUP](../operations/SETUP.md)를 따른다.

## 완료된 검증

| 구분 | 완료 범위 |
|---|---|
| 로컬 빌드 | Windows 11 Home x64, launcher:build·production build·typecheck·workspace |
| 단위 테스트 | 혼입 방지·숨김 파일 ZIP 포함·변조 거부 검사 포함 1,530/1,530 |
| 배포 파일 | player:package / player:package:verify 통과, 외부 자산 8,578개와 ZIP 전체 해시 확인 |
| EXE 프로세스 트리 | 정상 종료 3회, EXE/엔진 강제 종료·서버 실패, 잔여 worker 포함 전체 PID 정리 |
| 실제 배포 EXE | 독립 home에서 최초 설치·빠른 재실행·중복 실행 차단·stale lock 복구·256P·저장 유지 |
| 버전 갱신 | 이전 beta.4 marker를 모델링해 beta.5 재준비, 계정·재화 보존과 다음 빠른 실행 |
| 최종 ZIP 해제본 | 한글·공백·괄호·& 경로에 해제 후 같은 player:package:test 통과 |
| 다른 Windows PC 실사용 | **사용자 확인:** 공개 Release ZIP 다운로드 → Node.js 24+ 설치 → 압축 해제 → PokemonTower.exe → 정상 플레이 성공 |

다른 PC 확인은 사용자의 2026-10-24 실행 보고다. 해당 PC의 Windows 세부 버전·개발 도구 설치 유무와 아래 항목별 결과는 제공되지 않았다. 로컬 자동 검사와 구별하며 전체 E2E·사람의 100층 완주로 확장하지 않는다. beta.4 갱신 검사는 별도 beta.4 바이너리에서 시작한 전체 실기가 아니다.

### 인증·튜토리얼의 기존 브라우저 검사 범위

인증 UX 대상 Chrome 1280px/390px E2E는 8/8, 도감/편성 분리와 튜토리얼 대상 E2E는 7/7 통과 기록이 있다. 이전 더 넓은 playtest에는 범위 밖 5건(4배 연출 시간·영입 문구 2건·알 결과·소리 버튼 색상)의 실패 기록이 있으며 이번 문서/CMD 정리에서 해결하거나 전체 E2E를 다시 실행한 것은 아니다.

## 추가 실기 확인 항목

기본 실행은 완료했으며 다음 항목별 결과는 추가로 기록할 수 있다.

- [ ] 실제 트레이 더블클릭·우클릭 열기·종료 마우스 조작
- [ ] PC 재부팅 후 빠른 실행과 저장 유지
- [ ] 다른 PC 반복 실행/종료 후 프로세스 누적 확인
- [ ] 다른 PC 이전 버전 실설치 → 새 ZIP 교체와 진행 유지
- [ ] 장기 플레이·로그인/복구·성장·배틀 상세 시나리오

## 재생성 시 참고

배포 파일은 `341e4707a7afef4e1507db72fef9376164630df5`에 배포 자동화·버전 변경을 적용한 작업 트리에서 만들었고, 그 변경을 포함한 공개 기준 커밋이 위 beta.5 커밋이다. package manifest의 sourceCommit/workingTreeChangesIncluded와 공개 커밋을 구별한다.

재생성 명령은 [DEVELOPER_COMMANDS](../development/DEVELOPER_COMMANDS.md), 런처 내부는 [WINDOWS_PLAYER](../operations/WINDOWS_PLAYER.md)를 따른다. 같은 버전 재빌드가 공개 ZIP과 동일한 bytes/해시를 보장하지 않는다. 기존 출력은 덮어쓰지 않으며 재생성 검증과 공개 asset 교체는 별도 절차다.
