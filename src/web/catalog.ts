import {species,pokemonName} from '../data/pokemon-catalog';
export {species,pokemonName} from '../data/pokemon-catalog';
import {moveInfo,moveTypeNames} from '../data/move-info';
import {effectNotice} from './battle-effects';
import {pixelSpriteSources} from '../data/pixel-sprites';
import {localPokemonPng} from '../data/local-pokemon-sprites';
import additionalAnimations from '../data/additional-animations.json' with {type:'json'};

const presetMoves: Record<string, {name: string; type: string; color: string}> = {
  Flamethrower: {name: '화염방사', type: '불꽃', color: 'fire'},
  'Air Slash': {name: '에어슬래시', type: '비행', color: 'flying'},
  'Dragon Pulse': {name: '용의파동', type: '드래곤', color: 'dragon'},
  Slash: {name: '베어가르기', type: '노말', color: 'normal'},
  Surf: {name: '파도타기', type: '물', color: 'water'},
  'Ice Beam': {name: '냉동빔', type: '얼음', color: 'ice'},
  'Dark Pulse': {name: '악의파동', type: '악', color: 'dark'},
  'Flash Cannon': {name: '러스터캐논', type: '강철', color: 'steel'},
  'Energy Ball': {name: '에너지볼', type: '풀', color: 'grass'},
  'Sludge Bomb': {name: '오물폭탄', type: '독', color: 'poison'},
  'Earth Power': {name: '대지의힘', type: '땅', color: 'ground'},
  Tackle: {name: '몸통박치기', type: '노말', color: 'normal'},
  Thunderbolt: {name: '10만볼트', type: '전기', color: 'electric'},
  'Quick Attack': {name: '전광석화', type: '노말', color: 'normal'},
  'Thunder Shock': {name: '전기쇼크', type: '전기', color: 'electric'},
  Swift: {name: '스피드스타', type: '노말', color: 'normal'},
  Waterfall: {name: '폭포오르기', type: '물', color: 'water'},
  'Ice Fang': {name: '얼음엄니', type: '얼음', color: 'ice'},
  Bite: {name: '물기', type: '악', color: 'dark'},
  'Body Slam': {name: '누르기', type: '노말', color: 'normal'},
  Crunch: {name: '깨물어부수기', type: '악', color: 'dark'},
  'Ice Punch': {name: '냉동펀치', type: '얼음', color: 'ice'},
  'Rock Slide': {name: '스톤샤워', type: '바위', color: 'ground'},
  Struggle: {name: '발버둥', type: '노말', color: 'normal'},
  'Extreme Speed': {name: '신속', type: '노말', color: 'normal'},
  'Play Rough': {name: '치근거리기', type: '페어리', color: 'fairy'},
  'Grass Knot': {name: '풀묶기', type: '풀', color: 'grass'},
  'Focus Blast': {name: '기합구슬', type: '격투', color: 'fighting'},
  'Rock Blast': {name: '락블레스트', type: '바위', color: 'rock'},
  'Ice Shard': {name: '얼음뭉치', type: '얼음', color: 'ice'},
  Psychic: {name: '사이코키네시스', type: '에스퍼', color: 'psychic'},
  'Shadow Ball': {name: '섀도볼', type: '고스트', color: 'ghost'},
  'Dazzling Gleam': {name: '매지컬샤인', type: '페어리', color: 'fairy'},
  'Aura Sphere': {name: '파동탄', type: '격투', color: 'fighting'},
  Earthquake: {name: '지진', type: '땅', color: 'ground'},
  'Heavy Slam': {name: '헤비봄버', type: '강철', color: 'steel'},
  'Hyper Voice': {name: '하이퍼보이스', type: '노말', color: 'normal'},
  'Bullet Punch': {name: '불릿펀치', type: '강철', color: 'steel'},
  'X-Scissor': {name: '시저크로스', type: '벌레', color: 'bug'},
  'Close Combat': {name: '인파이트', type: '격투', color: 'fighting'},
  'Iron Head': {name: '아이언헤드', type: '강철', color: 'steel'},
  'Dragon Claw': {name: '드래곤클로', type: '드래곤', color: 'dragon'},
  'Fire Punch': {name: '불꽃펀치', type: '불꽃', color: 'fire'},
  'Meteor Mash': {name: '코멧펀치', type: '강철', color: 'steel'},
  'Zen Headbutt': {name: '사념의박치기', type: '에스퍼', color: 'psychic'},
  'Fire Fang': {name: '불꽃엄니', type: '불꽃', color: 'fire'},
};
export const moves:Record<string,{name:string;type:string;color:string}>={...Object.fromEntries(Object.entries(moveInfo).map(([key,value])=>[key,{name:value.name,type:moveTypeNames[value.type],color:value.type.toLowerCase()}])),...presetMoves};
export function battlePokemonName(name:string){
  if(/^Urshifu(?:-Rapid-Strike)?(?:-Gmax)?$/.test(name))return name.endsWith('-Gmax')?'거다이맥스 우라오스':'우라오스';
  return pokemonName(name);
}
export const statNames: Record<string, string> = {atk:'공격', def:'방어', spa:'특수공격', spd:'특수방어', spe:'스피드', accuracy:'명중률', evasion:'회피율'};
export const spriteUrl = (name: string, back = false, spriteId?:number) => {
  const id = spriteId ?? species[name]?.spriteKey ?? species[name]?.id;
  if(id && Number(id)>=650){const pixel=pixelSpriteSources(id,back);if(pixel.length)return pixel[0];}
  if(!id)return '';
  const local=localPokemonPng(id,back);
  const extra=(additionalAnimations as Record<string,Partial<Record<'front'|'back',{png:string}>>>)[id]?.[back?'back':'front'];
  return local || extra?.png || '';
};
export function health(condition: string) {
  if (condition.includes('fnt')) return {percent: 0, text: '기절', status: ''};
  const [fraction, status] = condition.split(' ');
  const [current, maximum] = fraction.split('/').map(Number);
  const percent = maximum > 0 ? Math.max(0, Math.min(100, current / maximum * 100)) : 0;
  const statuses: Record<string, string> = {par: '마비', brn: '화상', psn: '독', tox: '맹독', slp: '잠듦', frz: '얼음'};
  return {percent, text: fraction, status: statuses[status] ?? status ?? ''};
}
import {teraNames} from '../data/tera';
export function describeLine(line: string): string | null {
  if(line.split('|').includes('[raid]'))return null;
  const [, event, actor, value,condition] = line.split('|');
  if(event==='message')return actor;
  const subject = actor?.includes(': ') ? `${actor.startsWith('p2') ? '상대 ' : ''}${pokemonName(actor.split(': ')[1])}` : '';
  const trigger = effectNotice(line);
  const owner = trigger ? `${trigger.side === 'enemy' ? '상대 ' : ''}${pokemonName(trigger.actor.split(': ')[1])}` : '';
  const cause = trigger ? ` (${owner}의 ${trigger.label})` : '';
  if(event==='-zpower')return `${subject}는 Z파워를 해방했다!`;
  if(event==='-zbroken')return `${subject}의 방어를 뚫고 Z기술이 명중했다!`;
  if(event==='-mega')return `${subject}는 메가진화했다!`;
  if(event==='-primal')return `${subject} 원시회귀!`;
  if(event==='-start' && value==='Dynamax')return `${subject}가 ${condition==='Gmax'?'거다이맥스':'다이맥스'}했다!`;
  if(event==='-terastallize')return `${subject}가 ${teraNames[value] ?? value} 타입으로 테라스탈했다!`;
  if(event==='-end' && value==='Dynamax')return `${subject}의 다이맥스가 끝났다.`;
  if (event === '-ability' && trigger?.name === 'Sturdy') return `${subject}는 옹골참으로 버텼다!`;
  if (trigger && ['-enditem','-activate'].includes(event) && ['Focus Sash','Focus Band'].includes(trigger.name)) return `${subject}는 ${trigger.label}로 버텼다!`;
  if (trigger && ['-ability','-activate','-enditem','-block'].includes(event)) return `${owner}의 ${trigger.label} 발동!`;
  if (event === '-start' && value === 'Disable' && trigger) return `${subject}의 기술이 봉인되었다.${cause}`;
  if (event === '-start' && trigger) return `${owner}의 ${trigger.label} 발동!`;
  if (event === 'move') return `${subject}의 ${moves[value]?.name ?? value}!`;
  if (event === 'switch' || event === 'drag') return `${subject} 등장!`;
  if (event === 'faint') return `${subject} 쓰러졌다.`;
  if (event === '-damage') return `${subject}의 HP가 줄었다. (남은 HP ${Math.ceil(health(value).percent)}%)${cause}`;
  if (event === '-heal') {
    if(line.split('|').includes('[silent]'))return null;
    const absorbed = trigger?.name === 'Water Absorb' ? '물' : trigger?.name === 'Volt Absorb' ? '전기' : null;
    return `${absorbed ? `${subject}에게 ${absorbed} 기술은 효과가 없다!\n` : ''}${subject}의 HP가 회복되었다. (남은 HP ${Math.ceil(health(value).percent)}%)${cause}`;
  }
  if (event === '-supereffective') return '효과가 굉장했다!';
  if (event === '-resisted') return '효과가 별로인 듯하다…';
  if (event === '-immune') return `${subject}에게 효과가 없다.${cause}`;
  if (event === '-crit') return '급소에 맞았다!';
  if (event === '-miss') return '공격이 빗나갔다.';
  if (event === 'cant') return `${subject} 행동할 수 없다.`;
  if (event === '-status') return `${subject} 상태이상: ${health(`1/1 ${value}`).status}${cause}`;
  if (event === '-curestatus') return `${subject} 상태이상에서 회복했다.${cause}`;
  if (event === '-boost' || event === '-unboost') {
    const stages = Number(line.split('|')[4]);
    return `${subject}의 ${statNames[value] ?? value}${event === '-boost' ? ' 상승' : ' 하락'}!${stages > 1 ? ` (${stages}단계)` : ''}${cause}`;
  }
  if (event === '-hitcount') return `${value}번 맞았다!`;
  if (event === '-fail' && value === 'unboost' && trigger) return `${subject}의 능력치는 ${trigger.label} 덕분에 떨어지지 않았다!`;
  if (event === '-fail') return `${subject}의 기술은 실패했다.${cause}`;
  if (event === '-weather') {
    const weather: Record<string,string> = {Sandstorm:'모래바람이 불고 있다.', RainDance:'비가 내리고 있다.', SunnyDay:'햇살이 강하다.',DesolateLand:'햇살이 매우 강해졌다.',PrimordialSea:'강한 비가 내리기 시작했다.', Hail:'싸라기눈이 내리고 있다.', Snow:'눈이 내리고 있다.', none:'날씨가 원래대로 돌아왔다.'};
    return weather[actor] ? `${weather[actor]}${cause}` : null;
  }
  if (event === 'win') return actor === 'Player' ? '승리! 상대 팀을 모두 쓰러뜨렸습니다.' : '패배. 다시 도전해 보세요.';
  if (event === 'tie') return '무승부로 배틀이 끝났습니다.';
  return null;
}
