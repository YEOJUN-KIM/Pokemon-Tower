# 네임드 밸런스·기믹 점검 보고서

이 문서는 selectionRules 도입 당시의 baseline 스냅샷이다. 이후 관동 샘플의 최종 결과는 [관동 밸런스 보고서](kanto-named-trainer-balance-report.md)를 참고한다.

2026-10-18. 모든 승률은 **플레이어 대리 AI의 단일 전투 승률**이다. 낮을수록 NPC가 강하다. 목표는 동일 승률 강제가 아니라 후보 조합 붕괴 방지와 실제 전투 역할의 작동이다.

## A. 테스트 조건

- 이전: 성도 9명 확장 완료 직후, selectionRules 도입 전의 보존된 런타임. 이후: 같은 빌드에 selectionRules만 추가. 원본 팀/기술/도구/특성/성격/육성은 구조 비교로 완전 동일함을 확인했다. 공통 AI는 수정하지 않았다.
- 이전 86,784조건이 직전 성도 실험의 현재 결과와 팀·시드 입력 키 및 승패까지 동일함을 검증했다.
- 팀: 리자몽/거북왕/이상해꽃, 한카리아스/메타그로스/라프라스, 야도란/아머까오/트리토돈, 따라큐/짜랑고우거/갸라도스. 기본 기술배치 일부는 미완성이며 실제 초보/고수 사용자 평균을 뜻하지 않는다.
- 육성: 레벨 50. 층별 IV/포인트 상한 적용(50층 IV12/8점, 51층 IV7/3점, 100층 IV31/66점). 55층부터 역할 성격. 11층부터 기본 소지품과 룰에 맞는 메가/Z/다이맥스 장비. 플레이어 테라 티켓 0장. 기술 습득 비용·상점·누적 피해·회복약은 제외.
- 플레이어 ZMovePolicy, NPC 현재 v11 Basic/Tactical/Expert와 실제 해금 경로. 4개 경로/전투 시드 × 4팀 × 6룰 × 50층 = 테마·구간당 4,800조건(네임드 960, 일반 3,840). basic/mega/dynamax/tera/chaos/z 동일 가중치.
- 1~100층 독립 전투. 두 번째 챕터 셔플 적용. 히든 보스는 별도 보존하고 정규 표에서 제외. 일반 NPC와 동일 입력은 캐시 공유하므로 모든 조건을 독립 표본으로 간주하지 않는다. 실제 사용자 승률·연속 돌파율·인과적 기믹 효과는 추정하지 않는다.
- 오류 0건. 기존 캐시와 별개로 기믹 telemetry가 없는 네임드는 재실행했다. 각 phase manifest에 실제 packed 팀/로드 데이터 해시/엔진 정보를 보존했다.

## B. 테마별 승률

전체 층:

| 테마 | 1–50층 이전 → 이후 | 51–100층 이전 → 이후 |
| --- | --- | --- |
| 관동 | 80.73% → 80.73% | 79.27% → 79.27% |
| 성도 | 77.92% → 77.65% | 77.79% → 77.88% |
| 호연 | 79.15% → 79.13% | 78.79% → 78.60% |
| 신오 | 80.33% → 80.54% | 79.92% → 80.15% |
| 하나 | 79.40% → 79.40% | 79.63% → 79.63% |
| 칼로스 | 78.94% → 78.88% | 77.92% → 77.83% |
| 알로라 | 80.54% → 80.54% | 79.13% → 79.13% |
| 가라르 | 78.10% → 78.10% | 75.79% → 75.67% |
| 팔데아 | 79.77% → 79.81% | 77.83% → 77.71% |

네임드전만:

| 테마 | 1–50층 이전 → 이후 | 51–100층 이전 → 이후 |
| --- | --- | --- |
| 관동 | 82.40% → 82.40% | 77.71% → 77.71% |
| 성도 | 68.33% → 66.98% | 70.31% → 70.73% |
| 호연 | 74.48% → 74.38% | 75.31% → 74.38% |
| 신오 | 80.42% → 81.46% | 80.94% → 82.08% |
| 하나 | 75.73% → 75.73% | 79.48% → 79.48% |
| 칼로스 | 73.44% → 73.13% | 70.94% → 70.52% |
| 알로라 | 81.46% → 81.46% | 76.98% → 76.98% |
| 가라르 | 69.27% → 69.27% | 60.31% → 59.69% |
| 팔데아 | 77.60% → 77.81% | 70.52% → 69.90% |

룰별 전체 승률:

| 테마 | 구간 | 룰 | 이전 → 이후 |
| --- | --- | --- | --- |
| 관동 | 1-50 | basic | 75.38% → 75.38% |
| 관동 | 1-50 | mega | 77.00% → 77.00% |
| 관동 | 1-50 | dynamax | 86.88% → 86.88% |
| 관동 | 1-50 | tera | 76.75% → 76.75% |
| 관동 | 1-50 | chaos | 90.38% → 90.38% |
| 관동 | 1-50 | z | 78.00% → 78.00% |
| 관동 | 51-100 | basic | 71.13% → 71.13% |
| 관동 | 51-100 | mega | 74.88% → 74.88% |
| 관동 | 51-100 | dynamax | 88.38% → 88.38% |
| 관동 | 51-100 | tera | 75.38% → 75.38% |
| 관동 | 51-100 | chaos | 92.88% → 92.88% |
| 관동 | 51-100 | z | 73.00% → 73.00% |
| 성도 | 1-50 | basic | 72.00% → 71.63% |
| 성도 | 1-50 | mega | 74.75% → 74.25% |
| 성도 | 1-50 | dynamax | 83.88% → 83.50% |
| 성도 | 1-50 | tera | 74.00% → 73.50% |
| 성도 | 1-50 | chaos | 88.63% → 89.00% |
| 성도 | 1-50 | z | 74.25% → 74.00% |
| 성도 | 51-100 | basic | 68.00% → 68.25% |
| 성도 | 51-100 | mega | 72.75% → 73.00% |
| 성도 | 51-100 | dynamax | 89.38% → 89.25% |
| 성도 | 51-100 | tera | 73.50% → 73.63% |
| 성도 | 51-100 | chaos | 92.50% → 92.63% |
| 성도 | 51-100 | z | 70.63% → 70.50% |
| 호연 | 1-50 | basic | 73.63% → 73.38% |
| 호연 | 1-50 | mega | 76.25% → 76.00% |
| 호연 | 1-50 | dynamax | 84.25% → 84.38% |
| 호연 | 1-50 | tera | 75.38% → 75.38% |
| 호연 | 1-50 | chaos | 89.00% → 89.13% |
| 호연 | 1-50 | z | 76.38% → 76.50% |
| 호연 | 51-100 | basic | 70.13% → 69.75% |
| 호연 | 51-100 | mega | 75.75% → 75.50% |
| 호연 | 51-100 | dynamax | 88.50% → 88.13% |
| 호연 | 51-100 | tera | 74.13% → 73.88% |
| 호연 | 51-100 | chaos | 92.13% → 92.13% |
| 호연 | 51-100 | z | 72.13% → 72.25% |
| 신오 | 1-50 | basic | 74.50% → 75.00% |
| 신오 | 1-50 | mega | 77.00% → 77.25% |
| 신오 | 1-50 | dynamax | 86.00% → 86.25% |
| 신오 | 1-50 | tera | 76.38% → 76.75% |
| 신오 | 1-50 | chaos | 90.63% → 90.50% |
| 신오 | 1-50 | z | 77.50% → 77.50% |
| 신오 | 51-100 | basic | 71.63% → 72.13% |
| 신오 | 51-100 | mega | 75.38% → 76.63% |
| 신오 | 51-100 | dynamax | 89.25% → 88.88% |
| 신오 | 51-100 | tera | 76.00% → 75.88% |
| 신오 | 51-100 | chaos | 93.38% → 92.88% |
| 신오 | 51-100 | z | 73.88% → 74.50% |
| 하나 | 1-50 | basic | 73.63% → 73.63% |
| 하나 | 1-50 | mega | 75.88% → 75.88% |
| 하나 | 1-50 | dynamax | 85.88% → 85.88% |
| 하나 | 1-50 | tera | 75.25% → 75.25% |
| 하나 | 1-50 | chaos | 89.50% → 89.50% |
| 하나 | 1-50 | z | 76.25% → 76.25% |
| 하나 | 51-100 | basic | 71.00% → 71.00% |
| 하나 | 51-100 | mega | 75.13% → 75.13% |
| 하나 | 51-100 | dynamax | 89.25% → 89.25% |
| 하나 | 51-100 | tera | 76.00% → 76.00% |
| 하나 | 51-100 | chaos | 93.38% → 93.38% |
| 하나 | 51-100 | z | 73.00% → 73.00% |
| 칼로스 | 1-50 | basic | 72.38% → 72.38% |
| 칼로스 | 1-50 | mega | 75.13% → 75.13% |
| 칼로스 | 1-50 | dynamax | 86.25% → 86.00% |
| 칼로스 | 1-50 | tera | 74.25% → 74.38% |
| 칼로스 | 1-50 | chaos | 90.25% → 90.00% |
| 칼로스 | 1-50 | z | 75.38% → 75.38% |
| 칼로스 | 51-100 | basic | 68.88% → 68.88% |
| 칼로스 | 51-100 | mega | 72.50% → 72.25% |
| 칼로스 | 51-100 | dynamax | 88.63% → 88.50% |
| 칼로스 | 51-100 | tera | 74.38% → 74.25% |
| 칼로스 | 51-100 | chaos | 92.00% → 92.00% |
| 칼로스 | 51-100 | z | 71.13% → 71.13% |
| 알로라 | 1-50 | basic | 75.25% → 75.25% |
| 알로라 | 1-50 | mega | 76.88% → 76.88% |
| 알로라 | 1-50 | dynamax | 86.63% → 86.63% |
| 알로라 | 1-50 | tera | 77.25% → 77.25% |
| 알로라 | 1-50 | chaos | 89.75% → 89.75% |
| 알로라 | 1-50 | z | 77.50% → 77.50% |
| 알로라 | 51-100 | basic | 70.25% → 70.25% |
| 알로라 | 51-100 | mega | 74.50% → 74.50% |
| 알로라 | 51-100 | dynamax | 89.00% → 89.00% |
| 알로라 | 51-100 | tera | 75.50% → 75.50% |
| 알로라 | 51-100 | chaos | 92.63% → 92.63% |
| 알로라 | 51-100 | z | 72.88% → 72.88% |
| 가라르 | 1-50 | basic | 72.38% → 72.38% |
| 가라르 | 1-50 | mega | 74.25% → 74.25% |
| 가라르 | 1-50 | dynamax | 84.13% → 84.13% |
| 가라르 | 1-50 | tera | 74.38% → 74.38% |
| 가라르 | 1-50 | chaos | 88.63% → 88.63% |
| 가라르 | 1-50 | z | 74.88% → 74.88% |
| 가라르 | 51-100 | basic | 67.50% → 67.38% |
| 가라르 | 51-100 | mega | 70.38% → 70.25% |
| 가라르 | 51-100 | dynamax | 86.50% → 86.38% |
| 가라르 | 51-100 | tera | 70.75% → 70.75% |
| 가라르 | 51-100 | chaos | 90.25% → 90.00% |
| 가라르 | 51-100 | z | 69.38% → 69.25% |
| 팔데아 | 1-50 | basic | 74.13% → 74.25% |
| 팔데아 | 1-50 | mega | 76.63% → 76.63% |
| 팔데아 | 1-50 | dynamax | 85.50% → 85.38% |
| 팔데아 | 1-50 | tera | 76.00% → 76.00% |
| 팔데아 | 1-50 | chaos | 89.50% → 89.50% |
| 팔데아 | 1-50 | z | 76.88% → 77.13% |
| 팔데아 | 51-100 | basic | 69.50% → 69.25% |
| 팔데아 | 51-100 | mega | 73.50% → 73.38% |
| 팔데아 | 51-100 | dynamax | 87.75% → 87.75% |
| 팔데아 | 51-100 | tera | 73.88% → 73.63% |
| 팔데아 | 51-100 | chaos | 90.38% → 90.38% |
| 팔데아 | 51-100 | z | 72.00% → 71.88% |

## C. NPC별 승률

정규 경로에서 관측된 123개 네임드를 표시한다. 기존 데이터 전체의 검토와 전투 표본의 범위는 다르다. 조직 이벤트 NPC 등 이번 정규 경로에 등장하지 않은 대상은 수치를 만들어 넣지 않았다.

