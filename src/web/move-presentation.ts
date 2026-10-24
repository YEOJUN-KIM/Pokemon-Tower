import assignments from '../data/move-presentations.json';

export type PokemonMotion='None'|'Dash'|'FastDash'|'Jump'|'Shake'|'Disappear'|'Clone'|'Spin';
export type ScreenEffect='None'|'ShakeSmall'|'ShakeLarge'|'Flash'|'Darken'|'Tint';
export type TargetEffect='None'|'Flash'|'Shake'|'Knockback'|'Tint';
export type SpecialSequence='None'|'Earthquake'|'DoubleTeamClone'|'SoundWave'|'Drain'|'StateChange'|'TwoTurn';
export type SoundCue='Impact'|'Rush'|'Rumble'|'Energy'|'Stream'|'Voice'|'Support';
export type SharedVfx='None'|'HitSmall'|'HitHeavy'|'Slash'|'Claw'|'Bite'|'MultiHit'|'Projectile'|'Beam'|'Stream'|'FireStream'|'FireBurst'|'WaterStream'|'WaterWave'|'ElectricBolt'|'ElectricBurst'|'IceBeam'|'IceImpact'|'Leaf'|'ShadowOrb'|'Explosion'|'Smoke'|'Aura'|'Ring'|'Wave'|'Weather'|'GroundImpactSmall'|'SoundWave';
export type MovePresentation={
 pokemonMotion:PokemonMotion;screenEffect:ScreenEffect;mainVfx:SharedVfx;impactVfx:SharedVfx;
 targetEffect:TargetEffect;sound:SoundCue;specialSequence:SpecialSequence;
 stateExpression:'None'|'Protocol';rendererStyle:string;duration:number;impactAt:number;
 rationale:string;dedicatedVfx?:string;
};
// Times are 1x timeline milliseconds. The playback scheduler and renderer share
// this timeline; the battle engine remains the sole authority on move effects.
const preset=(rendererStyle:string,pokemonMotion:PokemonMotion,mainVfx:SharedVfx,impactVfx:SharedVfx,rationale:string,options:Partial<MovePresentation>={}):MovePresentation=>({
 rendererStyle,pokemonMotion,mainVfx,impactVfx,rationale,screenEffect:'None',targetEffect:'Shake',sound:'Impact',specialSequence:'None',stateExpression:'None',duration:950,impactAt:600,...options,
});
const support=(rationale:string,mainVfx:SharedVfx='Aura',options:Partial<MovePresentation>={})=>preset('support','None',mainVfx,'None',rationale,{targetEffect:'None',sound:'Support',stateExpression:'Protocol',...options});
const projectile=(style:string,vfx:SharedVfx,rationale:string)=>preset(style,'None',vfx,'HitSmall',rationale,{sound:'Energy'});
const stream=(style:string,vfx:SharedVfx,rationale:string)=>preset(style,'None',vfx,'HitSmall',rationale,{sound:'Stream'});

