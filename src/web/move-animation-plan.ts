import {moveInfo} from '../data/move-info';

// Choreography adapted from Showdown's CC0 move definitions; rendering and
// responsive coordinates are independent of its jQuery scene implementation.
export const effectAssets=['blackwisp','bluefireball','bottombite','electroball','energyball','fireball','fist','hitmarker','iceball','impact','leaf1','leaf2','leftclaw','leftslash','mudwisp','purplewisp','rightclaw','rightslash','shadowball','topbite','waterwisp','wisp'] as const;
export type EffectAsset=typeof effectAssets[number];
export type EffectPoint={anchor:'source'|'target';x:number;y:number};
export type MoveParticle={asset:EffectAsset;start:number;end:number;from:EffectPoint;to:EffectPoint;size:number;grow:number;rotate:number;arc:number;opacity:number};
export type MoveAnimationPlan={style:string;duration:number;contact:boolean;offensive:boolean;particles:MoveParticle[];lightning:boolean;wash:string|null};
const point=(anchor:EffectPoint['anchor'],x=0,y=0):EffectPoint=>({anchor,x,y});
const recipes:Record<string,string>={
  Flamethrower:'flame',FireBlast:'fireblast',HeatWave:'flame',Overheat:'fireblast',WillOWisp:'blueflame',
  Surf:'wave',MuddyWater:'mudwave',HydroPump:'waterbeam',WaterGun:'waterbeam',Scald:'waterbeam',WaterPulse:'waterorb',
  Thunderbolt:'thunder',Thunder:'thunder',Discharge:'thunder',VoltSwitch:'electricorb',ElectroBall:'electricorb',
  IceBeam:'icebeam',Blizzard:'blizzard',IcyWind:'blizzard',ShadowBall:'shadoworb',DarkPulse:'darkpulse',
  EnergyBall:'greenorb',SolarBeam:'greenbeam',LeafStorm:'leaves',RazorLeaf:'leaves',MagicalLeaf:'leaves',
  LeafBlade:'leafslash',DragonClaw:'claw',MetalClaw:'claw',ShadowClaw:'claw',Slash:'slash',NightSlash:'slash',AirSlash:'airslash',XScissor:'crossslash',SacredSword:'slash',IronHead:'impact',
  Crunch:'bite',Bite:'bite',PsychicFangs:'bite',IceFang:'icebite',FireFang:'firebite',ThunderFang:'electricbite',
  CloseCombat:'punches',MachPunch:'punch',BulletPunch:'punch',DrainPunch:'punch',FirePunch:'firepunch',IcePunch:'icepunch',ThunderPunch:'electricpunch',MeteorMash:'punch',
  Earthquake:'quake',EarthPower:'mudburst',MudShot:'mudorb',RockSlide:'mudburst',StoneEdge:'mudburst',
  DragonPulse:'dragonorb',DragonBreath:'dragonbeam',DracoMeteor:'meteors',HyperBeam:'beam',FlashCannon:'beam',Moonblast:'fairyorb',DazzlingGleam:'fairypulse',Psychic:'psychicpulse',Psyshock:'psychicpulse',SludgeBomb:'poisonorb',SludgeWave:'poisonpulse',
};
const defaults:Record<string,string>={fire:'flame',water:'waterbeam',electric:'thunder',grass:'leaves',ice:'icebeam',ghost:'shadoworb',dark:'darkpulse',poison:'poisonorb',psychic:'psychicpulse',fairy:'fairyorb',dragon:'dragonorb',ground:'mudburst',rock:'mudburst',fighting:'punches',steel:'slash',bug:'crossslash',flying:'airslash',normal:'impact'};
const physicalDefaults:Record<string,string>={fire:'firepunch',electric:'electricpunch',ice:'icepunch',grass:'leafslash',ghost:'claw',dark:'bite',dragon:'claw',fighting:'punches',steel:'slash',bug:'crossslash'};
const statusRecipes:Record<string,string>={WillOWisp:'blueflame',Toxic:'poisonorb',PoisonPowder:'poisonpulse',ThunderWave:'electricorb',LeechSeed:'greenorb',SleepPowder:'leaves',Spore:'greenorb'};

