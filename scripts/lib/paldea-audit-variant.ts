import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {FORMAT} from '../../src/data/battle-rules';

export const paldeaAuditVariants=['current','tulip-no-item','rika-toxic-spikes'] as const;
export type PaldeaAuditVariant=typeof paldeaAuditVariants[number];
export function applyPaldeaAuditVariant(packed:string,variant:PaldeaAuditVariant){
 if(variant==='current')return packed;
 const team=Showdown.Teams.unpack(packed)!;
 if(variant==='tulip-no-item'){
  const gallade=team.find(p=>p.species==='Gallade');assert.ok(gallade,'Tulip audit requires Gallade');gallade.item='';
 }else{
  const clodsire=team.find(p=>p.species==='Clodsire');assert.ok(clodsire,'Rika audit requires Clodsire');assert.equal(clodsire.moves[2],'Stone Edge');clodsire.moves[2]='Toxic Spikes';
 }
 const validator=new Showdown.TeamValidator(FORMAT);
 for(const p of team)assert.equal(validator.validateSet(structuredClone(p),{}),null,p.species);
 return Showdown.Teams.pack(team);
}
