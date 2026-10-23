# 외부 자료 보관 경계

장기 구조의 기반만 만든 상태다. 기존 public/vendor·sprites·audio와 vendor 자료는 이번에 이동하거나 복제하지 않았다. [분류·사용처·Git 정책](../docs/assets/EXTERNAL_ASSETS.md)을 따른다.

- pokemon-ip/: 향후 Pokémon IP 기반 원본. 로컬 전용이며 README만 Git에 보존한다.
- third-party/: 파일별 이용 조건이 명시된 제3자 원본과 고지. 허용 범위가 확인된 파일만 Git 추적 가능.
- reference/: 런타임과 분리된 참고 코드·자료. 파일별 고지 유지.
- user-provided/unverified/: 출처/권리 확인 전 사용자 제공 원본. 로컬 전용이며 README만 추적한다.

외부 원본을 보관하는 이 폴더는 웹 URL이 아니다. 나중에 생성기가 검증한 runtime 사본만 public/assets/external-generated/에 출력하고, registry의 경로를 바꾼다. 생성 결과와 IP 원본은 기본 Git 제외다. 기존 자산의 추적은 복구·누락 fallback·패키징을 검증한 뒤 그룹별로 해제한다.
