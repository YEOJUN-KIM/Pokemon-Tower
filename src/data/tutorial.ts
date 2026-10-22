import {TRAINING_POINT_PRICE} from './training';

export const TutorialStep = {
  NotStarted:'NotStarted', Introduction:'Introduction', StartGame:'StartGame',
  SelectPokemon:'SelectPokemon', RemovePokemon:'RemovePokemon', PokemonInfo:'PokemonInfo',
  PokemonInfoViewed:'PokemonInfoViewed', StatUpgrade:'StatUpgrade', CompleteTeam:'CompleteTeam',
  StartBattle:'StartBattle', TypeGuide:'TypeGuide', AwaitVictory:'AwaitVictory',
  RecruitmentGuide:'RecruitmentGuide', RecruitmentChoice:'RecruitmentChoice',
  Completion:'Completion', Completed:'Completed',
} as const;
export type TutorialStep=typeof TutorialStep[keyof typeof TutorialStep];
export type TutorialState={step:TutorialStep;rewardGranted:boolean;party:string[]};
export const TUTORIAL_GROWTH_POINTS=TRAINING_POINT_PRICE*32;
export const tutorialHints={
  statPicker:`방향키 또는 슬라이더로 원하는 만큼 포인트를 배분한 뒤 「적용」을 누르세요. 이후 설정 화면 아래의 비용을 확인하고 저장하세요. 능력치 +1당 ${TRAINING_POINT_PRICE}P이며, 한 능력치에는 최대 32포인트까지 배분할 수 있어요.`,
  openMoves:'「싸운다」를 눌러 기술과 상대에게 주는 효과를 확인해보세요.',
  openRecruitment:'첫 승리를 축하해요! 「영입 선택」을 눌러 상대 포켓몬을 확인해보세요.',
};
export const tutorialCopy:Record<TutorialStep,{title:string;text:string;next?:string}>={
  NotStarted:{title:'PokeTower가 처음인가요?',text:'직접 포켓몬을 선택하고 첫 전투를 진행하며 기본 조작을 익힐 수 있어요.'},
  Introduction:{title:'100층을 향한 첫걸음',text:'PokeTower는 포켓몬 3마리로 시작해 탑을 등반하며 새로운 포켓몬을 영입하고, 총 100층을 돌파하는 것이 목표입니다.',next:'확인'},
  StartGame:{title:'새로운 등반',text:'먼저 게임 시작을 눌러 새로운 등반을 준비해볼까요?'},
  SelectPokemon:{title:'첫 파트너 선택',text:'이번 등반에 함께할 포켓몬 3마리를 선택하세요. 밝게 표시된 보유 포켓몬을 누르고 「포켓몬 선택하기」를 골라보세요.'},
  RemovePokemon:{title:'편성에서 제외하기',text:'오른쪽 출발 파티에서 선택한 포켓몬을 누른 뒤 「파티에서 제외」를 골라보세요. 도감 해금은 그대로 유지됩니다.'},
  PokemonInfo:{title:'포켓몬 정보 살펴보기',text:'목록에서 보유 포켓몬을 누르고 「기본 정보」를 열어보세요. 타입, 종족값, 특성, 기술을 확인할 수 있어요.'},
  PokemonInfoViewed:{title:'파트너를 알아보세요',text:'타입과 능력치, 기술을 살펴보세요. 다음에는 포켓몬을 직접 성장시켜봅니다.',next:'확인했어요'},
  StatUpgrade:{title:'첫 능력치 성장',text:`성장 포인트 ${TUTORIAL_GROWTH_POINTS}P를 지급했어요. 정보 화면을 닫고 보유 포켓몬의 「포켓몬 설정」을 여세요. 지급된 성장 포인트로 공격, 특수공격 등 원하는 능력치를 성장시켜보세요. 한 능력치를 0에서 32까지 올리거나 여러 능력치에 나눠 배분할 수 있어요. 「적용」 후 설정 화면에서 비용을 확인하고 저장하세요. 수치 증가 비용은 +1당 ${TRAINING_POINT_PRICE}P입니다.`},
  CompleteTeam:{title:'함께할 3마리',text:'성장을 완료했어요! 설정 화면을 닫고, 이번 등반에 함께할 포켓몬 3마리를 편성하세요.'},
  StartBattle:{title:'출발 준비 완료!',text:'좋아요! 이제 이 3마리와 함께 탑을 올라가봅시다. 도전 시작 확인창에서 「예」를 선택하세요.'},
  TypeGuide:{title:'타입 배율 확인',text:'기술과 상대 포켓몬의 타입에 따라 피해 배율이 달라집니다. ×2: 효과 좋음 · ×1: 보통 · ×0.5: 효과 적음 · ×0: 무효. 기술 버튼의 효과 표시를 확인하고 실제 기술 하나를 선택해보세요. 보통 효과는 별도 배지가 없으며, 공개된 특성에 따라 무효가 될 수도 있어요.'},
  AwaitVictory:{title:'첫 승리를 향해',text:'효과적인 기술을 골라 전투를 이어가세요. 승리 후 영입 방법을 안내해드릴게요.'},
  RecruitmentGuide:{title:'승리 후 포켓몬 획득',text:'전투에서 승리하면 상대가 사용한 포켓몬 중 하나를 선택할 수 있습니다.',next:'획득 방법 보기'},
  RecruitmentChoice:{title:'도감 등록과 동료 영입',text:'「도감에 넣기」: 이후 새로운 등반에서 사용할 수 있어요. 「동료로 데려가기」: 도감에도 등록되고 이번 등반의 파티에 바로 합류합니다. 원하는 포켓몬과 획득 방식을 선택해보세요.'},
  Completion:{title:'튜토리얼 완료!',text:'이제 포켓몬을 모으고 성장시키며 100층을 향해 올라가보세요!',next:'모험 계속하기'},
  Completed:{title:'안내 완료',text:''},
};