| NPC / ID | 구간 | 전투 수 | 이전 | 이후 | 변화 |
| --- | --- | --- | --- | --- | --- |
| 민화 / named-erika | 1-50 | 48 | 77.08% | 77.08% | +0.00%p |
| 비주기 / named-giovanni-gym | 1-50 | 24 | 100.00% | 100.00% | +0.00%p |
| 웅 / named-brock | 1-50 | 48 | 87.50% | 87.50% | +0.00%p |
| 강연 / named-blaine | 1-50 | 72 | 100.00% | 100.00% | +0.00%p |
| 목호 / named-lance-kanto | 1-50 | 96 | 58.33% | 58.33% | +0.00%p |
| 시바 / named-bruno-kanto | 1-50 | 96 | 87.50% | 87.50% | +0.00%p |
| 칸나 / named-lorelei | 1-50 | 96 | 78.13% | 78.13% | +0.00%p |
| 초련 / named-sabrina | 1-50 | 72 | 73.61% | 73.61% | +0.00%p |
| 마티스 / named-ltsurge | 1-50 | 72 | 100.00% | 100.00% | +0.00%p |
| 국화 / named-agatha | 1-50 | 96 | 71.88% | 71.88% | +0.00%p |
| 독수 / named-koga-kanto | 1-50 | 72 | 95.83% | 95.83% | +0.00%p |
| 이슬 / named-misty | 1-50 | 72 | 80.56% | 80.56% | +0.00%p |
| 그린 / named-blue | 1-50 | 96 | 83.33% | 83.33% | +0.00%p |
| 비주기 / named-giovanni-gym | 51-100 | 72 | 95.83% | 95.83% | +0.00%p |
| 이슬 / named-misty | 51-100 | 72 | 65.28% | 65.28% | +0.00%p |
| 초련 / named-sabrina | 51-100 | 72 | 98.61% | 98.61% | +0.00%p |
| 강연 / named-blaine | 51-100 | 72 | 100.00% | 100.00% | +0.00%p |
| 국화 / named-agatha | 51-100 | 96 | 46.88% | 46.88% | +0.00%p |
| 칸나 / named-lorelei | 51-100 | 96 | 56.25% | 56.25% | +0.00%p |
| 마티스 / named-ltsurge | 51-100 | 72 | 88.89% | 88.89% | +0.00%p |
| 목호 / named-lance-kanto | 51-100 | 96 | 67.71% | 67.71% | +0.00%p |
| 시바 / named-bruno-kanto | 51-100 | 96 | 85.42% | 85.42% | +0.00%p |
| 독수 / named-koga-kanto | 51-100 | 48 | 87.50% | 87.50% | +0.00%p |
| 웅 / named-brock | 51-100 | 48 | 81.25% | 81.25% | +0.00%p |
| 민화 / named-erika | 51-100 | 24 | 79.17% | 79.17% | +0.00%p |
| 그린 / named-blue | 51-100 | 96 | 80.21% | 80.21% | +0.00%p |
| 류옹 / named-pryce | 1-50 | 48 | 60.42% | 60.42% | +0.00%p |
| 규리 / named-jasmine | 1-50 | 96 | 92.71% | 92.71% | +0.00%p |
| 꼭두 / named-whitney | 1-50 | 72 | 55.56% | 55.56% | +0.00%p |
| 이향 / named-clair | 1-50 | 72 | 41.67% | 41.67% | +0.00%p |
| 독수 / named-koga | 1-50 | 96 | 87.50% | 87.50% | +0.00%p |
| 시바 / named-bruno | 1-50 | 96 | 83.33% | 83.33% | +0.00%p |
| 일목 / named-will | 1-50 | 96 | 71.88% | 71.88% | +0.00%p |
| 호일 / named-bugsy | 1-50 | 72 | 75.00% | 75.00% | +0.00%p |
| 카렌 / named-karen | 1-50 | 96 | 62.50% | 62.50% | +0.00%p |
| 유빈 / named-morty | 1-50 | 72 | 63.89% | 63.89% | +0.00%p |
| 비상 / named-falkner | 1-50 | 24 | 50.00% | 50.00% | +0.00%p |
| 사도 / named-chuck | 1-50 | 24 | 87.50% | 87.50% | +0.00%p |
| 목호 / named-lance | 1-50 | 96 | 43.75% | 30.21% | -13.54%p |
| 비상 / named-falkner | 51-100 | 72 | 87.50% | 87.50% | +0.00%p |
| 꼭두 / named-whitney | 51-100 | 72 | 73.61% | 73.61% | +0.00%p |
| 시바 / named-bruno | 51-100 | 96 | 64.58% | 64.58% | +0.00%p |
| 카렌 / named-karen | 51-100 | 96 | 70.83% | 70.83% | +0.00%p |
| 독수 / named-koga | 51-100 | 96 | 70.83% | 70.83% | +0.00%p |
| 규리 / named-jasmine | 51-100 | 48 | 85.42% | 70.83% | -14.58%p |
| 호일 / named-bugsy | 51-100 | 72 | 91.67% | 91.67% | +0.00%p |
| 사도 / named-chuck | 51-100 | 96 | 73.96% | 73.96% | +0.00%p |
| 일목 / named-will | 51-100 | 96 | 76.04% | 76.04% | +0.00%p |
| 유빈 / named-morty | 51-100 | 48 | 56.25% | 56.25% | +0.00%p |
| 이향 / named-clair | 51-100 | 48 | 47.92% | 47.92% | +0.00%p |
| 류옹 / named-pryce | 51-100 | 24 | 70.83% | 70.83% | +0.00%p |
| 목호 / named-lance | 51-100 | 96 | 44.79% | 56.25% | +11.46%p |
| 원규 / named-roxanne | 1-50 | 72 | 69.44% | 69.44% | +0.00%p |
| 암페어 / named-wattson | 1-50 | 72 | 77.78% | 77.78% | +0.00%p |
| 윤진 / named-wallace-gym | 1-50 | 48 | 50.00% | 50.00% | +0.00%p |
| 미혜 / named-glacia | 1-50 | 96 | 55.21% | 54.17% | -1.04%p |
| 회연 / named-phoebe | 1-50 | 96 | 95.83% | 95.83% | +0.00%p |
| 권수 / named-drake | 1-50 | 96 | 70.83% | 70.83% | +0.00%p |
| 혁진 / named-sidney | 1-50 | 96 | 77.08% | 77.08% | +0.00%p |
| 풍&란 / named-tateandliza | 1-50 | 48 | 100.00% | 100.00% | +0.00%p |
| 민지 / named-flannery | 1-50 | 72 | 100.00% | 100.00% | +0.00%p |
| 종길 / named-norman | 1-50 | 48 | 87.50% | 87.50% | +0.00%p |
| 아단 / named-juan | 1-50 | 48 | 79.17% | 79.17% | +0.00%p |
| 은송 / named-winona | 1-50 | 48 | 75.00% | 75.00% | +0.00%p |
| 철구 / named-brawly | 1-50 | 24 | 83.33% | 83.33% | +0.00%p |
| 성호 / named-steven | 1-50 | 96 | 43.75% | 43.75% | +0.00%p |
| 원규 / named-roxanne | 51-100 | 72 | 84.72% | 84.72% | +0.00%p |
| 풍&란 / named-tateandliza | 51-100 | 72 | 93.06% | 93.06% | +0.00%p |
| 혁진 / named-sidney | 51-100 | 96 | 78.13% | 78.13% | +0.00%p |
| 회연 / named-phoebe | 51-100 | 96 | 91.67% | 91.67% | +0.00%p |
| 권수 / named-drake | 51-100 | 96 | 53.13% | 53.13% | +0.00%p |
| 종길 / named-norman | 51-100 | 72 | 65.28% | 65.28% | +0.00%p |
| 윤진 / named-wallace-gym | 51-100 | 48 | 60.42% | 60.42% | +0.00%p |
| 민지 / named-flannery | 51-100 | 48 | 100.00% | 100.00% | +0.00%p |
| 미혜 / named-glacia | 51-100 | 96 | 62.50% | 53.13% | -9.38%p |
| 철구 / named-brawly | 51-100 | 24 | 100.00% | 100.00% | +0.00%p |
| 은송 / named-winona | 51-100 | 48 | 79.17% | 79.17% | +0.00%p |
| 아단 / named-juan | 51-100 | 72 | 70.83% | 70.83% | +0.00%p |
| 암페어 / named-wattson | 51-100 | 24 | 83.33% | 83.33% | +0.00%p |
| 성호 / named-steven | 51-100 | 96 | 66.67% | 66.67% | +0.00%p |
| 맥실러 / named-crasherwake | 1-50 | 48 | 43.75% | 43.75% | +0.00%p |
| 유채 / named-gardenia | 1-50 | 72 | 80.56% | 80.56% | +0.00%p |
| 전진 / named-volkner | 1-50 | 72 | 76.39% | 76.39% | +0.00%p |
| 강석 / named-roark | 1-50 | 96 | 85.42% | 85.42% | +0.00%p |
| 오엽 / named-lucian | 1-50 | 96 | 83.33% | 83.33% | +0.00%p |
| 충호 / named-aaron | 1-50 | 96 | 71.88% | 71.88% | +0.00%p |
| 멜리사 / named-fantina | 1-50 | 72 | 54.17% | 54.17% | +0.00%p |
| 자두 / named-maylene | 1-50 | 48 | 87.50% | 87.50% | +0.00%p |
| 대엽 / named-flint | 1-50 | 96 | 98.96% | 98.96% | +0.00%p |
| 들국화 / named-bertha | 1-50 | 96 | 98.96% | 100.00% | +1.04%p |
| 동관 / named-byron | 1-50 | 48 | 100.00% | 100.00% | +0.00%p |
| 무청 / named-candice | 1-50 | 24 | 83.33% | 83.33% | +0.00%p |
| 난천 / named-cynthia | 1-50 | 96 | 70.83% | 80.21% | +9.38%p |
| 멜리사 / named-fantina | 51-100 | 72 | 54.17% | 54.17% | +0.00%p |
| 유채 / named-gardenia | 51-100 | 72 | 86.11% | 86.11% | +0.00%p |
| 강석 / named-roark | 51-100 | 48 | 100.00% | 100.00% | +0.00%p |
| 충호 / named-aaron | 51-100 | 96 | 78.13% | 78.13% | +0.00%p |
| 대엽 / named-flint | 51-100 | 96 | 100.00% | 100.00% | +0.00%p |
| 오엽 / named-lucian | 51-100 | 96 | 100.00% | 100.00% | +0.00%p |
| 맥실러 / named-crasherwake | 51-100 | 48 | 50.00% | 50.00% | +0.00%p |
| 자두 / named-maylene | 51-100 | 96 | 92.71% | 92.71% | +0.00%p |
| 전진 / named-volkner | 51-100 | 96 | 63.54% | 63.54% | +0.00%p |
| 동관 / named-byron | 51-100 | 24 | 100.00% | 100.00% | +0.00%p |
| 들국화 / named-bertha | 51-100 | 96 | 80.21% | 84.38% | +4.17%p |
| 무청 / named-candice | 51-100 | 24 | 62.50% | 87.50% | +25.00%p |
| 난천 / named-cynthia | 51-100 | 96 | 73.96% | 75.00% | +1.04%p |
| 사간 / named-drayden | 1-50 | 96 | 46.88% | 46.88% | +0.00%p |
| 체렌 / named-cheren | 1-50 | 72 | 37.50% | 37.50% | +0.00%p |
| 알로에 / named-lenora | 1-50 | 72 | 81.94% | 81.94% | +0.00%p |
| 야콘 / named-clay | 1-50 | 24 | 100.00% | 100.00% | +0.00%p |
| 카틀레야 / named-caitlin | 1-50 | 96 | 81.25% | 81.25% | +0.00%p |
| 망초 / named-shauntal | 1-50 | 96 | 70.83% | 70.83% | +0.00%p |
| 시즈 / named-marlon | 1-50 | 24 | 66.67% | 66.67% | +0.00%p |
| 덴트 / named-cilan | 1-50 | 48 | 85.42% | 85.42% | +0.00%p |
| 블래리 / named-grimsley | 1-50 | 96 | 94.79% | 94.79% | +0.00%p |
| 풍란 / named-skyla | 1-50 | 24 | 87.50% | 87.50% | +0.00%p |
| 콘 / named-cress | 1-50 | 24 | 45.83% | 45.83% | +0.00%p |
| 연무 / named-marshal | 1-50 | 96 | 95.83% | 95.83% | +0.00%p |
| 보미카 / named-roxie | 1-50 | 72 | 91.67% | 91.67% | +0.00%p |
| 팟 / named-chili | 1-50 | 24 | 79.17% | 79.17% | +0.00%p |
| 노간주 / named-alder | 1-50 | 96 | 71.88% | 71.88% | +0.00%p |
| 카밀레 / named-elesa | 51-100 | 48 | 77.08% | 77.08% | +0.00%p |
| 시즈 / named-marlon | 51-100 | 72 | 65.28% | 65.28% | +0.00%p |
| 보미카 / named-roxie | 51-100 | 48 | 68.75% | 68.75% | +0.00%p |
| 카틀레야 / named-caitlin | 51-100 | 96 | 100.00% | 100.00% | +0.00%p |
| 연무 / named-marshal | 51-100 | 96 | 98.96% | 98.96% | +0.00%p |
| 망초 / named-shauntal | 51-100 | 96 | 73.96% | 73.96% | +0.00%p |
| 알로에 / named-lenora | 51-100 | 24 | 87.50% | 87.50% | +0.00%p |
| 팟 / named-chili | 51-100 | 48 | 85.42% | 85.42% | +0.00%p |
| 블래리 / named-grimsley | 51-100 | 96 | 59.38% | 59.38% | +0.00%p |
| 야콘 / named-clay | 51-100 | 48 | 91.67% | 91.67% | +0.00%p |
| 콘 / named-cress | 51-100 | 24 | 87.50% | 87.50% | +0.00%p |
| 아티 / named-burgh | 51-100 | 48 | 79.17% | 79.17% | +0.00%p |
| 사간 / named-drayden | 51-100 | 24 | 50.00% | 50.00% | +0.00%p |
| 덴트 / named-cilan | 51-100 | 72 | 83.33% | 83.33% | +0.00%p |
| 풍란 / named-skyla | 51-100 | 24 | 70.83% | 70.83% | +0.00%p |
| 노간주 / named-alder | 51-100 | 96 | 76.04% | 76.04% | +0.00%p |
| 코르니 / named-korrina | 1-50 | 48 | 83.33% | 83.33% | +0.00%p |
| 비올라 / named-viola | 1-50 | 24 | 100.00% | 100.00% | +0.00%p |
| 마슈 / named-valerie | 1-50 | 48 | 87.50% | 87.50% | +0.00%p |
| 시트론 / named-clemont | 1-50 | 48 | 68.75% | 68.75% | +0.00%p |
| 간피 / named-wikstrom | 1-50 | 96 | 93.75% | 93.75% | +0.00%p |
| 즈미 / named-siebold | 1-50 | 96 | 67.71% | 67.71% | +0.00%p |
| 드라세나 / named-drasna | 1-50 | 96 | 75.00% | 75.00% | +0.00%p |
| 우르프 / named-wulfric | 1-50 | 48 | 81.25% | 75.00% | -6.25%p |
| 자크로 / named-grant | 1-50 | 72 | 83.33% | 83.33% | +0.00%p |
| 후쿠지 / named-ramos | 1-50 | 96 | 84.38% | 84.38% | +0.00%p |
| 고지카 / named-olympia | 1-50 | 96 | 57.29% | 57.29% | +0.00%p |
| 파키라 / named-malva | 1-50 | 96 | 73.96% | 73.96% | +0.00%p |
| 카르네 / named-diantha | 1-50 | 96 | 34.38% | 34.38% | +0.00%p |
| 후쿠지 / named-ramos | 51-100 | 48 | 79.17% | 79.17% | +0.00%p |
| 우르프 / named-wulfric | 51-100 | 48 | 77.08% | 68.75% | -8.33%p |
| 고지카 / named-olympia | 51-100 | 24 | 100.00% | 100.00% | +0.00%p |
| 자크로 / named-grant | 51-100 | 48 | 62.50% | 62.50% | +0.00%p |
| 즈미 / named-siebold | 51-100 | 96 | 54.17% | 54.17% | +0.00%p |
| 드라세나 / named-drasna | 51-100 | 96 | 59.38% | 59.38% | +0.00%p |
| 간피 / named-wikstrom | 51-100 | 96 | 89.58% | 89.58% | +0.00%p |
| 시트론 / named-clemont | 51-100 | 72 | 68.06% | 68.06% | +0.00%p |
| 비올라 / named-viola | 51-100 | 96 | 75.00% | 75.00% | +0.00%p |
| 파키라 / named-malva | 51-100 | 96 | 68.75% | 68.75% | +0.00%p |
| 코르니 / named-korrina | 51-100 | 96 | 95.83% | 95.83% | +0.00%p |
| 마슈 / named-valerie | 51-100 | 48 | 75.00% | 75.00% | +0.00%p |
| 카르네 / named-diantha | 51-100 | 96 | 43.75% | 43.75% | +0.00%p |
| 일리마 / named-ilima | 1-50 | 48 | 75.00% | 75.00% | +0.00%p |
| 말리화 / named-mina | 1-50 | 96 | 73.96% | 73.96% | +0.00%p |
| 아세로라 / named-acerola-captain | 1-50 | 72 | 66.67% | 66.67% | +0.00%p |
| 라이치 / named-olivia | 1-50 | 96 | 96.88% | 96.88% | +0.00%p |
| 카일리 / named-kahili | 1-50 | 96 | 100.00% | 100.00% | +0.00%p |
| 마오 / named-mallow | 1-50 | 72 | 91.67% | 91.67% | +0.00%p |
| 멀레인 / named-molayne | 1-50 | 96 | 97.92% | 97.92% | +0.00%p |
| 아세로라 / named-acerola | 1-50 | 96 | 57.29% | 57.29% | +0.00%p |
| 수련 / named-lana | 1-50 | 72 | 66.67% | 66.67% | +0.00%p |
| 마마네 / named-sophocles | 1-50 | 48 | 77.08% | 77.08% | +0.00%p |
| 키아웨 / named-kiawe | 1-50 | 72 | 94.44% | 94.44% | +0.00%p |
| 쿠쿠이 / named-kukui | 1-50 | 96 | 72.92% | 72.92% | +0.00%p |
| 마오 / named-mallow | 51-100 | 72 | 65.28% | 65.28% | +0.00%p |
| 말리화 / named-mina | 51-100 | 48 | 79.17% | 79.17% | +0.00%p |
| 마마네 / named-sophocles | 51-100 | 96 | 64.58% | 64.58% | +0.00%p |
| 아세로라 / named-acerola | 51-100 | 96 | 40.63% | 40.63% | +0.00%p |
| 멀레인 / named-molayne | 51-100 | 96 | 98.96% | 98.96% | +0.00%p |
| 라이치 / named-olivia | 51-100 | 96 | 89.58% | 89.58% | +0.00%p |
| 키아웨 / named-kiawe | 51-100 | 48 | 93.75% | 93.75% | +0.00%p |
| 일리마 / named-ilima | 51-100 | 96 | 100.00% | 100.00% | +0.00%p |
| 수련 / named-lana | 51-100 | 96 | 53.13% | 53.13% | +0.00%p |
| 아세로라 / named-acerola-captain | 51-100 | 24 | 50.00% | 50.00% | +0.00%p |
| 카일리 / named-kahili | 51-100 | 96 | 94.79% | 94.79% | +0.00%p |
| 쿠쿠이 / named-kukui | 51-100 | 96 | 80.21% | 80.21% | +0.00%p |
| 어니언 / named-allister | 1-50 | 72 | 38.89% | 38.89% | +0.00%p |
| 금랑 / named-raihan | 1-50 | 48 | 62.50% | 62.50% | +0.00%p |
| 포플러 / named-opal | 1-50 | 72 | 70.83% | 70.83% | +0.00%p |
| 아킬 / named-milo | 1-50 | 48 | 79.17% | 79.17% | +0.00%p |
| 마리 / named-marnie | 1-50 | 96 | 82.29% | 82.29% | +0.00%p |
| 호브 / named-hop | 1-50 | 96 | 73.96% | 73.96% | +0.00%p |
| 멜론 / named-melony | 1-50 | 48 | 87.50% | 87.50% | +0.00%p |
| 두송 / named-piers | 1-50 | 72 | 77.78% | 77.78% | +0.00%p |
| 비트 / named-bede | 1-50 | 96 | 91.67% | 91.67% | +0.00%p |
| 순무 / named-kabu | 1-50 | 48 | 89.58% | 89.58% | +0.00%p |
| 금랑 / named-raihan-cup | 1-50 | 96 | 61.46% | 61.46% | +0.00%p |
| 야청 / named-nessa | 1-50 | 24 | 100.00% | 100.00% | +0.00%p |
| 마쿠와 / named-gordie | 1-50 | 24 | 91.67% | 91.67% | +0.00%p |
| 채두 / named-bea | 1-50 | 24 | 100.00% | 100.00% | +0.00%p |
| 단델 / named-leon | 1-50 | 96 | 10.42% | 10.42% | +0.00%p |
| 아킬 / named-milo | 51-100 | 24 | 87.50% | 87.50% | +0.00%p |
| 포플러 / named-opal | 51-100 | 48 | 41.67% | 41.67% | +0.00%p |
| 어니언 / named-allister | 51-100 | 24 | 45.83% | 45.83% | +0.00%p |
| 호브 / named-hop | 51-100 | 96 | 64.58% | 64.58% | +0.00%p |
| 마리 / named-marnie | 51-100 | 96 | 63.54% | 63.54% | +0.00%p |
| 비트 / named-bede | 51-100 | 96 | 86.46% | 86.46% | +0.00%p |
| 멜론 / named-melony | 51-100 | 48 | 58.33% | 58.33% | +0.00%p |
| 채두 / named-bea | 51-100 | 48 | 97.92% | 97.92% | +0.00%p |
| 순무 / named-kabu | 51-100 | 96 | 67.71% | 67.71% | +0.00%p |
| 금랑 / named-raihan-cup | 51-100 | 96 | 48.96% | 48.96% | +0.00%p |
| 두송 / named-piers | 51-100 | 48 | 45.83% | 45.83% | +0.00%p |
| 야청 / named-nessa | 51-100 | 72 | 69.44% | 69.44% | +0.00%p |
| 금랑 / named-raihan | 51-100 | 48 | 54.17% | 54.17% | +0.00%p |
| 마쿠와 / named-gordie | 51-100 | 24 | 79.17% | 54.17% | -25.00%p |
| 단델 / named-leon | 51-100 | 96 | 17.71% | 17.71% | +0.00%p |
| 그루샤 / named-grusha | 1-50 | 72 | 65.28% | 65.28% | +0.00%p |
| 청목 / named-larry | 1-50 | 96 | 63.54% | 63.54% | +0.00%p |
| 라임 / named-ryme | 1-50 | 48 | 95.83% | 95.83% | +0.00%p |
| 리파 / named-tulip | 1-50 | 24 | 75.00% | 75.00% | +0.00%p |
| 뽀삐 / named-poppy | 1-50 | 96 | 80.21% | 80.21% | +0.00%p |
| 칠리 / named-rika | 1-50 | 96 | 100.00% | 100.00% | +0.00%p |
| 팔자크 / named-hassel | 1-50 | 96 | 64.58% | 64.58% | +0.00%p |
| 단풍 / named-katy | 1-50 | 72 | 83.33% | 83.33% | +0.00%p |
| 콜사 / named-brassius | 1-50 | 72 | 81.94% | 81.94% | +0.00%p |
| 청목 / named-larry-elite | 1-50 | 96 | 100.00% | 100.00% | +0.00%p |
| 모야모 / named-iono | 1-50 | 96 | 59.38% | 59.38% | +0.00%p |
| 테사 / named-geeta | 1-50 | 96 | 68.75% | 70.83% | +2.08%p |
| 리파 / named-tulip | 51-100 | 96 | 94.79% | 94.79% | +0.00%p |
| 라임 / named-ryme | 51-100 | 48 | 54.17% | 54.17% | +0.00%p |
| 청목 / named-larry | 51-100 | 72 | 45.83% | 45.83% | +0.00%p |
| 그루샤 / named-grusha | 51-100 | 48 | 58.33% | 58.33% | +0.00%p |
| 팔자크 / named-hassel | 51-100 | 96 | 55.21% | 55.21% | +0.00%p |
| 청목 / named-larry-elite | 51-100 | 96 | 65.63% | 65.63% | +0.00%p |
| 칠리 / named-rika | 51-100 | 96 | 95.83% | 95.83% | +0.00%p |
| 콜사 / named-brassius | 51-100 | 96 | 78.13% | 78.13% | +0.00%p |
| 단풍 / named-katy | 51-100 | 48 | 93.75% | 93.75% | +0.00%p |
| 모야모 / named-iono | 51-100 | 48 | 41.67% | 41.67% | +0.00%p |
| 뽀삐 / named-poppy | 51-100 | 96 | 69.79% | 69.79% | +0.00%p |
| 곤포 / named-kofu | 51-100 | 24 | 70.83% | 70.83% | +0.00%p |
| 테사 / named-geeta | 51-100 | 96 | 69.79% | 63.54% | -6.25%p |

