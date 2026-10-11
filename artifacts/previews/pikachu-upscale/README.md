# 피카츄 확대 확인용 샘플

원본: 게임에서 사용하는 PokéAPI 5세대 피카츄 GIF.
출처: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif

방식: Scale2x를 두 번 적용한 Scale4x. AI 이미지 생성 없이 원본 픽셀 이웃과 색상으로 처리한다.
알고리즘: https://www.scale2x.it/algorithm

원본 50×46, 처리 200×184, 58프레임. 출력 GIF 55프레임(연속 중복 프레임 병합). 동작·재생 시간·원본 색상 보존 검증 완료. 원본에 없는 세부 묘사를 복원하지 않는다.

`comparison.png`: 같은 표시 크기로 단순 확대/보간 확대/Scale4x 비교.
`scale4x-frame.png`: 투명 PNG. `scale4x-animation.gif`: 투명 GIF. 게임에는 적용하지 않았다.
