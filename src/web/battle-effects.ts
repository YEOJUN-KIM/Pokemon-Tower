import {abilityNames} from './pokedex-data';
import {heldItems,npcItemNames} from '../data/held-items';

export type EffectNotice = {kind:'ability' | 'item'; side:'player' | 'enemy'; actor:string; name:string; label:string};
export const itemNames: Record<string,string> = {
  ...npcItemNames,
  'Light Ball':'전기구슬', 'Focus Sash':'기합의띠', 'Focus Band':'기합의머리띠', Leftovers:'먹다남은음식',
  'Sitrus Berry':'자뭉열매', 'Oran Berry':'오랭열매', 'Lum Berry':'리샘열매',
  'Life Orb':'생명의구슬', 'Rocky Helmet':'울퉁불퉁멧', 'White Herb':'하양허브',
  'Mental Herb':'멘탈허브', 'Power Herb':'파워풀허브', 'Air Balloon':'풍선',
  'Weakness Policy':'약점보험', 'Red Card':'레드카드', 'Eject Button':'탈출버튼',
  ...Object.fromEntries(Object.entries(heldItems).map(([name,item])=>[name,item.name])),
};

// Public activation events are the evidence; 1% HP or ownership alone is not.
// [of] identifies the owner when their effect is applied to another Pokemon.
export function effectNotice(line:string): EffectNotice | null {
  const [,event,actor,value,...tags] = line.split('|');
  const metadata=[value,...tags];
  if(metadata.includes('[silent]'))return null;
  let kind:EffectNotice['kind'];
  let name:string;
  let owner=actor;
  if(event === '-ability' && value) {kind='ability';name=value;}
  else if(event === '-enditem' && value) {
    if(tags.some(tag=>tag.startsWith('[from] move:') || tag === '[from] takeitem'))return null;
    kind='item';name=value;
  } else {
    const direct=['-activate','-start','-block'].includes(event) ? value?.match(/^(ability|item): (.+)$/) : null;
    const from=metadata.find(tag=>tag?.startsWith('[from] ability: ') || tag?.startsWith('[from] item: '))?.match(/^\[from\] (ability|item): (.+)$/);
    const source=direct ?? from;
    if(!source)return null;
    kind=source[1] as EffectNotice['kind'];name=source[2];
    if(!direct)owner=metadata.find(tag=>tag?.startsWith('[of] '))?.slice(5) ?? actor;
    // In absorption healing [of] is the attacker whose move was absorbed,
    // whereas in Rough Skin damage it is the ability owner.
    if(event === '-heal' && kind === 'ability' && ['Water Absorb','Volt Absorb','Dry Skin'].includes(name))owner=actor;
  }
  const side=owner?.startsWith('p1') ? 'player' : owner?.startsWith('p2') ? 'enemy' : null;
  if(!side)return null;
  return {kind,side,actor:owner,name,label:(kind === 'ability' ? abilityNames : itemNames)[name] ?? name};
}