## D. 선출 조합 품질

각 경로·층·시드를 한 번씩 세고 플레이어 팀/룰로 반복된 동일 선출은 중복 제거했다. 원시 JSON에는 모든 조합·선봉·마지막 빈도를 보존한다. 표의 대표 조합은 최빈 조합이며 동률이면 관측 순서다.

규리의 Steelix+Skarmory+Bronzong은 총 6개 생성 조건 중 1회→0회다. 전투 조건으로는 24회→0회이며, 서로 독립된 24개 선출을 의미하지 않는다. 별도 256개 층/시드 검증에서도 공격 동료 조건과 후보/순서 변화가 유지됐다.

| NPC | 구간 | 생성 조건 | 이전 최빈 조합(횟수) | 이후 최빈 조합(횟수) | 규칙 |
| --- | --- | --- | --- | --- | --- |
| 민화 | 1-50 | 2 | Shiftry/Tangrowth/Vileplume (2) | Shiftry/Tangrowth/Vileplume (2) | 유지 |
| 비주기 | 1-50 | 1 | Kangaskhan/Nidoking/Rhyperior (1) | Kangaskhan/Nidoking/Rhyperior (1) | 유지 |
| 웅 | 1-50 | 2 | Aerodactyl/Golem/Omastar (2) | Aerodactyl/Golem/Omastar (2) | 유지 |
| 강연 | 1-50 | 3 | Arcanine/Magmortar/Ninetales (3) | Arcanine/Magmortar/Ninetales (3) | 유지 |
| 목호 | 1-50 | 4 | Charizard/Dragonite/Kingdra (4) | Charizard/Dragonite/Kingdra (4) | 유지 |
| 시바 | 1-50 | 4 | Annihilape/Machamp/Steelix (4) | Annihilape/Machamp/Steelix (4) | 유지 |
| 칸나 | 1-50 | 4 | Jynx/Lapras/Mamoswine (4) | Jynx/Lapras/Mamoswine (4) | 유지 |
| 초련 | 1-50 | 3 | Alakazam/Mr. Mime/Slowbro (3) | Alakazam/Mr. Mime/Slowbro (3) | 유지 |
| 마티스 | 1-50 | 3 | Electivire/Magnezone/Raichu (3) | Electivire/Magnezone/Raichu (3) | 유지 |
| 국화 | 1-50 | 4 | Crobat/Gengar/Mismagius (4) | Crobat/Gengar/Mismagius (4) | 유지 |
| 독수 | 1-50 | 3 | Crobat/Muk/Weezing (3) | Crobat/Muk/Weezing (3) | 유지 |
| 이슬 | 1-50 | 3 | Lanturn/Lapras/Starmie (3) | Lanturn/Lapras/Starmie (3) | 유지 |
| 그린 | 1-50 | 4 | Arcanine/Exeggutor/Pidgeot (4) | Arcanine/Exeggutor/Pidgeot (4) | 유지 |
| 비주기 | 51-100 | 3 | Kangaskhan/Nidoking/Rhyperior (3) | Kangaskhan/Nidoking/Rhyperior (3) | 유지 |
| 이슬 | 51-100 | 3 | Lanturn/Lapras/Starmie (3) | Lanturn/Lapras/Starmie (3) | 유지 |
| 초련 | 51-100 | 3 | Alakazam/Mr. Mime/Slowbro (3) | Alakazam/Mr. Mime/Slowbro (3) | 유지 |
| 강연 | 51-100 | 3 | Arcanine/Magmortar/Ninetales (3) | Arcanine/Magmortar/Ninetales (3) | 유지 |
| 국화 | 51-100 | 4 | Crobat/Gengar/Mismagius (4) | Crobat/Gengar/Mismagius (4) | 유지 |
| 칸나 | 51-100 | 4 | Jynx/Lapras/Mamoswine (4) | Jynx/Lapras/Mamoswine (4) | 유지 |
| 마티스 | 51-100 | 3 | Electivire/Magnezone/Raichu (3) | Electivire/Magnezone/Raichu (3) | 유지 |
| 목호 | 51-100 | 4 | Charizard/Dragonite/Kingdra (4) | Charizard/Dragonite/Kingdra (4) | 유지 |
| 시바 | 51-100 | 4 | Annihilape/Machamp/Steelix (4) | Annihilape/Machamp/Steelix (4) | 유지 |
| 독수 | 51-100 | 2 | Crobat/Muk/Weezing (2) | Crobat/Muk/Weezing (2) | 유지 |
| 웅 | 51-100 | 2 | Aerodactyl/Golem/Omastar (2) | Aerodactyl/Golem/Omastar (2) | 유지 |
| 민화 | 51-100 | 1 | Shiftry/Tangrowth/Vileplume (1) | Shiftry/Tangrowth/Vileplume (1) | 유지 |
| 그린 | 51-100 | 4 | Arcanine/Exeggutor/Pidgeot (4) | Arcanine/Exeggutor/Pidgeot (4) | 유지 |
| 류옹 | 1-50 | 2 | Froslass/Mamoswine/Walrein (1) | Froslass/Mamoswine/Walrein (1) | 적용 |
| 규리 | 1-50 | 4 | Empoleon/Skarmory/Steelix (2) | Empoleon/Skarmory/Steelix (2) | 적용 |
| 꼭두 | 1-50 | 3 | Delcatty/Farigiraf/Miltank (1) | Delcatty/Farigiraf/Miltank (1) | 유지 |
| 이향 | 1-50 | 3 | Aerodactyl/Gyarados/Kingdra (2) | Aerodactyl/Gyarados/Kingdra (2) | 유지 |
| 독수 | 1-50 | 4 | Crobat/Muk/Swalot (1) | Crobat/Muk/Swalot (1) | 유지 |
| 시바 | 1-50 | 4 | Hariyama/Lucario/Machamp (2) | Hariyama/Lucario/Machamp (2) | 유지 |
| 일목 | 1-50 | 4 | Gardevoir/Jynx/Xatu (1) | Gardevoir/Jynx/Xatu (1) | 유지 |
| 호일 | 1-50 | 3 | Pinsir/Scizor/Shedinja (1) | Pinsir/Scizor/Shedinja (1) | 유지 |
| 카렌 | 1-50 | 4 | Houndoom/Spiritomb/Umbreon (2) | Houndoom/Spiritomb/Umbreon (2) | 유지 |
| 유빈 | 1-50 | 3 | Drifblim/Gengar/Sableye (1) | Drifblim/Gengar/Sableye (1) | 유지 |
| 비상 | 1-50 | 1 | Honchkrow/Pidgeot/Staraptor (1) | Honchkrow/Pidgeot/Staraptor (1) | 유지 |
| 사도 | 1-50 | 1 | Hitmonchan/Hitmonlee/Poliwrath (1) | Hitmonchan/Hitmonlee/Poliwrath (1) | 유지 |
| 목호 | 1-50 | 4 | Charizard/Dragonite/Gyarados (4) | Charizard/Dragonite/Gyarados (4) | 적용 |
| 비상 | 51-100 | 3 | Honchkrow/Pelipper/Pidgeot (2) | Honchkrow/Pelipper/Pidgeot (2) | 유지 |
| 꼭두 | 51-100 | 3 | Delcatty/Lickilicky/Miltank (1) | Delcatty/Lickilicky/Miltank (1) | 유지 |
| 시바 | 51-100 | 4 | Hitmonlee/Lucario/Machamp (1) | Hitmonlee/Lucario/Machamp (1) | 유지 |
| 카렌 | 51-100 | 4 | Honchkrow/Spiritomb/Umbreon (2) | Honchkrow/Spiritomb/Umbreon (2) | 유지 |
| 독수 | 51-100 | 4 | Crobat/Muk/Skuntank (2) | Crobat/Muk/Skuntank (2) | 유지 |
| 규리 | 51-100 | 2 | Bronzong/Empoleon/Steelix (1) | Bronzong/Empoleon/Steelix (1) | 적용 |
| 호일 | 51-100 | 3 | Pinsir/Scizor/Yanmega (1) | Pinsir/Scizor/Yanmega (1) | 유지 |
| 사도 | 51-100 | 4 | Annihilape/Medicham/Poliwrath (2) | Annihilape/Medicham/Poliwrath (2) | 유지 |
| 일목 | 51-100 | 4 | Gardevoir/Slowbro/Xatu (2) | Gardevoir/Slowbro/Xatu (2) | 유지 |
| 유빈 | 51-100 | 2 | Drifblim/Gengar/Sableye (1) | Drifblim/Gengar/Sableye (1) | 유지 |
| 이향 | 51-100 | 2 | Aerodactyl/Gyarados/Kingdra (2) | Aerodactyl/Gyarados/Kingdra (2) | 유지 |
| 류옹 | 51-100 | 1 | Glalie/Mamoswine/Walrein (1) | Glalie/Mamoswine/Walrein (1) | 적용 |
| 목호 | 51-100 | 4 | Charizard/Dragonite/Gyarados (4) | Charizard/Dragonite/Gyarados (4) | 적용 |
| 원규 | 1-50 | 3 | Aerodactyl/Cradily/Probopass (3) | Aerodactyl/Cradily/Probopass (3) | 유지 |
| 암페어 | 1-50 | 3 | Electivire/Magnezone/Manectric (3) | Electivire/Magnezone/Manectric (3) | 유지 |
| 윤진 | 1-50 | 2 | Gyarados/Ludicolo/Milotic (2) | Gyarados/Ludicolo/Milotic (2) | 유지 |
| 미혜 | 1-50 | 4 | Abomasnow/Froslass/Walrein (4) | Abomasnow/Froslass/Walrein (4) | 적용 |
| 회연 | 1-50 | 4 | Banette/Dusknoir/Sableye (4) | Banette/Dusknoir/Sableye (4) | 유지 |
| 권수 | 1-50 | 4 | Dragonite/Kingdra/Salamence (4) | Dragonite/Kingdra/Salamence (4) | 유지 |
| 혁진 | 1-50 | 4 | Absol/Crawdaunt/Shiftry (4) | Absol/Crawdaunt/Shiftry (4) | 유지 |
| 풍&란 | 1-50 | 2 | Bronzong/Claydol/Solrock (2) | Bronzong/Claydol/Solrock (2) | 유지 |
| 민지 | 1-50 | 3 | Blaziken/Ninetales/Torkoal (3) | Blaziken/Ninetales/Torkoal (3) | 유지 |
| 종길 | 1-50 | 2 | Blissey/Kangaskhan/Slaking (2) | Blissey/Kangaskhan/Slaking (2) | 유지 |
| 아단 | 1-50 | 2 | Crawdaunt/Kingdra/Walrein (2) | Crawdaunt/Kingdra/Walrein (2) | 유지 |
| 은송 | 1-50 | 2 | Altaria/Skarmory/Tropius (2) | Altaria/Skarmory/Tropius (2) | 유지 |
| 철구 | 1-50 | 1 | Hariyama/Lucario/Machamp (1) | Hariyama/Lucario/Machamp (1) | 유지 |
| 성호 | 1-50 | 4 | Claydol/Cradily/Metagross (4) | Claydol/Cradily/Metagross (4) | 유지 |
| 원규 | 51-100 | 3 | Aerodactyl/Cradily/Probopass (3) | Aerodactyl/Cradily/Probopass (3) | 유지 |
| 풍&란 | 51-100 | 3 | Bronzong/Claydol/Solrock (3) | Bronzong/Claydol/Solrock (3) | 유지 |
| 혁진 | 51-100 | 4 | Absol/Crawdaunt/Shiftry (4) | Absol/Crawdaunt/Shiftry (4) | 유지 |
| 회연 | 51-100 | 4 | Banette/Dusknoir/Sableye (4) | Banette/Dusknoir/Sableye (4) | 유지 |
| 권수 | 51-100 | 4 | Dragonite/Kingdra/Salamence (4) | Dragonite/Kingdra/Salamence (4) | 유지 |
| 종길 | 51-100 | 3 | Blissey/Kangaskhan/Slaking (3) | Blissey/Kangaskhan/Slaking (3) | 유지 |
| 윤진 | 51-100 | 2 | Gyarados/Ludicolo/Milotic (2) | Gyarados/Ludicolo/Milotic (2) | 유지 |
| 민지 | 51-100 | 2 | Blaziken/Ninetales/Torkoal (2) | Blaziken/Ninetales/Torkoal (2) | 유지 |
| 미혜 | 51-100 | 4 | Abomasnow/Froslass/Walrein (4) | Abomasnow/Froslass/Walrein (4) | 적용 |
| 철구 | 51-100 | 1 | Hariyama/Lucario/Machamp (1) | Hariyama/Lucario/Machamp (1) | 유지 |
| 은송 | 51-100 | 2 | Altaria/Skarmory/Tropius (2) | Altaria/Skarmory/Tropius (2) | 유지 |
| 아단 | 51-100 | 3 | Crawdaunt/Kingdra/Walrein (3) | Crawdaunt/Kingdra/Walrein (3) | 유지 |
| 암페어 | 51-100 | 1 | Electivire/Magnezone/Manectric (1) | Electivire/Magnezone/Manectric (1) | 유지 |
| 성호 | 51-100 | 4 | Claydol/Cradily/Metagross (4) | Claydol/Cradily/Metagross (4) | 유지 |
| 맥실러 | 1-50 | 2 | Floatzel/Gyarados/Ludicolo (2) | Floatzel/Gyarados/Ludicolo (2) | 유지 |
| 유채 | 1-50 | 3 | Breloom/Roserade/Torterra (3) | Breloom/Roserade/Torterra (3) | 유지 |
| 전진 | 1-50 | 3 | Electivire/Jolteon/Luxray (3) | Electivire/Jolteon/Luxray (3) | 유지 |
| 강석 | 1-50 | 4 | Aerodactyl/Rampardos/Steelix (4) | Aerodactyl/Rampardos/Steelix (4) | 유지 |
| 오엽 | 1-50 | 4 | Bronzong/Gallade/Slowking (4) | Bronzong/Gallade/Slowking (4) | 유지 |
| 충호 | 1-50 | 4 | Drapion/Scizor/Yanmega (4) | Drapion/Scizor/Yanmega (4) | 유지 |
| 멜리사 | 1-50 | 3 | Gengar/Mismagius/Spiritomb (3) | Gengar/Mismagius/Spiritomb (3) | 유지 |
| 자두 | 1-50 | 2 | Heracross/Infernape/Lucario (2) | Heracross/Infernape/Lucario (2) | 유지 |
| 대엽 | 1-50 | 4 | Arcanine/Infernape/Magmortar (4) | Arcanine/Infernape/Magmortar (4) | 유지 |
| 들국화 | 1-50 | 4 | Gliscor/Hippowdon/Whiscash (4) | Gliscor/Hippowdon/Whiscash (4) | 적용 |
| 동관 | 1-50 | 2 | Bastiodon/Magnezone/Skarmory (2) | Bastiodon/Magnezone/Skarmory (2) | 유지 |
| 무청 | 1-50 | 1 | Abomasnow/Froslass/Mamoswine (1) | Abomasnow/Froslass/Mamoswine (1) | 적용 |
| 난천 | 1-50 | 4 | Garchomp/Lucario/Spiritomb (4) | Garchomp/Lucario/Spiritomb (4) | 적용 |
| 멜리사 | 51-100 | 3 | Gengar/Mismagius/Spiritomb (3) | Gengar/Mismagius/Spiritomb (3) | 유지 |
| 유채 | 51-100 | 3 | Breloom/Roserade/Torterra (3) | Breloom/Roserade/Torterra (3) | 유지 |
| 강석 | 51-100 | 2 | Aerodactyl/Rampardos/Steelix (2) | Aerodactyl/Rampardos/Steelix (2) | 유지 |
| 충호 | 51-100 | 4 | Drapion/Scizor/Yanmega (4) | Drapion/Scizor/Yanmega (4) | 유지 |
| 대엽 | 51-100 | 4 | Arcanine/Infernape/Magmortar (4) | Arcanine/Infernape/Magmortar (4) | 유지 |
| 오엽 | 51-100 | 4 | Bronzong/Gallade/Slowking (4) | Bronzong/Gallade/Slowking (4) | 유지 |
| 맥실러 | 51-100 | 2 | Floatzel/Gyarados/Ludicolo (2) | Floatzel/Gyarados/Ludicolo (2) | 유지 |
| 자두 | 51-100 | 4 | Heracross/Infernape/Lucario (4) | Heracross/Infernape/Lucario (4) | 유지 |
| 전진 | 51-100 | 4 | Electivire/Jolteon/Luxray (4) | Electivire/Jolteon/Luxray (4) | 유지 |
| 동관 | 51-100 | 1 | Bastiodon/Magnezone/Skarmory (1) | Bastiodon/Magnezone/Skarmory (1) | 유지 |
| 들국화 | 51-100 | 4 | Gliscor/Hippowdon/Whiscash (4) | Gliscor/Hippowdon/Whiscash (4) | 적용 |
| 무청 | 51-100 | 1 | Abomasnow/Froslass/Mamoswine (1) | Abomasnow/Froslass/Mamoswine (1) | 적용 |
| 난천 | 51-100 | 4 | Garchomp/Lucario/Spiritomb (4) | Garchomp/Lucario/Spiritomb (4) | 적용 |
| 사간 | 1-50 | 4 | Haxorus/Hydreigon/Salamence (4) | Haxorus/Hydreigon/Salamence (4) | 유지 |
| 체렌 | 1-50 | 3 | Braviary/Porygon-Z/Stoutland (3) | Braviary/Porygon-Z/Stoutland (3) | 유지 |
| 알로에 | 1-50 | 3 | Braviary/Stoutland/Watchog (3) | Braviary/Stoutland/Watchog (3) | 유지 |
| 야콘 | 1-50 | 1 | Excadrill/Mamoswine/Seismitoad (1) | Excadrill/Mamoswine/Seismitoad (1) | 유지 |
| 카틀레야 | 1-50 | 4 | Gallade/Gothitelle/Metagross (4) | Gallade/Gothitelle/Metagross (4) | 유지 |
| 망초 | 1-50 | 4 | Chandelure/Drifblim/Golurk (4) | Chandelure/Drifblim/Golurk (4) | 유지 |
| 시즈 | 1-50 | 1 | Jellicent/Mantine/Seismitoad (1) | Jellicent/Mantine/Seismitoad (1) | 유지 |
| 덴트 | 1-50 | 2 | Ferrothorn/Leavanny/Simisage (2) | Ferrothorn/Leavanny/Simisage (2) | 유지 |
| 블래리 | 1-50 | 4 | Honchkrow/Kingambit/Krookodile (4) | Honchkrow/Kingambit/Krookodile (4) | 유지 |
| 풍란 | 1-50 | 1 | Mandibuzz/Skarmory/Swanna (1) | Mandibuzz/Skarmory/Swanna (1) | 유지 |
| 콘 | 1-50 | 1 | Seismitoad/Simipour/Swanna (1) | Seismitoad/Simipour/Swanna (1) | 유지 |
| 연무 | 1-50 | 4 | Conkeldurr/Lucario/Toxicroak (4) | Conkeldurr/Lucario/Toxicroak (4) | 유지 |
| 보미카 | 1-50 | 3 | Crobat/Drapion/Scolipede (3) | Crobat/Drapion/Scolipede (3) | 유지 |
| 팟 | 1-50 | 1 | Arcanine/Chandelure/Simisear (1) | Arcanine/Chandelure/Simisear (1) | 유지 |
| 노간주 | 1-50 | 4 | Escavalier/Vanilluxe/Volcarona (4) | Escavalier/Vanilluxe/Volcarona (4) | 유지 |
| 카밀레 | 51-100 | 2 | Eelektross/Galvantula/Zebstrika (2) | Eelektross/Galvantula/Zebstrika (2) | 유지 |
| 시즈 | 51-100 | 3 | Jellicent/Mantine/Seismitoad (3) | Jellicent/Mantine/Seismitoad (3) | 유지 |
| 보미카 | 51-100 | 2 | Crobat/Drapion/Scolipede (2) | Crobat/Drapion/Scolipede (2) | 유지 |
| 카틀레야 | 51-100 | 4 | Gallade/Gothitelle/Metagross (4) | Gallade/Gothitelle/Metagross (4) | 유지 |
| 연무 | 51-100 | 4 | Conkeldurr/Lucario/Toxicroak (4) | Conkeldurr/Lucario/Toxicroak (4) | 유지 |
| 망초 | 51-100 | 4 | Chandelure/Drifblim/Golurk (4) | Chandelure/Drifblim/Golurk (4) | 유지 |
| 알로에 | 51-100 | 1 | Braviary/Stoutland/Watchog (1) | Braviary/Stoutland/Watchog (1) | 유지 |
| 팟 | 51-100 | 2 | Arcanine/Chandelure/Simisear (2) | Arcanine/Chandelure/Simisear (2) | 유지 |
| 블래리 | 51-100 | 4 | Honchkrow/Kingambit/Krookodile (4) | Honchkrow/Kingambit/Krookodile (4) | 유지 |
| 야콘 | 51-100 | 2 | Excadrill/Mamoswine/Seismitoad (2) | Excadrill/Mamoswine/Seismitoad (2) | 유지 |
| 콘 | 51-100 | 1 | Seismitoad/Simipour/Swanna (1) | Seismitoad/Simipour/Swanna (1) | 유지 |
| 아티 | 51-100 | 2 | Crustle/Escavalier/Leavanny (2) | Crustle/Escavalier/Leavanny (2) | 유지 |
| 사간 | 51-100 | 1 | Haxorus/Hydreigon/Salamence (1) | Haxorus/Hydreigon/Salamence (1) | 유지 |
| 덴트 | 51-100 | 3 | Ferrothorn/Leavanny/Simisage (3) | Ferrothorn/Leavanny/Simisage (3) | 유지 |
| 풍란 | 51-100 | 1 | Mandibuzz/Skarmory/Swanna (1) | Mandibuzz/Skarmory/Swanna (1) | 유지 |
| 노간주 | 51-100 | 4 | Escavalier/Vanilluxe/Volcarona (4) | Escavalier/Vanilluxe/Volcarona (4) | 유지 |
| 코르니 | 1-50 | 2 | Hawlucha/Heracross/Lucario (2) | Hawlucha/Heracross/Lucario (2) | 유지 |
| 비올라 | 1-50 | 1 | Beedrill/Vivillon/Yanmega (1) | Beedrill/Vivillon/Yanmega (1) | 유지 |
| 마슈 | 1-50 | 2 | Mawile/Sylveon/Togekiss (2) | Mawile/Sylveon/Togekiss (2) | 유지 |
| 시트론 | 1-50 | 2 | Ampharos/Heliolisk/Magnezone (2) | Ampharos/Heliolisk/Magnezone (2) | 유지 |
| 간피 | 1-50 | 4 | Aegislash/Probopass/Scizor (4) | Aegislash/Probopass/Scizor (4) | 유지 |
| 즈미 | 1-50 | 4 | Barbaracle/Gyarados/Kingdra (4) | Barbaracle/Gyarados/Kingdra (4) | 유지 |
| 드라세나 | 1-50 | 4 | Altaria/Kingdra/Noivern (4) | Altaria/Kingdra/Noivern (4) | 유지 |
| 우르프 | 1-50 | 2 | Abomasnow/Avalugg/Walrein (2) | Abomasnow/Avalugg/Walrein (2) | 적용 |
| 자크로 | 1-50 | 3 | Aerodactyl/Barbaracle/Tyrantrum (3) | Aerodactyl/Barbaracle/Tyrantrum (3) | 유지 |
| 후쿠지 | 1-50 | 4 | Ferrothorn/Gogoat/Venusaur (4) | Ferrothorn/Gogoat/Venusaur (4) | 유지 |
| 고지카 | 1-50 | 4 | Espeon/Gardevoir/Meowstic (4) | Espeon/Gardevoir/Meowstic (4) | 유지 |
| 파키라 | 1-50 | 4 | Chandelure/Houndoom/Talonflame (4) | Chandelure/Houndoom/Talonflame (4) | 유지 |
| 카르네 | 1-50 | 4 | Aurorus/Gardevoir/Goodra (4) | Aurorus/Gardevoir/Goodra (4) | 유지 |
| 후쿠지 | 51-100 | 2 | Ferrothorn/Gogoat/Venusaur (2) | Ferrothorn/Gogoat/Venusaur (2) | 유지 |
| 우르프 | 51-100 | 2 | Abomasnow/Avalugg/Walrein (2) | Abomasnow/Avalugg/Walrein (2) | 적용 |
| 고지카 | 51-100 | 1 | Espeon/Gardevoir/Meowstic (1) | Espeon/Gardevoir/Meowstic (1) | 유지 |
| 자크로 | 51-100 | 2 | Aerodactyl/Barbaracle/Tyrantrum (2) | Aerodactyl/Barbaracle/Tyrantrum (2) | 유지 |
| 즈미 | 51-100 | 4 | Barbaracle/Gyarados/Kingdra (4) | Barbaracle/Gyarados/Kingdra (4) | 유지 |
| 드라세나 | 51-100 | 4 | Altaria/Kingdra/Noivern (4) | Altaria/Kingdra/Noivern (4) | 유지 |
| 간피 | 51-100 | 4 | Aegislash/Probopass/Scizor (4) | Aegislash/Probopass/Scizor (4) | 유지 |
| 시트론 | 51-100 | 3 | Ampharos/Heliolisk/Magnezone (3) | Ampharos/Heliolisk/Magnezone (3) | 유지 |
| 비올라 | 51-100 | 4 | Beedrill/Vivillon/Yanmega (4) | Beedrill/Vivillon/Yanmega (4) | 유지 |
| 파키라 | 51-100 | 4 | Chandelure/Houndoom/Talonflame (4) | Chandelure/Houndoom/Talonflame (4) | 유지 |
| 코르니 | 51-100 | 4 | Hawlucha/Heracross/Lucario (4) | Hawlucha/Heracross/Lucario (4) | 유지 |
| 마슈 | 51-100 | 2 | Mawile/Sylveon/Togekiss (2) | Mawile/Sylveon/Togekiss (2) | 유지 |
| 카르네 | 51-100 | 4 | Aurorus/Gardevoir/Goodra (4) | Aurorus/Gardevoir/Goodra (4) | 유지 |
| 일리마 | 1-50 | 2 | Bewear/Gumshoos/Tauros (2) | Bewear/Gumshoos/Tauros (2) | 유지 |
| 말리화 | 1-50 | 4 | Clefable/Mawile/Ribombee (4) | Clefable/Mawile/Ribombee (4) | 유지 |
| 아세로라 | 1-50 | 3 | Dhelmise/Mimikyu/Palossand (3) | Dhelmise/Mimikyu/Palossand (3) | 유지 |
| 라이치 | 1-50 | 4 | Armaldo/Lycanroc/Relicanth (4) | Armaldo/Lycanroc/Relicanth (4) | 유지 |
| 카일리 | 1-50 | 4 | Crobat/Skarmory/Toucannon (4) | Crobat/Skarmory/Toucannon (4) | 유지 |
| 마오 | 1-50 | 3 | Leafeon/Roserade/Tsareena (3) | Leafeon/Roserade/Tsareena (3) | 유지 |
| 멀레인 | 1-50 | 4 | Forretress/Kingambit/Metagross (4) | Forretress/Kingambit/Metagross (4) | 유지 |
| 아세로라 | 1-50 | 4 | Dhelmise/Mimikyu/Palossand (4) | Dhelmise/Mimikyu/Palossand (4) | 유지 |
| 수련 | 1-50 | 3 | Araquanid/Lanturn/Primarina (3) | Araquanid/Lanturn/Primarina (3) | 유지 |
| 마마네 | 1-50 | 2 | Electivire/Magnezone/Vikavolt (2) | Electivire/Magnezone/Vikavolt (2) | 유지 |
| 키아웨 | 1-50 | 3 | Marowak-Alola/Salazzle/Turtonator (3) | Marowak-Alola/Salazzle/Turtonator (3) | 유지 |
| 쿠쿠이 | 1-50 | 4 | Braviary/Incineroar/Ninetales-Alola (4) | Braviary/Incineroar/Ninetales-Alola (4) | 유지 |
| 마오 | 51-100 | 3 | Leafeon/Roserade/Tsareena (3) | Leafeon/Roserade/Tsareena (3) | 유지 |
| 말리화 | 51-100 | 2 | Clefable/Mawile/Ribombee (2) | Clefable/Mawile/Ribombee (2) | 유지 |
| 마마네 | 51-100 | 4 | Electivire/Magnezone/Vikavolt (4) | Electivire/Magnezone/Vikavolt (4) | 유지 |
| 아세로라 | 51-100 | 4 | Dhelmise/Mimikyu/Palossand (4) | Dhelmise/Mimikyu/Palossand (4) | 유지 |
| 멀레인 | 51-100 | 4 | Forretress/Kingambit/Metagross (4) | Forretress/Kingambit/Metagross (4) | 유지 |
| 라이치 | 51-100 | 4 | Armaldo/Lycanroc/Relicanth (4) | Armaldo/Lycanroc/Relicanth (4) | 유지 |
| 키아웨 | 51-100 | 2 | Marowak-Alola/Salazzle/Turtonator (2) | Marowak-Alola/Salazzle/Turtonator (2) | 유지 |
| 일리마 | 51-100 | 4 | Bewear/Gumshoos/Tauros (4) | Bewear/Gumshoos/Tauros (4) | 유지 |
| 수련 | 51-100 | 4 | Araquanid/Lanturn/Primarina (4) | Araquanid/Lanturn/Primarina (4) | 유지 |
| 아세로라 | 51-100 | 1 | Dhelmise/Mimikyu/Palossand (1) | Dhelmise/Mimikyu/Palossand (1) | 유지 |
| 카일리 | 51-100 | 4 | Crobat/Skarmory/Toucannon (4) | Crobat/Skarmory/Toucannon (4) | 유지 |
| 쿠쿠이 | 51-100 | 4 | Braviary/Incineroar/Ninetales-Alola (4) | Braviary/Incineroar/Ninetales-Alola (4) | 유지 |
| 어니언 | 1-50 | 3 | Chandelure/Gengar/Mimikyu (3) | Chandelure/Gengar/Mimikyu (3) | 유지 |
| 금랑 | 1-50 | 2 | Duraludon/Flygon/Goodra (2) | Duraludon/Flygon/Goodra (2) | 유지 |
| 포플러 | 1-50 | 3 | Alcremie/Togekiss/Weezing-Galar (3) | Alcremie/Togekiss/Weezing-Galar (3) | 유지 |
| 아킬 | 1-50 | 2 | Eldegoss/Ferrothorn/Flapple (2) | Eldegoss/Ferrothorn/Flapple (2) | 유지 |
| 마리 | 1-50 | 4 | Grimmsnarl/Obstagoon/Toxicroak (4) | Grimmsnarl/Obstagoon/Toxicroak (4) | 유지 |
| 호브 | 1-50 | 4 | Corviknight/Dubwool/Rillaboom (4) | Corviknight/Dubwool/Rillaboom (4) | 유지 |
| 멜론 | 1-50 | 2 | Darmanitan-Galar/Frosmoth/Lapras (2) | Darmanitan-Galar/Frosmoth/Lapras (2) | 유지 |
| 두송 | 1-50 | 3 | Grimmsnarl/Obstagoon/Skuntank (3) | Grimmsnarl/Obstagoon/Skuntank (3) | 유지 |
| 비트 | 1-50 | 4 | Gardevoir/Hatterene/Rapidash-Galar (4) | Gardevoir/Hatterene/Rapidash-Galar (4) | 유지 |
| 순무 | 1-50 | 2 | Centiskorch/Chandelure/Salazzle (2) | Centiskorch/Chandelure/Salazzle (2) | 유지 |
| 금랑 | 1-50 | 4 | Arcanine/Duraludon/Goodra (4) | Arcanine/Duraludon/Goodra (4) | 유지 |
| 야청 | 1-50 | 1 | Drednaw/Golisopod/Toxapex (1) | Drednaw/Golisopod/Toxapex (1) | 유지 |
| 마쿠와 | 1-50 | 1 | Coalossal/Shuckle/Tyranitar (1) | Coalossal/Shuckle/Tyranitar (1) | 적용 |
| 채두 | 1-50 | 1 | Hawlucha/Machamp/Pangoro (1) | Hawlucha/Machamp/Pangoro (1) | 유지 |
| 단델 | 1-50 | 4 | Charizard/Dragapult/Rillaboom (4) | Charizard/Dragapult/Rillaboom (4) | 유지 |
| 아킬 | 51-100 | 1 | Eldegoss/Ferrothorn/Flapple (1) | Eldegoss/Ferrothorn/Flapple (1) | 유지 |
| 포플러 | 51-100 | 2 | Alcremie/Togekiss/Weezing-Galar (2) | Alcremie/Togekiss/Weezing-Galar (2) | 유지 |
| 어니언 | 51-100 | 1 | Chandelure/Gengar/Mimikyu (1) | Chandelure/Gengar/Mimikyu (1) | 유지 |
| 호브 | 51-100 | 4 | Corviknight/Dubwool/Rillaboom (4) | Corviknight/Dubwool/Rillaboom (4) | 유지 |
| 마리 | 51-100 | 4 | Grimmsnarl/Obstagoon/Toxicroak (4) | Grimmsnarl/Obstagoon/Toxicroak (4) | 유지 |
| 비트 | 51-100 | 4 | Gardevoir/Hatterene/Rapidash-Galar (4) | Gardevoir/Hatterene/Rapidash-Galar (4) | 유지 |
| 멜론 | 51-100 | 2 | Darmanitan-Galar/Frosmoth/Lapras (2) | Darmanitan-Galar/Frosmoth/Lapras (2) | 유지 |
| 채두 | 51-100 | 2 | Hawlucha/Machamp/Pangoro (2) | Hawlucha/Machamp/Pangoro (2) | 유지 |
| 순무 | 51-100 | 4 | Centiskorch/Chandelure/Salazzle (4) | Centiskorch/Chandelure/Salazzle (4) | 유지 |
| 금랑 | 51-100 | 4 | Arcanine/Duraludon/Goodra (4) | Arcanine/Duraludon/Goodra (4) | 유지 |
| 두송 | 51-100 | 2 | Grimmsnarl/Obstagoon/Skuntank (2) | Grimmsnarl/Obstagoon/Skuntank (2) | 유지 |
| 야청 | 51-100 | 3 | Drednaw/Golisopod/Toxapex (3) | Drednaw/Golisopod/Toxapex (3) | 유지 |
| 금랑 | 51-100 | 2 | Duraludon/Flygon/Goodra (2) | Duraludon/Flygon/Goodra (2) | 유지 |
| 마쿠와 | 51-100 | 1 | Coalossal/Shuckle/Tyranitar (1) | Coalossal/Shuckle/Tyranitar (1) | 적용 |
| 단델 | 51-100 | 4 | Charizard/Dragapult/Rillaboom (4) | Charizard/Dragapult/Rillaboom (4) | 유지 |
| 그루샤 | 1-50 | 3 | Altaria/Glaceon/Weavile (3) | Altaria/Glaceon/Weavile (3) | 유지 |
| 청목 | 1-50 | 4 | Dudunsparce/Snorlax/Staraptor (4) | Dudunsparce/Snorlax/Staraptor (4) | 유지 |
| 라임 | 1-50 | 2 | Drifblim/Spiritomb/Toxtricity (2) | Drifblim/Spiritomb/Toxtricity (2) | 유지 |
| 리파 | 1-50 | 1 | Farigiraf/Florges/Gallade (1) | Farigiraf/Florges/Gallade (1) | 유지 |
| 뽀삐 | 1-50 | 4 | Corviknight/Magnezone/Tinkaton (4) | Corviknight/Magnezone/Tinkaton (4) | 유지 |
| 칠리 | 1-50 | 4 | Clodsire/Krookodile/Whiscash (4) | Clodsire/Krookodile/Whiscash (4) | 유지 |
| 팔자크 | 1-50 | 4 | Baxcalibur/Dragalge/Goodra (4) | Baxcalibur/Dragalge/Goodra (4) | 유지 |
| 단풍 | 1-50 | 3 | Forretress/Heracross/Ursaluna (3) | Forretress/Heracross/Ursaluna (3) | 유지 |
| 콜사 | 1-50 | 3 | Arboliva/Sudowoodo/Tsareena (3) | Arboliva/Sudowoodo/Tsareena (3) | 유지 |
| 청목 | 1-50 | 4 | Altaria/Flamigo/Oricorio (4) | Altaria/Flamigo/Oricorio (4) | 유지 |
| 모야모 | 1-50 | 4 | Bellibolt/Kilowattrel/Mismagius (4) | Bellibolt/Kilowattrel/Mismagius (4) | 유지 |
| 테사 | 1-50 | 4 | Glimmora/Gogoat/Kingambit (4) | Glimmora/Gogoat/Kingambit (4) | 적용 |
| 리파 | 51-100 | 4 | Farigiraf/Florges/Gallade (4) | Farigiraf/Florges/Gallade (4) | 유지 |
| 라임 | 51-100 | 2 | Drifblim/Spiritomb/Toxtricity (2) | Drifblim/Spiritomb/Toxtricity (2) | 유지 |
| 청목 | 51-100 | 3 | Dudunsparce/Snorlax/Staraptor (3) | Dudunsparce/Snorlax/Staraptor (3) | 유지 |
| 그루샤 | 51-100 | 2 | Altaria/Glaceon/Weavile (2) | Altaria/Glaceon/Weavile (2) | 유지 |
| 팔자크 | 51-100 | 4 | Baxcalibur/Dragalge/Goodra (4) | Baxcalibur/Dragalge/Goodra (4) | 유지 |
| 청목 | 51-100 | 4 | Altaria/Flamigo/Oricorio (4) | Altaria/Flamigo/Oricorio (4) | 유지 |
| 칠리 | 51-100 | 4 | Clodsire/Krookodile/Whiscash (4) | Clodsire/Krookodile/Whiscash (4) | 유지 |
| 콜사 | 51-100 | 4 | Arboliva/Sudowoodo/Tsareena (4) | Arboliva/Sudowoodo/Tsareena (4) | 유지 |
| 단풍 | 51-100 | 2 | Forretress/Heracross/Ursaluna (2) | Forretress/Heracross/Ursaluna (2) | 유지 |
| 모야모 | 51-100 | 2 | Bellibolt/Kilowattrel/Mismagius (2) | Bellibolt/Kilowattrel/Mismagius (2) | 유지 |
| 뽀삐 | 51-100 | 4 | Corviknight/Magnezone/Tinkaton (4) | Corviknight/Magnezone/Tinkaton (4) | 유지 |
| 곤포 | 51-100 | 1 | Clawitzer/Crabominable/Dondozo (1) | Clawitzer/Crabominable/Dondozo (1) | 유지 |
| 테사 | 51-100 | 4 | Glimmora/Gogoat/Kingambit (4) | Glimmora/Gogoat/Kingambit (4) | 적용 |

