import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {GimmickPolicy,LegacyGimmickPolicy} from '../src/battle/gimmick-policy';
import {legalActions,type Observation,type Request} from '../src/battle/policy';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {packTeam,starters,pokemonSets} from '../src/data/teams';
import {runBattle,replayBattle} from '../src/battle/run';
import {opponentProfile} from '../src/server/opponent-training';
import {statKeys,type StatBlock} from '../src/data/training';
import {FORMAT} from '../src/data/battle-rules';
function observation(move:string,target='Blastoise',condition='100/100'):Observation {
 const request:Request={side:{pokemon:[{ident:'p2: Pikachu',details:'Pikachu, L50',condition:'100/100',active:true,stats:{atk:100,spa:100,spe:100,def:80,spd:80}}]},active:[{canDynamax:true,moves:[{id:Showdown.Dex.moves.get(move).id,move,pp:10}],maxMoves:{maxMoves:[{move:move==='Thunder Wave'?'maxguard':'maxlightning'}]}}]};
 return {turn:1,ownTeam:request.side.pokemon,opponent:{species:target,condition},legalActions:legalActions(request,target)};
}
test('v4 waits on support, immunity and a nearly fainted foe, while saved v3 keeps its immediate activation',()=>{
 assert.equal(new GimmickPolicy().choose(observation('Thunder Wave')),'move 1');
 assert.equal(new GimmickPolicy().choose(observation('Thunderbolt','Garchomp')),'move 1');
 assert.equal(new GimmickPolicy().choose(observation('Thunderbolt','Blastoise','20/100')),'move 1');
 assert.equal(new GimmickPolicy().choose(observation('Thunderbolt')),'move 1 dynamax');
 assert.equal(new LegacyGimmickPolicy().choose(observation('Thunder Wave')),'move 1 dynamax');
 const mega=observation('Thunderbolt');mega.legalActions.push({...mega.legalActions[0],command:'move 1 mega'});assert.equal(new GimmickPolicy().choose(mega),'move 1 mega');
});
test('Lance and Red keep their signatures, original pools, varied triples and one legal band at the right floors',()=>{
 const validator=new Showdown.TeamValidator(FORMAT);
 for(const floor of [40,50]){const parties=new Set<string>();for(let i=0;i<24;i++){
 const encounter=towerTrainerEncounter(floor,'gimmick-check-'+i,'johto')!,team=generateOpponentTeam(floor,[i+1,2,3,4],[],encounter);
 const signature=floor===40?'Dragonite':'Pikachu';assert.equal(encounter.ace,signature);assert.equal(team.find(p=>p.name===signature)!.item,'Dynamax Band');
 assert.equal(team.filter(p=>p.item==='Dynamax Band').length,1);assert.equal(new Set(team.map(p=>p.item).filter(Boolean)).size,team.filter(p=>p.item).length);
 for(const p of team){assert.ok(encounter.entries.includes(p.name));assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.name]),moves:p.moves,ability:p.ability!,item:p.item==='Dynamax Band'?'':p.item},{}),null);}
 parties.add(team.map(p=>p.name).sort().join(','));}assert.ok(parties.size>=5);}
});
test('live boss builds actually transform at most once and replay with v4 decisions',async()=>{
 for(const floor of [40,50]){let uses=0;for(let i=1;i<=8;i++){
 const seed=[i,2,3,4] as [number,number,number,number],enc=towerTrainerEncounter(floor,'integration-'+i,'johto')!,team=generateOpponentTeam(floor,seed,[],enc);
 const profiles=Object.fromEntries(team.map(p=>[p.name,{...opponentProfile(p.name,p.moves,floor,Object.fromEntries(statKeys.map(k=>[k,20])) as StatBlock),ability:p.ability!}]));
 const log=await runBattle({teams:{p1:packTeam(starters),p2:packTeam(team.map(p=>p.name),profiles,Object.fromEntries(team.map(p=>[p.name,p.item??''])))},seed,player:new GimmickPolicy(),opponent:new GimmickPolicy()});
 const activated=log.publicProtocol.filter(l=>l.startsWith('|-start|p2')&&l.includes('|Dynamax'));assert.ok(activated.length<=1);uses+=activated.length;
 if(i===1){const replay=await replayBattle(log);assert.deepEqual(replay.publicProtocol.filter(l=>!l.startsWith('|t:|')),log.publicProtocol.filter(l=>!l.startsWith('|t:|')));}
 }assert.ok(uses>0);}
});
