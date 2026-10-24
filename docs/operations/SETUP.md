# Windows에서 게임 실행

## 처음 실행

1. **Node.js 24 이상**을 설치합니다. 검증 환경은 Windows 11 x64이며 Windows 기본 .NET Framework를 사용합니다. 별도 SDK·개발 도구는 필요 없습니다.
2. [GitHub Releases](https://github.com/YEOJUN-KIM/Pokemon-Tower/releases)에서 Windows ZIP을 다운로드합니다. 현재 공개본은 **v1.0.0-beta.5**입니다.
3. ZIP을 완전히 압축 해제합니다. GitHub의 자동 Source code ZIP 대신 Windows 배포 asset을 사용합니다.
4. 폴더 안의 **PokemonTower.exe**를 실행합니다. EXE만 따로 옮기지 마세요.
5. 최초 파일 준비가 끝나면 브라우저에서 게임이 자동으로 열립니다.

다른 Windows PC에서 Release ZIP 다운로드 후 정상 실행·플레이를 확인했습니다. 구체적인 검증 범위는 [beta.5 완료 기록](../releases/WINDOWS_BETA_5.md)에 있습니다.

## 다시 열기와 종료

다음부터는 같은 EXE를 실행하면 됩니다. 준비된 설치를 재사용하며 매번 전체 재설치하지 않습니다. 브라우저만 닫았다면 알림 영역의 Pokémon Tower 아이콘을 **더블클릭**하거나 우클릭 → **Pokemon Tower 열기**로 다시 엽니다.

종료하려면 아이콘 우클릭 → **종료**를 선택합니다. 브라우저만 닫으면 게임 서버는 계속 실행될 수 있습니다. 실행기가 이미 열려 있다는 안내가 나오면 기존 트레이 아이콘을 사용하세요.

## 저장과 새 버전

저장은 배포 폴더 밖에 보관하므로 ZIP·배포 폴더를 새 버전으로 교체해도 유지됩니다. 저장 위치·백업은 [BACKUPS](BACKUPS.md)를 따릅니다. 로그는 `%LOCALAPPDATA%/PokemonTower/logs`에 있습니다.

## 문제가 생겼다면

- 실행 도구 안내가 나오면 Node.js 24 이상 설치를 확인합니다.
- 파일 누락 안내가 나오면 Release ZIP을 다시 받아 완전히 압축 해제합니다.
- 3000번 포트 사용 중 안내가 나오면 기존 게임 또는 해당 프로그램을 확인합니다.
- 실패 화면의 단계·오류 코드·로그 위치를 함께 알려 주세요.

계정·복구 키는 [ACCOUNTS](ACCOUNTS.md), 소스 개발은 [개발자 명령어](../development/DEVELOPER_COMMANDS.md)를 따릅니다.