## E. Lead / Last 분석

성공률은 선출된 preferred 종이 시작 팀의 해당 슬롯에 있는 비율이다. 전투 중 교체를 제한하지 않는다. 원시 lineups JSON에는 모든 NPC의 종별 빈도가 있다.

| NPC | 규칙 | 이전 성공/해당 조건 | 이후 성공/해당 조건 |
| --- | --- | --- | --- |
| 목호 | preferredLast | 2/8 | 8/8 |
| 미혜 | preferredLead | 2/8 | 8/8 |
| 들국화 | preferredLead | 0/8 | 8/8 |
| 무청 | preferredLead | 0/2 | 2/2 |
| 난천 | preferredLast | 2/8 | 8/8 |
| 우르프 | preferredLead | 0/4 | 4/4 |
| 마쿠와 | preferredLead | 1/2 | 2/2 |
| 테사 | preferredLead | 1/8 | 8/8 |
| 테사 | preferredLast | 2/8 | 8/8 |

## F. 기믹 사용 분석

가능 횟수는 해당 전투의 실제 선발 팀/장비/티켓에 기믹이 존재한 조건 수다. 사용은 선택 명령이 아니라 엔진의 Mega/Z/Dynamax/Tera 발동 로그로 확인했다. HP는 발동 직전 공개 HP 비율(반올림 포함)이다. 미사용에는 carrier가 나오기 전 종료되거나 행동 전에 쓰러진 경우도 포함한다.

