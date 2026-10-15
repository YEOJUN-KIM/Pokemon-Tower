# 웹 배포 패키지

다른 PC로 옮기는 최신 Windows 절차와 백업 파일은 [컴퓨터 이전 안내](COMPUTER_MOVE.md)에 있다. 현재 사용자는 유료 호스팅 없이 PC·Docker·Quick Tunnel 테스트를 유지한다. 실제 휴대폰 조작도 확인 완료했다. 프로젝트 루트의 `포켓몬타워 실행.cmd`로 서버·DB·터널을 함께 켜고 주소를 확인한다. 정기 백업과 PC 부팅 시 자동 시작은 미설정이며, 실행 전 DB 백업은 실행기가 처리한다. 더블클릭 방법은 [실행 안내](SETUP.md)를 따른다.

Node.js 24 / 단일 서버 / 영구 저장 디스크를 기준으로 준비했다. 서버 선택과 도메인·HTTPS 연결은 별도 단계다. 여러 서버에서 같은 DB를 동시에 사용하거나 서버리스 임시 디스크에 저장하지 않는다.

## 2026-10-16 배포 준비

- 층을 소모하지 않는 비전투 이벤트 3종: 상자, 브리더의 알 티켓 선물, 여행 상인의 300코인 알 티켓 판매. 공통 등장률 10%, 종류 비중 50/30/20, 다음 두 층 재등장 방지.
- 필드 그림·이펙트와 왼쪽 아래 요약, 전체 폭의 메시지·선택 흐름. 선택 후 요약 숨김 및 이벤트 중 발판 숨김.
- DB 스키마 v33. 기존 상자 기록·잔액·보상을 유지하며 종류 컬럼을 추가한다. 상인 결제와 티켓 지급은 같은 트랜잭션이며 중복 요청·실패 시 복구를 검증한다.
- 기존 로컬 이미지가 있는데 경로가 비던 일부 NPC 포켓몬의 정면·뒷면 표시를 보완했다.
- 기존 로컬 DB는 `.data/backups/`에 SQLite backup API로 사전 백업했다. 패키지는 개인 DB·환경변수를 포함하지 않는다.
- Windows 독립 실행 패키지 기준으로 빌드, PC·모바일 이벤트 선택·거절·새로고침, 독립 실행의 배틀·재시작·실행 중 백업·복원을 확인한다. 개인용 통합 실행기로 Docker 서버와 임시 터널을 연결해 실제 HTTPS 응답을 확인했다. 정식 공개 서비스·고정 주소·유료 호스팅은 구성하지 않는다.

[이번 준비의 검증 기록](../../artifacts/reports/changes/NONCOMBAT_EVENTS_RELEASE.md)에 테스트 결과와 최종 패키지 위치를 정리했다.

## 임시 인터넷 테스트

Docker Desktop 엔진을 실행한 뒤 `pnpm preview:start`로 Cloudflare Quick Tunnel 주소를 만든다. `pnpm preview:status`로 상태와 주소를 확인하고 `pnpm preview:stop`으로 임시 접속을 중지한다. PC와 Docker가 켜져 있어야 한다. 주소를 가진 사람은 접속할 수 있으며 터널을 새로 만들면 주소가 바뀐다.

`tower-preview` 프로젝트의 별도 DB 볼륨을 사용하므로 기존 로컬 저장과 분리된다. 중지해도 볼륨은 보존하지만 주소가 바뀌면 기존 브라우저 쿠키가 전달되지 않아 게스트 저장에 바로 접근할 수 없다. `.data/preview.env`의 주소 설정은 스크립트가 자동으로 갱신한다. 이 임시 주소는 테스트용이며 PWA 설치나 장기 저장용 고정 주소가 아니다.

2026-10-11 최신 화면 수정 배포 시 로컬과 기존 서버 DB를 각각 백업하고, 로컬 저장의 일관된 백업을 중지된 테스트 서버 볼륨에 복원했다. 원래 계정과 플레이 데이터 12개 테이블의 일치를 확인했다. 이후 두 DB는 자동 동기화되지 않는다. 다시 옮길 때에는 양쪽을 백업하고 사용할 최신 저장을 선택한 뒤 서버를 중지하여 복원한다. `preview:start`는 저장을 자동으로 옮기지 않는다.

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

실행 중에도 SQLite backup API로 일관된 백업을 생성한다. 원본 DB를 직접 복사하지 않는다.

```sh
docker compose exec game node scripts/backup-db.mjs /data/backups/tower-before-update.sqlite
docker compose cp game:/data/backups/tower-before-update.sqlite ./tower-before-update.sqlite
```

같은 파일명은 덮어쓰지 않는다. 백업은 서버 외부에도 보관한다. 독립 실행 패키지는 `TOWER_DB_PATH`를 지정하고 `node scripts/backup-db.mjs 백업경로`를 실행한다.

복원은 서비스를 중지한 상태에서만 진행한다. 먼저 현재 DB도 백업한다. Docker 예시(Linux 서버, 현재 폴더에 복원 파일을 준비):

```sh
docker compose stop game
docker compose run --rm --no-deps -v "$(pwd):/restore:ro" --entrypoint node game -e "const fs=require('node:fs');const src='/restore/tower-before-update.sqlite';fs.accessSync(src);fs.copyFileSync(src,'/data/tower.sqlite');for(const suffix of ['-wal','-shm'])fs.rmSync('/data/tower.sqlite'+suffix,{force:true});"
docker compose up -d game
```

독립 실행도 서버를 중지하고 DB를 교체한 뒤 이전 `-wal`·`-shm` 파일을 제거하고 재시작한다. 엔진 버전이 변경된 업데이트는 진행 중인 전투 복구가 거부될 수 있으므로 이전 이미지/패키지도 보관한다. DB 마이그레이션 후 구버전으로 되돌리려면 당시 백업도 함께 복원한다.

## 공개 전 확인

- 실제 HTTPS 주소에서 신규 접속·전투·저장·새로고침·재시작 후 복구.
- 실제 휴대폰의 터치·소리·팝업 조작.
- 백업의 외부 보관과 복원 확인.
- 게스트 저장은 브라우저 쿠키 기준이다. 계정에 연결하면 기기 간 이어하기를 지원한다. 복구 키 보관 방법은 [ACCOUNTS](ACCOUNTS.md)를 참고한다.

`deploy:verify`는 독립 실행 패키지에서 화면·이미지·API·한 턴·재시작·백업 복원을 확인한다. `deploy:verify:docker`는 Docker 이미지의 실행 및 컨테이너 교체 후 저장 유지도 확인한다. 외부 HTTPS 프록시 연결과 실제 모바일 기기 확인은 공개 주소를 정한 뒤 진행한다.
