# 웹 배포 패키지

이 문서는 운영자용 서버/웹 배포와 개인 Docker·Quick Tunnel 환경을 설명한다. 일반 Windows 사용자는 [SETUP](SETUP.md), 공개 ZIP과 검증 기록은 [beta.5 완료 기록](../releases/WINDOWS_BETA_5.md), Windows 패키지 재생성은 [개발자 명령어](../development/DEVELOPER_COMMANDS.md)를 따른다.

공개 Release 배포와 상시 호스팅 운영은 별개다. 현재 개인 테스트 서버·임시 터널을 유지하며 상시 공개 서비스 운영은 계획하지 않는다.

Node.js 24 / 단일 서버 / 영구 저장 디스크를 기준으로 준비했다. 서버 선택과 도메인·HTTPS 연결은 별도 단계다. 여러 서버에서 같은 DB를 동시에 사용하거나 서버리스 임시 디스크에 저장하지 않는다.

## 현재 패키징 기준

개발 호스트에서 [자산 준비](../development/DEVELOPER_COMMANDS.md#처음-clone한-pc)를 완료한다. `pnpm assets:setup` → `pnpm assets:verify`는 6개 aggregate의 전체 외부 runtime을 준비·검사한다. `node scripts/package-deploy.mjs --check`는 빌드·서버·DB 변경 없이 배포 입력을 검사한다. 누락·추가·해시 불일치 시 복원 안내와 함께 복사 전에 실패한다.

서버 패키지의 RELEASE_NOTES.md는 과거 [비전투 이벤트 기록](../releases/NONCOMBAT_EVENTS_RELEASE.md)을 동봉한다. 파일 이름만으로 현재 공개 beta.5 릴리스 노트로 간주하지 않는다. assets 없이 Docker build를 시작하지 않으며 호스트에서 복원한 public을 context에 넣는다.

- 최신 코드를 `pnpm build` 후 패키징한다. 과거 dist 묶음은 현재 코드/데이터를 포함한다고 가정하지 않는다.
- 코드 지원 DB schema는 47다. 실제 DB 버전은 별도 확인하고 업데이트 전 SQLite backup API로 백업한다.
- 이벤트는 공통 20%·통과 순서 쿨다운 2이며, 선택·결제·보상·배틀 snapshot과 중복 요청 방지를 유지한다. 세부 종류/weight는 [이벤트 개발](../engineering/EVENT_SYSTEM.md)을 따른다.
- 개인 DB·환경변수는 Git/배포 묶음에 포함하지 않는다. 개발 DB와 Docker 볼륨은 별개다.
- 과거 패키지·검증 수치는 당시 artifacts/Git 기록이며 현재 빌드 검사를 대체하지 않는다.

## 임시 인터넷 테스트

Docker Desktop 엔진을 실행한 뒤 `pnpm preview:start`로 Cloudflare Quick Tunnel 주소를 만든다. `pnpm preview:status`로 상태와 주소를 확인하고 `pnpm preview:stop`으로 임시 접속을 중지한다. PC와 Docker가 켜져 있어야 한다. 주소를 가진 사람은 접속할 수 있으며 터널을 새로 만들면 주소가 바뀐다.

`tower-preview` 프로젝트의 별도 DB 볼륨을 사용하므로 기존 로컬 저장과 분리된다. 중지해도 볼륨은 보존하지만 주소가 바뀌면 기존 브라우저의 로그인 쿠키가 전달되지 않으므로 같은 서버 DB의 계정으로 다시 로그인한다. 과거 미연결 게스트 저장은 별도 복구 절차를 따른다. `.data/preview.env`의 주소 설정은 스크립트가 자동으로 갱신한다. 이 임시 주소는 개인 접속·공유용이며 고정 주소가 아니다. PWA·공개 서비스는 현재 목표가 아니다.

개발 DB와 Docker 볼륨은 자동 동기화되지 않는다. 저장을 옮길 때에는 양쪽을 백업하고 사용할 저장을 선택한 뒤 서비스를 중지하여 복원한다. preview:start는 저장을 자동 복사·병합하지 않는다. [백업](BACKUPS.md)·[컴퓨터 이전](COMPUTER_MOVE.md)을 따른다.

`node scripts/verify-public-release.mjs`는 현재 임시 HTTPS 주소에서 로그인 진입·보안 쿠키·다른 브라우저 로그인·PC/모바일 화면 크기·이미지 로딩·게임 서버 재시작 후 전투와 계정 저장 유지·로컬 자동 로그인 차단을 확인한다. 검증용 계정을 만들며 테스트 서버를 잠깐 재시작하므로 운영 중인 정식 서버에는 사용하지 않는다. 실제 휴대폰의 터치 조작은 별도로 확인한다.

## Docker 실행

Docker와 Compose가 설치된 서버에서:

```sh
docker compose up -d --build
docker compose logs --tail=100 game
```

Docker 검증은 별도 프로젝트/볼륨에서 실행한다. 실제 플레이 DB는 사용하지 않는다.

```sh
docker compose -p tower-package-check build
pnpm deploy:verify:docker
```

검증 후 테스트 컨테이너는 종료되며 테스트 볼륨은 남는다. 2026-10-11 Windows 독립 패키지 및 Linux Docker에서 화면·정적 파일·HTTPS 쿠키·전투·재시작/컨테이너 교체·실행 중 백업·복원을 검증했다.

기본 접속은 http://127.0.0.1:3000 이다. 포트는 서버 내부에만 열어 둔다. 외부 공개 시 앞에 HTTPS 역방향 프록시를 연결하고 `.env`에 `TOWER_ORIGIN=https://실제도메인`을 지정한 뒤 다시 실행한다. 프록시는 Host 헤더를 전달하고 요청 크기 제한을 설정한다. `TOWER_PORT`로 내부 포트를 바꿀 경우 로컬 테스트용 `TOWER_ORIGIN`의 포트도 함께 바꾼다.

`tower-data` 볼륨의 `/data/tower.sqlite`에 저장된다. 이미지 재빌드와 컨테이너 교체는 이 데이터를 유지한다. **`docker compose down -v`는 저장 볼륨을 삭제하므로 사용하지 않는다.** 게임은 한 인스턴스로 실행한다.

`/api/health`는 DB 접근까지 확인한다. Docker healthcheck는 상태를 표시하며, unhealthy만으로 컨테이너를 재시작하지는 않는다.

## 독립 실행 패키지

```sh
pnpm deploy:package
pnpm deploy:verify
```

`dist/tower-날짜/`에 서버, 필요한 의존성, public 이미지·음원·폰트, 정적 파일을 모은다. 개인 `.data`와 `.env`는 포함하지 않는다. Node.js 24가 설치된 **빌드와 동일한 OS·CPU 환경**에서 실행한다. Windows에서 만든 의존성을 Linux로 복사하지 말고 Linux 대상은 Docker로 빌드한다.

실행 예시(환경 변수는 서버 서비스 설정에서 지정):

```sh
HOSTNAME=127.0.0.1 PORT=3000 TOWER_DB_PATH=/srv/tower-data/tower.sqlite TOWER_ORIGIN=https://game.example.com node scripts/start-deploy.mjs
```

Windows PowerShell 로컬 확인:

```powershell
$env:HOSTNAME='127.0.0.1'
$env:PORT='3000'
$env:TOWER_DB_PATH='C:/tower-data/tower.sqlite'
$env:TOWER_ORIGIN='http://127.0.0.1:3000'
node scripts/start-deploy.mjs
```

배포 DB는 패키지 폴더 밖에 둔다. `.env.example`은 설정 예시이며 자동으로 읽지 않는다. 프로세스 관리자에서 자동 시작·재시작을 설정한다. 독립 패키지의 실행 스크립트는 폴더를 옮겨도 의존성 연결이 패키지 내부를 가리키도록 복구하므로 패키지 폴더에 쓰기 권한이 필요하다.

## 백업과 복원

[BACKUPS](BACKUPS.md)를 단일 절차로 사용한다. 실행 중 백업은 SQLite backup API로 만들고 서버 외부에도 보관한다. 복원은 서비스 중지·현재 저장 백업 후 수행하며, 개발·Docker의 새 대상 복원은 [COMPUTER_MOVE](COMPUTER_MOVE.md#4-새-pc의-docker-저장-복원)를 따른다. DB 마이그레이션 뒤 구버전으로 돌아갈 때는 당시 백업도 함께 복원해야 한다.

## 개인 접속·공유 실사용 확인

- 실제 HTTPS 주소에서 신규 접속·전투·저장·새로고침·재시작 후 복구.
- 실제 휴대폰의 터치·소리·팝업 조작.
- 백업의 외부 보관과 복원 확인.
- 같은 서버 DB의 계정으로 기기·주소 변경 후 다시 로그인해 이어간다. 과거 게스트 저장 연결과 복구 키 보관은 [ACCOUNTS](ACCOUNTS.md)를 참고한다.

`deploy:verify`는 독립 실행 패키지에서 화면·이미지·API·한 턴·재시작·백업 복원을 확인한다. `deploy:verify:docker`는 Docker 이미지의 실행 및 컨테이너 교체 후 저장 유지도 확인한다. 이 검사 결과와 실제 임시 터널·휴대폰·장기 플레이 검증은 구분하며, 공유할 실제 주소에서 별도로 확인한다.

## 자산·플랫폼 경계

Docker는 호스트에서 `pnpm assets:setup` / `pnpm assets:verify`를 마친 public을 사용하며 내부 대량 다운로드를 하지 않는다. provider별 복구·offline 조건은 [자산 안내](../assets/README.md), project-original/Git 유지 정책은 [소유권](../assets/ASSET_OWNERSHIP.md)을 따른다. 자산 복원 범위를 이 문서에서 별도 목록으로 중복 관리하지 않는다.

Windows 플레이어 ZIP과 서버 패키지는 같은 production 기반이지만 사용자 진입점·문서·저장 위치가 다르다. 웹 서버 배포 패키지의 운영용 스크립트를 일반 Windows ZIP에도 포함한다고 가정하지 않는다.
