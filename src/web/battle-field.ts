import type {PublicField,FieldEffect} from './contracts';

const names:Record<string,string>={Sandstorm:'모래바람',RainDance:'비',SunnyDay:'쾌청',Snow:'눈',Hail:'싸라기눈',PrimordialSea:'강한 비',DesolateLand:'강한 햇살',DeltaStream:'난기류',GrassyTerrain:'그래스필드',ElectricTerrain:'일렉트릭필드',PsychicTerrain:'사이코필드',MistyTerrain:'미스트필드',TrickRoom:'트릭룸',WonderRoom:'원더룸',MagicRoom:'매직룸',Reflect:'리플렉터',LightScreen:'빛의장막',AuroraVeil:'오로라베일',Tailwind:'순풍',Safeguard:'신비의부적',Mist:'흰안개',StealthRock:'스텔스록',Spikes:'압정뿌리기',ToxicSpikes:'독압정',StickyWeb:'끈적끈적네트',Gravity:'중력'};
export function emptyField():PublicField{return {turn:0,effects:[],opponentSize:3,faintedOpponents:[],boosts:{p1:{},p2:{}}};}
// Derive only from public events, so unseen enemy species/items are never disclosed.
export function advanceField(previous:PublicField,line:string):PublicField {
  const state:PublicField={...previous,effects:previous.effects.map(effect=>({...effect})),faintedOpponents:[...previous.faintedOpponents],boosts:{p1:{...previous.boosts?.p1},p2:{...previous.boosts?.p2}}};
  const [,event,actor,value,...tags]=line.split('|');
  const side=actor?.startsWith('p1') ? 'p1' : actor?.startsWith('p2') ? 'p2' : null,boosts=state.boosts!;
  const keys=['atk','def','spa','spd','spe','accuracy','evasion'];
  if(side){
    const passesRanks=event==='switch' && tags.some(tag=>tag==='[from] move: Baton Pass');
    if(['switch','drag','faint','-clearboost'].includes(event) && !passesRanks)boosts[side]={};
    if(['-boost','-unboost','-setboost'].includes(event) && keys.includes(value)){
      const amount=Number(tags[0]);if(Number.isFinite(amount))boosts[side][value]=Math.max(-6,Math.min(6,event==='-setboost' ? amount : (boosts[side][value] ?? 0)+(event==='-unboost' ? -amount : amount)));
    }
    if(['-clearpositiveboost','-clearnegativeboost','-invertboost'].includes(event))for(const key of keys){const amount=boosts[side][key] ?? 0;boosts[side][key]=event==='-invertboost' ? -amount : event==='-clearpositiveboost' && amount>0 || event==='-clearnegativeboost' && amount<0 ? 0 : amount;}
    if(['-copyboost','-swapboost','-transform'].includes(event)){
      const other=value?.startsWith('p1') ? 'p1' : value?.startsWith('p2') ? 'p2' : null;
      if(other)for(const key of event==='-transform' || !tags[0] || tags[0].startsWith('[') ? keys : tags[0].split(', ')){if(!keys.includes(key))continue;const old=boosts[side][key] ?? 0;boosts[side][key]=boosts[other][key] ?? 0;if(event==='-swapboost')boosts[other][key]=old;}
    }
  }
  if(event==='-clearallboost')state.boosts={p1:{},p2:{}};
  if(event==='turn')state.turn=Number(actor);
  if(event==='teamsize' && actor==='p2')state.opponentSize=Number(value);
  if(event==='faint' && actor.startsWith('p2') && !state.faintedOpponents.includes(actor))state.faintedOpponents.push(actor);
  if(event==='-heal' && actor.startsWith('p2') && !value.includes('fnt'))state.faintedOpponents=state.faintedOpponents.filter(name=>name!==actor);
  const remove=(scope:FieldEffect['scope'],id?:string)=>{state.effects=state.effects.filter(effect=>effect.scope!==scope || (id!==undefined && effect.id!==id));};
  const add=(scope:FieldEffect['scope'],raw:string)=>{
    const id=raw.replace(/^(move|ability): /,'').replaceAll(' ','');
    const existing=state.effects.find(effect=>effect.scope===scope && effect.id===id);
    if(existing){if(['Spikes','ToxicSpikes'].includes(id))existing.layers=Math.min(id==='Spikes' ? 3 : 2,(existing.layers ?? 1)+1);return;}
    const permanent=['StealthRock','Spikes','ToxicSpikes','StickyWeb','PrimordialSea','DesolateLand','DeltaStream'].includes(id);
    const duration=permanent ? null : id==='Tailwind' ? 4 : 5;
    // Weather/terrain/screen extenders may be hidden; show an honest range until they end.
    const extended=scope==='weather' || id.endsWith('Terrain') || ['Reflect','LightScreen','AuroraVeil'].includes(id);
    state.effects.push({id,name:names[id] ?? raw.replace(/^move: /,''),scope,started:Math.max(1,state.turn),duration,maxDuration:extended && duration ? 8 : duration,...(['Spikes','ToxicSpikes'].includes(id) ? {layers:1} : {})});
  };
  if(event==='-weather' && ![value,...tags].includes('[upkeep]')){remove('weather');if(actor!=='none')add('weather',actor);}
  if(event==='-fieldstart')add('field',actor);
  if(event==='-fieldend')remove('field',actor.replace(/^move: /,'').replaceAll(' ',''));
  if(['-sidestart','-sideend'].includes(event)){
    const scope=actor.startsWith('p1') ? 'p1' : 'p2';
    if(event==='-sidestart')add(scope,value);else remove(scope,value.replace(/^move: /,'').replaceAll(' ',''));
  }
  return state;
}
export function fieldDuration(effect:FieldEffect,turn:number){
  if(['Spikes','ToxicSpikes'].includes(effect.id))return `${effect.layers ?? 1}중첩 · 해제될 때까지`;
  if(effect.duration===null)return ['PrimordialSea','DesolateLand','DeltaStream'].includes(effect.id) ? '특성이 유지되는 동안' : '해제될 때까지';
  const elapsed=Math.max(0,turn-effect.started),min=Math.max(0,effect.duration-elapsed),max=Math.max(0,(effect.maxDuration ?? effect.duration)-elapsed);
  return `${min===max ? max : min>0 ? `${min}–${max}` : `최대 ${max}`}턴 남음`;
}