| phase / 기믹 | 가능 | 사용 | 사용률 | 평균 발동 턴 | 평균 HP | 사용 시 플레이어 승률 | 미사용 시 플레이어 승률 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| before:mega | 2880 | 2800 | 97.22% | 3.23 | 95.27% | 70.36% | 45.00% |
| before:tera | 2088 | 2031 | 97.27% | 3.77 | 93.42% | 74.74% | 66.67% |
| before:z | 3192 | 1511 | 47.34% | 3.54 | 74.95% | 68.83% | 86.32% |
| before:dynamax | 1344 | 1302 | 96.88% | 3.14 | 88.12% | 58.76% | 52.38% |
| after:mega | 2880 | 2791 | 96.91% | 3.39 | 94.10% | 70.69% | 40.45% |
| after:tera | 2088 | 2035 | 97.46% | 3.52 | 96.08% | 74.35% | 64.15% |
| after:z | 3192 | 1511 | 47.34% | 3.54 | 74.95% | 68.83% | 86.32% |
| after:dynamax | 1344 | 1301 | 96.80% | 3.15 | 88.00% | 58.26% | 53.49% |

발동 여부에 따른 승률 차이는 상황 선택의 영향을 받으므로 기믹의 효과라고 해석하지 않는다. Z 사용 시 상대 HP≤25%도 기록했으나 무효·낭비 판정은 별도 로그 검토가 필요하다. Primal은 정규 표본에 없다.

