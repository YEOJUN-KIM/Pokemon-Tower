import type {NpcAi} from '../data/npc-ai';
import {createNpcPolicy as v12Policy} from './npc-policy-v12';
import {PriorityEntryPolicy} from './priority-entry-policy';
import type {Policy} from './policy';
import {GalarPolicy} from './galar-policy';
import {PivotPolicy} from './pivot-policy';
import {GalarAcePolicy} from './galar-ace-policy';
import {AdvancedSwitchPolicy} from './advanced-switch-policy';
import {PaldeaPolicy} from './paldea-policy';
import {paldeaTrainer} from '../data/paldea-trainers';

// Existing saved versions keep their original factories. New battles opt in.
export function createNpcPolicy(ai:NpcAi={tier:'basic',tactic:'balanced'}):Policy{
 const policy=new PriorityEntryPolicy(v12Policy(ai),ai.tier!=='basic');
 let selected:Policy=ai.galar?new GalarPolicy(policy,ai.galar):policy;
 if(ai.galarAce==='v2')selected=new GalarAcePolicy(selected);
 const paldea=ai.paldea?paldeaTrainer(ai.paldea):undefined;
 if(paldea)selected=new PaldeaPolicy(selected,paldea.category as 'gym'|'elite'|'champion'|'hidden'|'event',paldea.ace).withTera(paldea.teraType);
 if(ai.advancedSwitch)selected=new AdvancedSwitchPolicy(selected,{aggressive:ai.advancedSwitch==='aggressive-v1',setupLead:paldea?.category==='hidden'});
 else if(ai.pivot==='v1')selected=new PivotPolicy(selected);
 if(ai.galar||ai.galarAce||ai.pivot||ai.advancedSwitch||ai.paldea)return selected;
 // Basic tracks only its own chosen actions/entries, without public learning
 // or proactive switching. Preserve its existing observation contract.
 return ai.tier==='basic'?{choose:o=>policy.choose(o)}:policy;
}
