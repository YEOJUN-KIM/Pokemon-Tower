import {createReadStream,readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle,battleEvents} from '../src/battle/run';
import {allowsGimmick} from '../src/data/run-rules';
import {PublicImmunityV2} from '../src/battle/public-immunity-v2';
const prefix='artifacts/experiments/ai/opponent-learning-20261011';
const manifest=JSON.parse(readFileSync(prefix+'-manifest.json','utf8'));
const courses=JSON.parse(readFileSync(manifest.courseFile,'utf8')).courses;
const cases:any[]=[];
for(const rule of manifest.rules)for await(const l of createInterface({input:createReadStream(prefix+`-${rule}-v8-battles.jsonl`),crlfDelay:Infinity})){
 const b=JSON.parse(l);if(!b.npcDecisionMetrics.quickReturns)continue;
 const enemyMemory=new PublicImmunityV2(),departed=new Map<string,{turn:number;opponent:string}>(),returns:any[]=[];
 const queue=(side:'p1'|'p2')=>{const choices=b.decisions.filter((d:any)=>d.side===side);let n=0;return{switchingInformation:true,uncertainSwitchingInformation:true,observePublicLine:(line:string)=>{if(side==='p2')enemyMemory.consume(line.replace(/\bp([12])(?=[a-z]?:)/g,(_,n)=>'p'+(n==='1'?'2':'1')));},choose:(o:any)=>{
  const action=choices[n++].action;
  if(side==='p2'&&action.startsWith('switch ')&&o.legalActions.some((a:any)=>a.command.startsWith('move '))){
   const own=o.ownTeam.find((p:any)=>p.active),receiver=o.ownTeam[Number(action.split(' ')[1])-1],prior=departed.get(receiver.ident);
   if(prior&&o.turn-prior.turn<5){
    const attacks=o.legalActions.filter((a:any)=>a.command.startsWith('move ')&&Showdown.Dex.moves.get(a.label).category!=='Status');
    returns.push({turn:o.turn,from:own.ident,to:receiver.ident,departedTurn:prior.turn,oldOpponent:prior.opponent,opponent:o.opponent.species,opponentChanged:prior.opponent!==o.opponent.species,currentAttacks:attacks.map((a:any)=>({move:a.label,blocked:enemyMemory.blocked(a.label,own,o)})),receiverMoves:receiver.moves,publicAbility:enemyMemory.context().revealedAbility});
   }
   departed.set(own.ident,{turn:o.turn,opponent:o.opponent.species});
  }
  return action;
 }};};
 const e=courses.find((c:any)=>c.id===b.courseId).encounters[b.floor-1];
 const replay=await runBattle({rule,seed:b.seed,format:b.format,teams:{p1:Showdown.Teams.pack(b.playerTeam),p2:Showdown.Teams.pack(b.opponentTeam)},teraTickets:{p1:b.teraTicketsBefore,p2:allowsGimmick(rule,'terastallize')?e.enemyTeraTickets??1:0},battleItems:b.battleItemsBefore,player:queue('p1'),opponent:queue('p2')});
 assert.equal(replay.winner,b.winner);assert.equal(replay.turns,b.turns);assert.equal(returns.length,b.npcDecisionMetrics.quickReturns);
 if(b.publicProtocol)assert.deepEqual(battleEvents(replay.publicProtocol),b.publicProtocol);
 cases.push({rule,caseId:b.caseId,courseId:b.courseId,floor:b.floor,returns});
}
const all=cases.flatMap(c=>c.returns),result={postHoc:true,sourceAudit:prefix+'-audit.json',battles:cases.length,returns:all.length,opponentChanged:all.filter(r=>r.opponentChanged).length,currentAllAttacksBlocked:all.filter(r=>r.currentAttacks.length&&r.currentAttacks.every((a:any)=>a.blocked)).length,cases};
writeFileSync(prefix+'-returns.json',JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify(result,null,2));