관찰: Mega/Tera/Dynamax 사용률은 약 97%지만 Z는 47.34%다. Z의 낮은 사용률을 전부 낭비/지연으로 단정하지 않는다. 실제 Z 발동 1,511회 중 상대 HP≤25%는 5회였다. Dynamax는 1,301회 중 전투 1턴 발동이 300회여서 전투 시작 즉시 무조건 사용한 결과는 아니다. NPC별 passive carrier 문제는 종별 표와 실제 사용 기술을 함께 확인해야 한다.

공통 정책의 한계: 현재 Mega는 선택한 공격에 가능하면 즉시 붙이고, Tera는 선택 공격의 추정 피해가 양수이면 발동한다. Tera 전후 방어/공격 이득을 직접 비교하는 정책은 아니다. 공개 발동 시점만으로 올바른 방어 테라였다고 판정하지 않았고, 이번 작업에서 공통 AI 변경은 하지 않았다.

| NPC / 구간 / 기믹 (이후) | 가능 | 사용 | 사용률 | 평균 턴 | 평균 HP | carrier |
| --- | --- | --- | --- | --- | --- | --- |
| named-blue:1-50:mega | 96 | 91 | 94.79% | 3.44 | 92.47% | Pidgeot |
| named-giovanni-gym:51-100:tera | 72 | 69 | 95.83% | 3.20 | 100.00% | Nidoking |
| named-misty:51-100:z | 72 | 58 | 80.56% | 5.29 | 84.02% | Starmie |
| named-sabrina:51-100:mega | 72 | 69 | 95.83% | 2.96 | 100.00% | Alakazam |
| named-blaine:51-100:z | 72 | 59 | 81.94% | 2.98 | 86.37% | Arcanine |
| named-agatha:51-100:mega | 96 | 92 | 95.83% | 3.90 | 100.00% | Gengar |
| named-lorelei:51-100:dynamax | 96 | 96 | 100.00% | 2.74 | 86.54% | Lapras |
| named-ltsurge:51-100:z | 72 | 27 | 37.50% | 2.26 | 100.00% | Raichu |
| named-lance-kanto:51-100:mega | 96 | 96 | 100.00% | 3.51 | 95.24% | Dragonite |
| named-bruno-kanto:51-100:dynamax | 96 | 96 | 100.00% | 4.33 | 93.16% | Machamp |
| named-koga-kanto:51-100:z | 48 | 0 | 0.00% | — | — | Weezing |
| named-brock:51-100:mega | 48 | 47 | 97.92% | 3.04 | 100.00% | Aerodactyl |
| named-erika:51-100:tera | 24 | 21 | 87.50% | 3.67 | 87.00% | Vileplume |
| named-blue:51-100:mega | 96 | 87 | 90.63% | 4.39 | 91.01% | Pidgeot |
| named-lance:1-50:mega | 96 | 86 | 89.58% | 5.10 | 86.64% | Dragonite |
| named-falkner:51-100:z | 72 | 66 | 91.67% | 2.95 | 74.59% | Pidgeot |
| named-whitney:51-100:z | 72 | 35 | 48.61% | 6.20 | 55.14% | Miltank |
| named-bruno:51-100:dynamax | 96 | 95 | 98.96% | 3.12 | 86.12% | Machamp |
| named-karen:51-100:z | 96 | 51 | 53.13% | 3.00 | 58.37% | Umbreon |
| named-koga:51-100:tera | 96 | 96 | 100.00% | 3.13 | 100.00% | Crobat |
| named-jasmine:51-100:mega | 48 | 48 | 100.00% | 5.13 | 95.25% | Steelix |
| named-bugsy:51-100:mega | 72 | 72 | 100.00% | 2.71 | 86.53% | Scizor |
| named-chuck:51-100:z | 96 | 39 | 40.63% | 4.08 | 70.03% | Poliwrath |
| named-will:51-100:tera | 96 | 95 | 98.96% | 5.39 | 98.07% | Xatu |
| named-morty:51-100:mega | 48 | 47 | 97.92% | 3.79 | 100.00% | Gengar |
| named-clair:51-100:z | 48 | 14 | 29.17% | 3.50 | 24.21% | Kingdra |
| named-pryce:51-100:tera | 24 | 24 | 100.00% | 4.71 | 100.00% | Mamoswine |
| named-lance:51-100:mega | 96 | 92 | 95.83% | 5.00 | 91.89% | Dragonite |
| named-steven:1-50:mega | 96 | 96 | 100.00% | 2.74 | 95.60% | Metagross |
| named-roxanne:51-100:tera | 72 | 72 | 100.00% | 3.81 | 98.83% | Probopass |
| named-tateandliza:51-100:tera | 72 | 50 | 69.44% | 4.66 | 91.72% | Solrock |
| named-sidney:51-100:mega | 96 | 91 | 94.79% | 3.26 | 86.80% | Absol |
| named-phoebe:51-100:mega | 96 | 96 | 100.00% | 4.25 | 100.00% | Banette |
| named-drake:51-100:mega | 96 | 92 | 95.83% | 4.46 | 100.00% | Salamence |
| named-norman:51-100:z | 72 | 53 | 73.61% | 3.19 | 93.74% | Slaking |
| named-wallace-gym:51-100:z | 48 | 34 | 70.83% | 6.68 | 43.15% | Milotic |
| named-flannery:51-100:z | 48 | 27 | 56.25% | 2.07 | 51.11% | Torkoal |
| named-glacia:51-100:tera | 96 | 96 | 100.00% | 3.65 | 77.77% | Walrein |
| named-brawly:51-100:z | 24 | 12 | 50.00% | 2.33 | 53.25% | Hariyama |
| named-winona:51-100:mega | 48 | 48 | 100.00% | 4.06 | 90.81% | Altaria |
| named-juan:51-100:z | 72 | 12 | 16.67% | 6.67 | 84.92% | Kingdra |
| named-wattson:51-100:mega | 24 | 24 | 100.00% | 4.08 | 100.00% | Manectric |
| named-steven:51-100:mega | 96 | 96 | 100.00% | 3.90 | 93.08% | Metagross |
| named-cynthia:1-50:mega | 96 | 96 | 100.00% | 3.45 | 83.86% | Garchomp |
| named-fantina:51-100:tera | 72 | 68 | 94.44% | 4.60 | 95.91% | Mismagius |
| named-gardenia:51-100:z | 72 | 42 | 58.33% | 4.57 | 76.24% | Roserade |
| named-roark:51-100:tera | 48 | 48 | 100.00% | 3.77 | 99.71% | Rampardos |
| named-aaron:51-100:mega | 96 | 93 | 96.88% | 2.57 | 89.72% | Scizor |
| named-flint:51-100:z | 96 | 25 | 26.04% | 3.44 | 100.00% | Infernape |
| named-lucian:51-100:tera | 96 | 96 | 100.00% | 5.68 | 98.08% | Bronzong |
| named-crasherwake:51-100:z | 48 | 29 | 60.42% | 6.10 | 96.90% | Floatzel |
| named-maylene:51-100:mega | 96 | 95 | 98.96% | 2.57 | 93.01% | Lucario |
| named-volkner:51-100:z | 96 | 27 | 28.13% | 2.11 | 97.96% | Electivire |
| named-byron:51-100:tera | 24 | 24 | 100.00% | 3.33 | 87.29% | Bastiodon |
| named-bertha:51-100:tera | 96 | 96 | 100.00% | 1.00 | 100.00% | Hippowdon |
| named-candice:51-100:mega | 24 | 24 | 100.00% | 2.29 | 100.00% | Abomasnow |
| named-cynthia:51-100:mega | 96 | 96 | 100.00% | 3.64 | 81.60% | Garchomp |
| named-alder:1-50:z | 96 | 53 | 55.21% | 3.60 | 84.11% | Volcarona |
| named-elesa:51-100:z | 48 | 29 | 60.42% | 6.10 | 94.97% | Zebstrika |
| named-marlon:51-100:z | 72 | 46 | 63.89% | 2.09 | 72.61% | Jellicent |
| named-roxie:51-100:z | 48 | 34 | 70.83% | 5.29 | 92.38% | Scolipede |
| named-caitlin:51-100:z | 96 | 73 | 76.04% | 2.64 | 41.93% | Gothitelle |
| named-marshal:51-100:z | 96 | 33 | 34.38% | 3.48 | 26.97% | Conkeldurr |
| named-shauntal:51-100:z | 96 | 60 | 62.50% | 4.33 | 67.45% | Chandelure |
| named-lenora:51-100:tera | 24 | 24 | 100.00% | 3.21 | 100.00% | Watchog |
| named-chili:51-100:z | 48 | 10 | 20.83% | 4.30 | 100.00% | Simisear |
| named-grimsley:51-100:tera | 96 | 96 | 100.00% | 2.08 | 88.79% | Kingambit |
| named-clay:51-100:z | 48 | 28 | 58.33% | 5.25 | 87.75% | Excadrill |
| named-cress:51-100:z | 24 | 7 | 29.17% | 6.86 | 72.14% | Simipour |
| named-burgh:51-100:z | 48 | 0 | 0.00% | — | — | Leavanny |
| named-drayden:51-100:z | 24 | 18 | 75.00% | 1.00 | 100.00% | Haxorus |
| named-cilan:51-100:z | 72 | 30 | 41.67% | 2.33 | 45.30% | Simisage |
| named-skyla:51-100:tera | 24 | 24 | 100.00% | 1.00 | 100.00% | Swanna |
| named-alder:51-100:z | 96 | 34 | 35.42% | 4.41 | 73.65% | Volcarona |
| named-diantha:1-50:mega | 96 | 96 | 100.00% | 2.54 | 100.00% | Gardevoir |
| named-ramos:51-100:mega | 48 | 35 | 72.92% | 4.11 | 87.31% | Venusaur |
| named-wulfric:51-100:mega | 48 | 48 | 100.00% | 2.21 | 100.00% | Abomasnow |
| named-olympia:51-100:mega | 24 | 24 | 100.00% | 3.58 | 100.00% | Gardevoir |
| named-grant:51-100:mega | 48 | 46 | 95.83% | 4.65 | 87.37% | Aerodactyl |
| named-siebold:51-100:mega | 96 | 96 | 100.00% | 2.34 | 91.77% | Gyarados |
| named-drasna:51-100:mega | 96 | 96 | 100.00% | 2.73 | 100.00% | Altaria |
| named-wikstrom:51-100:mega | 96 | 96 | 100.00% | 2.60 | 90.45% | Scizor |
| named-clemont:51-100:mega | 72 | 57 | 79.17% | 2.79 | 98.65% | Ampharos |
| named-viola:51-100:mega | 96 | 96 | 100.00% | 2.73 | 100.00% | Beedrill |
| named-malva:51-100:mega | 96 | 93 | 96.88% | 3.48 | 100.00% | Houndoom |
| named-korrina:51-100:mega | 96 | 94 | 97.92% | 2.63 | 89.64% | Lucario |
| named-valerie:51-100:mega | 48 | 44 | 91.67% | 4.39 | 100.00% | Mawile |
| named-diantha:51-100:mega | 96 | 96 | 100.00% | 2.29 | 99.83% | Gardevoir |
| named-kukui:1-50:z | 96 | 63 | 65.63% | 1.71 | 74.59% | Incineroar |
| named-mallow:51-100:z | 72 | 43 | 59.72% | 1.79 | 75.37% | Tsareena |
| named-mina:51-100:z | 48 | 19 | 39.58% | 2.79 | 100.00% | Ribombee |
| named-sophocles:51-100:z | 96 | 68 | 70.83% | 2.72 | 59.87% | Vikavolt |
| named-acerola:51-100:z | 96 | 61 | 63.54% | 4.41 | 88.07% | Mimikyu |
| named-molayne:51-100:z | 96 | 46 | 47.92% | 1.74 | 92.28% | Metagross |
| named-olivia:51-100:z | 96 | 50 | 52.08% | 4.28 | 100.00% | Lycanroc |
| named-kiawe:51-100:z | 48 | 10 | 20.83% | 5.20 | 49.90% | Marowak-Alola |
| named-ilima:51-100:z | 96 | 0 | 0.00% | — | — | Gumshoos |
| named-lana:51-100:z | 96 | 27 | 28.13% | 4.59 | 76.93% | Primarina |
| named-acerola-captain:51-100:z | 24 | 17 | 70.83% | 3.82 | 81.00% | Mimikyu |
| named-kahili:51-100:z | 96 | 0 | 0.00% | — | — | Toucannon |
| named-kukui:51-100:z | 96 | 42 | 43.75% | 1.24 | 77.55% | Incineroar |
| named-leon:1-50:dynamax | 96 | 89 | 92.71% | 3.22 | 81.10% | Charizard |
| named-milo:51-100:dynamax | 24 | 18 | 75.00% | 3.67 | 100.00% | Flapple |
| named-opal:51-100:dynamax | 48 | 48 | 100.00% | 3.65 | 87.33% | Alcremie |
| named-allister:51-100:dynamax | 24 | 20 | 83.33% | 5.00 | 91.15% | Gengar |
| named-hop:51-100:dynamax | 96 | 93 | 96.88% | 2.56 | 100.00% | Corviknight |
| named-marnie:51-100:dynamax | 96 | 95 | 98.96% | 2.91 | 73.17% | Grimmsnarl |
| named-bede:51-100:dynamax | 96 | 96 | 100.00% | 2.75 | 93.04% | Hatterene |
| named-melony:51-100:dynamax | 48 | 48 | 100.00% | 2.69 | 86.63% | Lapras |
| named-bea:51-100:dynamax | 48 | 45 | 93.75% | 2.62 | 93.47% | Machamp |
| named-kabu:51-100:dynamax | 96 | 92 | 95.83% | 2.78 | 82.28% | Centiskorch |
| named-raihan-cup:51-100:dynamax | 96 | 96 | 100.00% | 3.16 | 97.79% | Duraludon |
| named-piers:51-100:dynamax | 48 | 48 | 100.00% | 2.27 | 86.77% | Grimmsnarl |
| named-nessa:51-100:dynamax | 72 | 72 | 100.00% | 3.36 | 96.00% | Drednaw |
| named-raihan:51-100:dynamax | 48 | 37 | 77.08% | 3.54 | 87.24% | Duraludon |
| named-gordie:51-100:dynamax | 24 | 23 | 95.83% | 3.65 | 93.48% | Coalossal |
| named-leon:51-100:dynamax | 96 | 94 | 97.92% | 3.72 | 75.13% | Charizard |
| named-geeta:1-50:tera | 96 | 96 | 100.00% | 2.78 | 100.00% | Glimmora |
| named-tulip:51-100:tera | 96 | 96 | 100.00% | 2.90 | 100.00% | Florges |
| named-ryme:51-100:tera | 48 | 48 | 100.00% | 3.79 | 98.88% | Toxtricity |
| named-larry:51-100:tera | 72 | 71 | 98.61% | 5.77 | 100.00% | Staraptor |
| named-grusha:51-100:tera | 48 | 48 | 100.00% | 3.04 | 95.15% | Altaria |
| named-hassel:51-100:tera | 96 | 96 | 100.00% | 2.92 | 100.00% | Baxcalibur |
| named-larry-elite:51-100:tera | 96 | 95 | 98.96% | 4.22 | 100.00% | Flamigo |
| named-rika:51-100:tera | 96 | 90 | 93.75% | 4.36 | 95.77% | Clodsire |
| named-brassius:51-100:tera | 96 | 93 | 96.88% | 2.76 | 95.20% | Sudowoodo |
| named-katy:51-100:tera | 48 | 48 | 100.00% | 3.10 | 73.67% | Ursaluna |
| named-iono:51-100:tera | 48 | 48 | 100.00% | 2.40 | 95.87% | Bellibolt |
| named-poppy:51-100:tera | 96 | 90 | 93.75% | 3.34 | 95.16% | Tinkaton |
| named-kofu:51-100:tera | 24 | 21 | 87.50% | 5.00 | 100.00% | Crabominable |
| named-geeta:51-100:tera | 96 | 96 | 100.00% | 2.91 | 99.75% | Glimmora |