export const movePresentationPresets={
 dash:preset('impact','Dash','None','HitSmall','몸통을 전진시켜 부딪치는 접촉 공격',{screenEffect:'ShakeSmall',impactAt:430}),
 fastdash:preset('impact','FastDash','None','HitSmall','빠른 접근과 짧은 잔상',{sound:'Rush',impactAt:430}),
 jump:preset('impact','Jump','None','HitHeavy','도약 또는 상승 후 내려치는 공격',{screenEffect:'ShakeSmall',impactAt:430}),
 spin:preset('impact','Spin','None','HitSmall','회전한 몸으로 타격',{impactAt:430}),
 punch:preset('punch','Dash','HitSmall','HitHeavy','주먹을 내밀어 단일 타격',{impactAt:430}),
 firepunch:preset('firepunch','Dash','FireBurst','HitHeavy','주먹 타격점의 불꽃',{impactAt:430}),
 icepunch:preset('icepunch','Dash','IceImpact','HitHeavy','주먹 타격점의 냉기',{impactAt:430}),
 electricpunch:preset('electricpunch','Dash','ElectricBurst','HitHeavy','주먹 타격점의 전기',{impactAt:430}),
 multihit:preset('punches','Dash','MultiHit','HitHeavy','여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현',{impactAt:430}),
 kick:preset('impact','Jump','None','HitHeavy','도약하며 발로 타격',{impactAt:430}),
 strike:preset('impact','Dash','None','HitHeavy','머리·팔·뿔·도구를 이용한 근거리 타격',{impactAt:430}),
 slash:preset('slash','Dash','Slash','HitSmall','날 또는 날개로 베는 궤적',{impactAt:430}),
 airslash:preset('airslash','None','Slash','HitSmall','공기·에너지·공간을 가르는 원거리 칼날',{sound:'Energy'}),
 claw:preset('claw','Dash','Claw','HitSmall','발톱을 교차하여 할퀴기',{impactAt:430}),
 leafslash:preset('leafslash','Dash','Slash','Leaf','잎날로 베기',{impactAt:430}),
 bite:preset('bite','Dash','Bite','HitSmall','위아래 이빨로 물기',{impactAt:430}),
 firebite:preset('firebite','Dash','Bite','FireBurst','불꽃을 두른 이빨',{impactAt:430}),
 icebite:preset('icebite','Dash','Bite','IceImpact','냉기를 두른 이빨',{impactAt:430}),
 electricbite:preset('electricbite','Dash','Bite','ElectricBurst','전기를 두른 이빨',{impactAt:430}),
 whip:preset('slash','Dash','Slash','HitSmall','꼬리·채찍을 휘두르는 긴 호',{impactAt:430}),
 bind:preset('psychicpulse','None','Ring','HitSmall','조임·덫·휘감기로 대상 주변을 압박',{stateExpression:'Protocol'}),
 quake:preset('quake','Shake','None','GroundImpactSmall','투사체 없이 전장과 참가 포켓몬을 흔드는 지진',{screenEffect:'ShakeLarge',sound:'Rumble',specialSequence:'Earthquake',impactAt:400}),
 ground:preset('mudburst','None','GroundImpactSmall','HitHeavy','대상 발밑에서 지면·기둥을 솟구침',{screenEffect:'ShakeSmall',sound:'Rumble',impactAt:400}),
 fall:preset('meteors','None','Projectile','GroundImpactSmall','대상 위에서 암석·얼음·물체가 낙하',{screenEffect:'ShakeSmall'}),
 meteors:preset('meteors','None','Projectile','Explosion','위에서 여러 물체를 떨어뜨림',{screenEffect:'Darken'}),
 disappear:preset('impact','Disappear','None','HitHeavy','숨었다 나타나 타격; 실제 잠복 상태는 공개 프로토콜 소유',{specialSequence:'TwoTurn',stateExpression:'Protocol',impactAt:430}),
 explosion:preset('fireblast','None','Explosion','HitHeavy','중심에서 크게 확산하는 폭발',{screenEffect:'Flash'}),
 fireburst:preset('fireblast','None','FireBurst','FireBurst','큰 불꽃을 모아 대상에서 폭발'),
 flame:stream('flame','FireStream','사용자에서 대상으로 연속 화염 분사'),
 firewave:stream('flame','Wave','넓게 퍼지는 뜨거운 바람'),
 fireorb:projectile('fireorb','Projectile','불꽃 구체 또는 포탄을 발사'),
 blueflame:projectile('blueflame','FireBurst','푸른 도깨비불이 부유하며 이동'),
 waterbeam:stream('waterbeam','WaterStream','가느다란 물줄기 또는 고압수 분사'),
 wave:stream('wave','WaterWave','전장으로 넓게 밀려오는 물결'),
 waterorb:projectile('waterorb','Projectile','물 구체·거품을 발사'),
 vortex:preset('darkpulse','None','Ring','Wave','회오리가 대상 주변을 감쌈',{stateExpression:'Protocol'}),
 wind:stream('blizzard','Wave','바람·냉기·폭풍이 전장을 가로지름'),
 blizzard:stream('blizzard','IceImpact','넓게 흩날리는 눈보라'),
 icebeam:stream('icebeam','IceBeam','대상을 잇는 냉기 광선'),
 bolt:preset('thunder','None','ElectricBolt','ElectricBurst','상공에서 대상에게 수직 낙뢰',{screenEffect:'Darken',sound:'Energy',impactAt:180}),
 thunder:preset('electricburst','None','ElectricBurst','ElectricBurst','대상 주변에서 전격을 집중·방출',{sound:'Energy',impactAt:180}),
 electricorb:projectile('electricorb','ElectricBolt','짧은 전기 구체 또는 전격을 전달'),
 beam:stream('beam','Beam','사용자와 대상을 연결하는 에너지 광선'),
 greenbeam:stream('greenbeam','Beam','모은 빛을 직선으로 방출'),
 dragonbeam:stream('dragonbeam','Stream','숨결을 대상에게 분사'),
 leaves:projectile('leaves','Leaf','잎·꽃잎을 여러 궤적으로 날림'),
 greenorb:projectile('greenorb','Projectile','씨앗·생명력·식물 구체를 전달'),
 shadoworb:preset('shadoworb','None','ShadowOrb','Smoke','그림자 에너지를 모아 구체로 발사',{screenEffect:'Darken',sound:'Energy',duration:1100}),
 dragonorb:projectile('dragonorb','Projectile','용의 에너지를 구체로 전달'),
 fairyorb:projectile('fairyorb','Projectile','빛 구체를 대상에서 확산'),
 poisonorb:projectile('poisonorb','Projectile','독·산성 액체·점액을 발사'),
 mudorb:projectile('mudorb','Projectile','고체·모래·진흙·작은 물체를 던짐'),
 projectile:projectile('projectile','Projectile','작은 에너지·별·구체를 날림'),
 psychicpulse:preset('psychicpulse','None','Aura','HitSmall','대상에 에너지·초능력 압박을 집중',{sound:'Energy'}),
 darkpulse:preset('darkpulse','None','Wave','HitSmall','어두운 에너지를 파동으로 방출',{screenEffect:'Darken',sound:'Energy'}),
 fairypulse:preset('fairypulse','None','Wave','HitSmall','밝은 에너지를 넓게 방출',{screenEffect:'Flash',sound:'Energy'}),
 poisonpulse:projectile('poisonpulse','Smoke','가루·가스·독 안개를 넓게 확산'),
 sound:preset('soundwave','None','SoundWave','None','목소리·울림을 사용자에서 대상까지 동심원으로 전달',{sound:'Voice',specialSequence:'SoundWave',targetEffect:'None'}),
 drain:preset('greenorb','None','Aura','None','대상에서 사용자로 생명력을 회수',{specialSequence:'Drain',sound:'Energy'}),
 clone:support('본체 양옆 반투명 분신이 벌어졌다 합쳐짐','None',{pokemonMotion:'Clone',specialSequence:'DoubleTeamClone',rendererStyle:'clone'}),
 buff:support('기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생'),
 debuff:support('위협·몸짓으로 대상에 압박을 전달'),
 heal:support('회복 준비; 실제 HP 회복은 결과 이벤트에서 표시'),
 shield:support('사용자 주변 방어막을 짧게 펼침','Ring'),
 weather:support('날씨 발동; 지속 상태는 기존 필드 레이어가 표시','Weather'),
 terrain:support('바닥·공간에 필드 효과 발동','Wave'),
 hazard:support('상대 진영에 설치 또는 포획 표시','GroundImpactSmall'),
 mist:support('전장에 안개·바람이 잠시 확산','Smoke'),
 state:support('상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시','Aura',{specialSequence:'StateChange'}),
} satisfies Record<string,MovePresentation>;

