import type {NpcAi} from '../data/npc-ai';
import {createNpcPolicy as v12Policy} from './npc-policy-v12';
import {PriorityEntryPolicy} from './priority-entry-policy';
import type {Policy} from './policy';
import {GalarPolicy} from './galar-policy';

// Existing saved versions keep their original factories. New battles opt in.
export function createNpcPolicy(ai:NpcAi={tier:'basic',tactic:'balanced'}):Policy{
 const policy=new PriorityEntryPolicy(v12Policy(ai),ai.tier!=='basic');
 if(ai.galar)return new GalarPolicy(policy,ai.galar);
 // Basic tracks only its own chosen actions/entries, without public learning
 // or proactive switching. Preserve its existing observation contract.
 return ai.tier==='basic'?{choose:o=>policy.choose(o)}:policy;
}