## G. 이상치와 원인 분류

분류: A 후보 / B 조합 / C 순서 / D 기술 / E 도구 / F AI 활용 / G 기믹 / H 테스트 팀 상성。

- 규리(B/C/F): 기존 Steelix+Skarmory+Bronzong 조합을 공격 동료 최소 1종 조건으로 금지한다. 초기 시험의 무장조 선봉 선호는 Spikes 실제 사용 0회였고 전반 플레이어 승률을 92.71%→98.96%로 올렸다. 선봉 선호를 제거하고 조합 제약만 남겼다. 강철 공통 약점과 기술/AI 문제까지 해결한다고 보지 않는다.
- 류옹(B/C/H): 초기 시험은 눈설왕 필수+선봉으로 전반 플레이어 승률 60.42%→79.17%였다. Ice 팀 전체를 필수 날씨 파티로 취급하지 않고, 눈설왕을 선출한 경우에만 선봉 선호로 좁혔다. 이 중간 시험은 trial-forced-leads/에 보존했다.
- 호일(D/F/H): 기존 확장 전 69.44%에서 확장 후 91.67%로 오른 후반 플레이어 승률을 이번 이전 기준으로 삼았다. 이번 후반 Mega는 72/72회 사용했다(평균 2.71턴). 칼춤 15회, 유턴 6회, 날개쉬기 8회 사용했으나 스타팅·공격 팀에는 각각 18/18회 패배했다. 실제 3개 생성 조건 모두 Pinsir를 포함했지만 이것만으로 후보 자체와 조합의 원인을 분리할 수 없다. 임의의 2번째 공격수를 고정하지 않았다.
- 사도(E/F/G/H): 기존 확장 전 66.67%에서 확장 후 73.96%로 오른 후반 승률을 조사한다. Z는 39/96회(40.63%), 평균 4.08턴에 사용했고 그 39회에서 상대 HP≤25% 발동은 없었다. Waterium Z가 Poliwrath의 기본 Sitrus Berry를 대체하는 것은 확인되지만, 그 때문에 약해졌다는 인과 결론은 내리지 않는다. 별도 도구 제거/복원 대조 실험이 필요하다.
- 재현 예: `before-named-chuck-85-offense.json`에서 한카리아스의 지진으로 강챙이 HP가 42%가 되고 냉동펀치를 사용한다. 까칠한피부 후 29%에서 다음 지진에 쓰러져 Z를 쓰지 못한다. 커버리지 선택·행동 순서·생존 문제가 섞여 있어 단순 Z 지연 버그로 처리하지 않았다.
- status/setup/bulk는 기술을 썼다는 사실과 성공적으로 이득을 얻었다는 판단을 구분한다. traces에는 실제 공개 전투 로그와 NPC 판단 시점 HP/행동을 저장했다. 이번 작업에서 NPC ID에 따른 AI 분기나 스탯 보정은 추가하지 않았다.

