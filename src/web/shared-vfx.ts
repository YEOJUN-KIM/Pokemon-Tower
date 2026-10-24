import type {SharedVfx} from './move-presentation';

type VfxSupport={status:'existing'|'procedural'|'approximation';implementation:string;next:string|null};
const existing=(implementation:string):VfxSupport=>({status:'existing',implementation,next:null});
const procedural=(implementation:string):VfxSupport=>({status:'procedural',implementation,next:null});
const approximation=(implementation:string,next:string):VfxSupport=>({status:'approximation',implementation,next});
// Logical requirements, not filenames. An approximation is playable today;
// `next` describes optional shared asset/renderer work, never a missing download.
export const sharedVfxCatalog:Record<Exclude<SharedVfx,'None'>,VfxSupport>={
 HitSmall:existing('hitmarker.png'),HitHeavy:existing('impact.png'),
 Slash:existing('leftslash.png + rightslash.png'),Claw:existing('leftclaw.png + rightclaw.png'),
 Bite:existing('topbite.png + bottombite.png'),MultiHit:existing('fist.png 공용 반복'),
 Projectile:approximation('기존 wisp·구체 PNG','고체·별·바늘·구체의 공용 형태 및 재질 파라미터'),
 Beam:approximation('Canvas 선 + wisp stream','직선 광선의 폭·끝점·충돌 형태 정리'),
 Stream:approximation('bluefireball stream','숨결·입김 공용 분사'),
 FireStream:existing('flamethrower-beam.png 및 fireball stream'),
 FireBurst:approximation('fireball.png 확산','독립적인 공용 불꽃 폭발'),
 WaterStream:approximation('waterwisp.png + Canvas 선','연속 물줄기 형태'),
 WaterWave:approximation('waterwisp.png 확산','넓은 물결 형태'),
 ElectricBolt:procedural('Canvas 수직 낙뢰 또는 electroball 구체'),
 ElectricBurst:existing('electroball.png 대상 주변 확산'),
 IceBeam:approximation('iceball.png + Canvas 선','연속 냉기 광선'),
 IceImpact:existing('iceball.png 확산'),Leaf:existing('leaf1.png + leaf2.png'),
 ShadowOrb:existing('shadowball.png + blackwisp.png'),
 Explosion:approximation('fireball.png + impact.png','불꽃 재질에 한정되지 않는 공용 폭발'),
 Smoke:approximation('blackwisp·purplewisp 및 support adapter','연기·가루의 재질과 퍼짐'),
 Aura:approximation('wisp·purplewisp 공용 오라','자기 강화·대상 압박·회복의 준비 오라 구분'),
 Ring:approximation('공용 pulse·support adapter','방어막·조임 링'),
 Wave:approximation('공용 pulse·stream adapter','불꽃 바람·에너지 파동의 폭과 재질'),
 Weather:approximation('발동 support + 기존 필드 레이어','발동 시 날씨 입자'),
 GroundImpactSmall:approximation('mudwisp.png + impact.png','작은 먼지·지면 균열·돌출 기둥 구분'),
 SoundWave:procedural('Canvas 동심원'),
};
export const rankVfxCatalog={
 AuraUp:procedural('공용 상승 화살표 + 포켓몬 녹색 빛 CSS'),
 AuraDown:procedural('공용 하강 화살표 + 포켓몬 푸른 빛 CSS'),
};