export function moveAnimationPlan(move:string,color?:string,override?:{category:string}):MoveAnimationPlan {
  const info=override?{...moveInfo[move],...override}:moveInfo[move],type=color ?? info?.type.toLowerCase() ?? 'normal';
  const key=move.replace(/[^a-zA-Z]/g,'');
  const style=info?.category==='Status'?statusRecipes[key] ?? 'support':recipes[key] ?? (info?.category==='Physical'?physicalDefaults[type] ?? 'impact':defaults[type] ?? 'impact');
  const particles:MoveParticle[]=[];
  const contact=['punch','punches','firepunch','icepunch','electricpunch','claw','slash','leafslash','crossslash','bite','firebite','icebite','electricbite','impact'].includes(style);
  const plan:MoveAnimationPlan={style,duration:style==='shadoworb'?1100:950,contact,offensive:info?.category!=='Status',particles,lightning:style==='thunder',wash:null};
  const add=(asset:EffectAsset,start:number,end:number,from=point('target'),to=from,size=1,grow=1,rotate=0,arc=0,opacity=.9)=>particles.push({asset,start,end:Math.min(plan.duration,end),from,to,size,grow,rotate,arc,opacity});
  const burst=(asset:EffectAsset,start=540,size=1.5)=>add(asset,start,Math.min(plan.duration,start+300),point('target'),point('target'),size,2.2);
  const stream=(asset:EffectAsset,count=7,spread=.28)=>{const size=asset==='fireball'||asset==='bluefireball'?1.1:.65;for(let i=0;i<count;i++)add(asset,90+i*55,510+i*55,point('source',0,-.1),point('target',Math.sin(i*2.4)*spread,Math.cos(i*2.4)*spread),size,.75+i*.035,i*18,0,.8);};
  const orb=(asset:EffectAsset,charge:EffectAsset=asset)=>{
    for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;add(charge,i*35,300+i*25,point('source',Math.cos(angle)*1.4,Math.sin(angle)*1.4),point('source'),.5,.5,0,0,.65);}
    add(asset,230,680,point('source'),point('target'),1.2,1.15,0,-.45);burst(asset,650,1.5);
  };
  if(style==='support') {
    for(let i=0;i<8;i++){const a=i*Math.PI/4;add('wisp',i*30,750+i*20,point('target',Math.cos(a)*1.5,Math.sin(a)*.8),point('target',Math.cos(a)*.5,-1.8),.28,.65,0,0,.65);}
    return plan;
  }
  if(style==='flame'||style==='blueflame'){stream(style==='flame'?'fireball':'bluefireball',9);burst(style==='flame'?'fireball':'bluefireball',650);}
  else if(style==='fireblast') {stream('fireball',5);for(let i=0;i<5;i++){const a=i*2*Math.PI/5;add('fireball',420+i*25,880,point('target'),point('target',Math.cos(a)*1.4,Math.sin(a)*1.4),.85,1.3);}}
  else if(style==='wave'||style==='mudwave') {plan.wash='#0879cc';for(let i=0;i<9;i++)add(style==='wave'?'waterwisp':'mudwisp',i*35,580+i*35,point('source',(i-4)*.32,.6),point('target',(i-4)*.48,.1),1.2,2,0,-.7,.6);}
  else if(style==='waterbeam'){stream('waterwisp',10,.16);burst('waterwisp',680);}
  else if(style==='icebeam'||style==='greenbeam'||style==='dragonbeam'||style==='beam'){const asset=style==='icebeam'?'iceball':style==='greenbeam'?'energyball':style==='dragonbeam'?'bluefireball':'wisp';stream(asset,10,.08);burst(asset,660,1.7);}
  else if(style==='blizzard'){plan.wash='#b3e9ff';for(let i=0;i<12;i++)add('iceball',i*30,500+i*30,point('target',2+(i%3)*.2,-1.7+(i%4)),point('target',-2,-1+(i%4)*.6),.5,.9,i*30);}
  else if(style==='thunder'){plan.wash='#142138';for(let i=0;i<3;i++)burst('electroball',180+i*200,1.1);}
  else if(style==='leaves') {for(let i=0;i<10;i++)add(i%2?'leaf1':'leaf2',i*45,460+i*45,point('source',0,(i%3-1)*.2),point('target',(i%3-1)*.5,(i%4-2)*.4),.4,.7,i*95,(i%2?1:-1)*1.5);}
  else if(style==='shadoworb'){plan.wash='#241732';orb('shadowball','purplewisp');for(let i=0;i<4;i++)add('blackwisp',620+i*40,1000+i*25,point('target'),point('target',(i-1.5)*.6,-.5),.65,1.8);}
  else if(['electricorb','greenorb','waterorb','dragonorb','fairyorb','poisonorb','mudorb'].includes(style))orb(({electricorb:'electroball',greenorb:'energyball',waterorb:'waterwisp',dragonorb:'bluefireball',fairyorb:'wisp',poisonorb:'purplewisp',mudorb:'mudwisp'} as Record<string,EffectAsset>)[style]);
  else if(style.endsWith('pulse')) {const asset=style==='darkpulse'?'blackwisp':style==='poisonpulse'?'purplewisp':style==='psychicpulse'?'purplewisp':'wisp';plan.wash=style==='darkpulse'?'#201129':null;for(let i=0;i<5;i++)add(asset,160+i*105,490+i*105,point('target'),point('target'),.45,3.5);}
  else if(style==='claw'||style==='slash'||style==='leafslash'||style==='crossslash'||style==='airslash') {
    const claw=style==='claw';add(claw?'leftclaw':'leftslash',360,680,point('target',-.7,-.6),point('target',.4,.5),.8,1.5);
    add(claw?'rightclaw':'rightslash',440,790,point('target',.7,-.6),point('target',-.4,.5),.8,1.5);
    if(style==='leafslash'){burst('energyball',500);add('leaf1',340,680,point('target',-.5,-.5),point('target',1,.5),.5,1.2,120);}
    burst('hitmarker',510,.7);
  } else if(style.includes('bite')) {
    plan.wash='#22202b';add('topbite',290,590,point('target',0,-1.6),point('target',0,-.2),1.3,1);add('bottombite',290,590,point('target',0,1.6),point('target',0,.2),1.3,1);burst('impact',520,1.2);
    if(style!=='bite')burst(style==='firebite'?'fireball':style==='icebite'?'iceball':'electroball',520);
  } else if(style.includes('punch')) {
    for(let i=0;i<(style==='punches'?5:1);i++)add('fist',280+i*90,530+i*90,point('target',(i%2?1:-1)*.9,-.5),point('target',(i%2?-.2:.2),.15),.85,1.3,i%2?-25:25);
    burst('impact',460,1.2);if(style!=='punch'&&style!=='punches')burst(style==='firepunch'?'fireball':style==='icepunch'?'iceball':'electroball',470);
  } else if(style==='quake'||style==='mudburst') {
    plan.wash='#6c5326';for(let i=0;i<9;i++)add('mudwisp',180+i*45,550+i*40,point('target',(i%3-1)*.65,.8),point('target',(i%3-1)*.95,-.6),.55,1.6,0,-.5);burst('impact',400);
  } else if(style==='meteors') {plan.wash='#231d40';for(let i=0;i<5;i++)add('bluefireball',i*100,430+i*100,point('target',-2.5+i*.6,-3),point('target',(i-2)*.3,.2),.6,1.3,-35);burst('impact',620);}
  else {add('hitmarker',340,650,point('target'),point('target'),.8,1.8);burst('impact',380,1.2);}
  return plan;
}