후반 규리/호일/사도의 팀별 승률과 실제 기술 사용:

### named-jasmine

| 팀 | 플레이어 승/전투 | 승률 |
| --- | --- | --- |
| starters | 12/12 | 100.00% |
| offense | 12/12 | 100.00% |
| bulk | 4/12 | 33.33% |
| signature | 6/12 | 50.00% |

| 실제 사용 기술 | 횟수 |
| --- | --- |
| Surf | 79 |
| Flash Cannon | 29 |
| Ice Beam | 28 |
| Heavy Slam | 25 |
| Toxic | 21 |
| Psychic | 17 |
| Thunderbolt | 16 |
| Shadow Ball | 8 |
| Earthquake | 2 |
| Mirror Coat | 2 |
### named-bugsy

| 팀 | 플레이어 승/전투 | 승률 |
| --- | --- | --- |
| starters | 18/18 | 100.00% |
| offense | 18/18 | 100.00% |
| bulk | 14/18 | 77.78% |
| signature | 16/18 | 88.89% |

| 실제 사용 기술 | 횟수 |
| --- | --- |
| Superpower | 31 |
| X-Scissor | 28 |
| Earthquake | 27 |
| Close Combat | 23 |
| Bullet Punch | 19 |
| Attack Order | 18 |
| Swords Dance | 15 |
| Air Slash | 13 |
| Ancient Power | 12 |
| Rock Slide | 11 |
| Roost | 8 |
| Toxic | 7 |
| U-turn | 6 |
| Megahorn | 6 |
| Bug Buzz | 3 |
### named-chuck

| 팀 | 플레이어 승/전투 | 승률 |
| --- | --- | --- |
| starters | 23/24 | 95.83% |
| offense | 17/24 | 70.83% |
| bulk | 9/24 | 37.50% |
| signature | 22/24 | 91.67% |

| 실제 사용 기술 | 횟수 |
| --- | --- |
| Shadow Punch | 54 |
| Close Combat | 45 |
| Ice Punch | 41 |
| High Jump Kick | 40 |
| Hydro Vortex | 39 |
| Thunder Punch | 30 |
| Waterfall | 23 |
| Knock Off | 16 |
| Bulk Up | 9 |
| Drain Punch | 9 |
| Psycho Cut | 6 |
| Seed Bomb | 5 |
| Blaze Kick | 1 |

## H. 다음 실험 backlog

- Milk Drink, Moonlight, Roost/Slack Off, Rest/Sleep Talk: 회복 시점·실제 회복량·턴 손실.
- U-turn/pivot: 교체 대상과 다음 대면, 루프·기회비용.
- Tailwind, Yawn, Glare, Hypnosis, Reflect, Spikes/hazards: 성공 여부와 후속 수혜 턴.
- setup timing: 능력 상승 후 실제 공격/생존 여부.
- gimmick timing: Z 대상 HP/무효·분신·방어·폼 변화, Mega carrier 생존, Dynamax 공격 기여, Tera 실제 상성 변화.
- 사도: Sitrus Berry/Waterium Z 대조 및 냉동펀치와 Z 선택의 생존 조건.
- 호일: 같은 조합·선봉 고정 후 후보/기술/특성의 단일 변수 실험. 본 실험의 플레이어 불꽃/바위/비행 견제 편향 확인.
- 플레이어 기술 완성도/육성/기믹 재고를 분리한 초급·중급·완성형 벤치마크. 경로 시드 확대 및 정규 등반 밖 조직/히든 보스 표본 확대.

## I. 검증

- 단위·통합 전체: 787/787 통과(.data/named-selection-full-tests-final.log). Rocket/Champion/hidden boss/Raid/Challenger/Teleport/run event/5층/snapshot/reconnect/retry 회귀 포함.
- 최종 데이터 집중 검증: 34/34 통과(.data/named-selection-focused-final.log). 규리 256개 층·시드 조건과 적용 규칙 전체 검증 포함.
- TypeScript noEmit, runtime export --check, git diff --check 통과. Windows 링크 생성 권한으로 최종 production build 통과(.data/named-selection-build.log).
- E2E: 중복 제외 55개 시나리오 통과. 1차 22개 중 기존 19개와 규리 1개 통과; 목호 2개는 접근성/화면 텍스트 중복 선택을 수정해 재통과. 2차 36개 중 33개 통과; 가입 quota에 걸린 런 이벤트 3개는 테스트 간 quota 분리 후 해당 파일 15/15 재통과.
- E2E 범위: 새 대사/선출(데스크톱·모바일·4배속·reduced motion·skip), 성도 4인, retry, hidden boss, Rocket campaign, teleport, raid, challenger, run events. 로그: .data/named-selection-e2e.log, .data/named-selection-e2e-final.log, .data/named-selection-run-events-final.log.
- 전체 단위 테스트 첫 실행의 도구 테스트 1건은 랜덤 위협 특성으로 시작 공격 랭크가 달라지는 경우를 고정 1로 가정했다. 현재 랭크 대비 +1 및 재접속 보존을 검증하도록 수정한 뒤 전체 787개 통과.
- 시뮬레이션: 이전/이후 각 86,784조건, 오류 0. 동일 입력 캐시 재사용. 이전 결과 전량은 직전 보고서의 현재 결과와 입력 키/승패 일치. 원본 빌드에서 selectionRules 외 변경 없음 및 지정 배치 관측 성공률 100% 검증.

## 원시 산출물과 재현

실험 폴더: artifacts/experiments/balance/named-selection-20261018. comparison.json(NPC/조합/기믹/검토), gimmick-events.jsonl(발동 종·턴·HP·상대 HP·승자), outcomes.jsonl, before/after-battles.jsonl, manifests, traces를 보존한다. 기믹 JSON에는 사용/미사용 전투 승률을 모두 저장했다.
AI/엔진/전투 처리 자체를 수정한 실험은 반드시 새 THEME_BALANCE_OUTPUT 폴더에서 실행한다. 기존 캐시는 같은 팀·시드·설정에 대한 본 실험의 결과이며, 정책 소스가 달라진 뒤 자동으로 유효하다고 보장하지 않는다.

```powershell
$env:THEME_BALANCE_OUTPUT='artifacts/experiments/balance/named-selection-20261018'
$env:THEME_BALANCE_TELEMETRY='1'
$env:THEME_BALANCE_ALL_THEMES='1'
$env:NPC_BALANCE_BASELINE='artifacts/experiments/balance/named-selection-20261018/before-runtime.json'
node --import ./scripts/lib/npc-balance-baseline.mjs --import tsx scripts/simulate-johto-theme-comparison.ts --before
Remove-Item Env:NPC_BALANCE_BASELINE
node --import tsx scripts/simulate-johto-theme-comparison.ts
node scripts/report-named-selection.mjs
```