export type MovePresentationPreset=keyof typeof movePresentationPresets;
export const movePresentations:Readonly<Record<string,string>>=assignments;
export const movePresentationOverrides:Readonly<Record<string,Partial<MovePresentation>>>={
 Flamethrower:{impactVfx:'FireBurst'},
 'Ice Beam':{impactVfx:'IceImpact'},
 'Sheer Cold':{rendererStyle:'blizzard',mainVfx:'IceImpact',impactVfx:'IceImpact',rationale:'대상을 절대영도의 냉기로 봉쇄; 공용 눈보라로 근사'},
 'Swords Dance':{rationale:'칼춤을 상징하는 준비 오라; 공격 상승 시각 효과는 결과에서 한 번만 재생'},
};
// Unknown future/custom moves are explicit safe fallbacks, never silently
// assigned by type. Coverage tests require a named assignment for catalog moves.
export function movePresentation(move:string):MovePresentation {
 const base=movePresentationPresets[movePresentations[move] as MovePresentationPreset]??movePresentationPresets.projectile;
 return movePresentationOverrides[move]?{...base,...movePresentationOverrides[move]}:base;
}

// All have a shared design now. These need visual/state choreography review
// before richer versions replace their deliberately brief shared adapter.
export const movePresentationReview:Readonly<Record<string,string>>={
 Substitute:'대타 스프라이트의 지속·해제 표현',
 'Shed Tail':'대타와 교체 연결',Transform:'변신 전환과 복사 외형',
 Dig:'잠복 준비 턴과 타격 턴 분리',Dive:'잠수 준비 턴과 타격 턴 분리',
 Fly:'비행 준비 턴과 타격 턴 분리','Phantom Force':'사라짐의 지속과 복귀','Shadow Force':'사라짐의 지속과 복귀',
 Metronome:'후속으로 실제 호출된 기술과 연출 중복 확인','Sleep Talk':'후속 호출 기술과 연결',
 'Mirror Move':'후속 호출 기술과 연결',Copycat:'후속 호출 기술과 연결',
 'Future Sight':'사용 턴과 지연 타격 구분','Doom Desire':'사용 턴과 지연 타격 구분',
 'Sheer Cold':'절대영도 냉기 봉쇄의 공용 오라 대체 품질',
 'Dragon Darts':'복수 대상 및 2회 타격 연결',
 'Population Bomb':'실제 명중 횟수에 맞춘 타격 동기화',
 'Revival Blessing':'비활성 아군 부활의 표시 위치',
};
