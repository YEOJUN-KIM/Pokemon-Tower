import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {packTeam} from '../src/data/teams';
import {runBattle,FORMAT} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {moveLearnsets} from '../src/server/move-learnsets';

const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
test('room sample interventions preserve all data except the two specified move fields',()=>{
 const source=read('tests/fixtures/room-sample/source.json');
 const variants={baseline:{},steel:{'Steel Roller':'Iron Head'},psychic:{'Future Sight':'Zen Headbutt'},both:{'Steel Roller':'Iron Head','Future Sight':'Zen Headbutt'}};
 for(const [mode,replacements] of Object.entries(variants)){
  const expected=structuredClone(source),c=expected.find((c:any)=>c.id==='auto-room-1');
  c.moves.Bronzong=c.moves.Bronzong.map((m:string)=>(replacements as Record<string,string>)[m]??m);
  c.profiles.Bronzong.moves=[...c.moves.Bronzong];
  assert.deepEqual(read(`tests/fixtures/room-sample/${mode}.json`),expected);
  for(const move of c.moves.Bronzong)assert(moveLearnsets.Bronzong.legalMoves.includes(move));
  const errors=new Showdown.TeamValidator(FORMAT).validateSet({species:'Bronzong',name:'Bronzong',level:50,ability:'Levitate',nature:'Brave',evs:{hp:1},moves:c.moves.Bronzong},{});
  assert(!errors,JSON.stringify(errors));
 }
 assert.deepEqual(read('tests/fixtures/room-sample/corrected.json'),read('tests/fixtures/room-sample/both.json'));
});

async function probe(move:string){
 const own=Showdown.Teams.unpack(packTeam(['Bronzong','Cofagrigus','Incineroar']))!;
 own[0].moves=[move,'Earthquake','Psychic','Trick Room'];
 const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Blastoise','Venusaur']))!;
 enemy[0].moves=['Rest','Body Slam','Earthquake','Crunch'];
 const fallback=new DamagePolicy();
 return runBattle({rule:'basic',seed:[1,2,3,4],teams:{p1:Showdown.Teams.pack(own),p2:Showdown.Teams.pack(enemy)},
  player:{choose:o=>o.turn<=2&&o.ownTeam[0].active&&o.legalActions.some(a=>a.command==='move 1')?'move 1':fallback.choose(o)},
  opponent:{choose:o=>o.turn<=2&&o.ownTeam[0].active&&o.legalActions.some(a=>a.command==='move 1')?'move 1':fallback.choose(o)}});
}
function turnLines(lines:string[],turn:number){const start=lines.indexOf('|turn|'+turn),end=lines.indexOf('|turn|'+(turn+1));return lines.slice(start,end<0?undefined:end);}
test('Steel Roller fails without terrain while Iron Head deals damage immediately',async()=>{
 const before=await probe('Steel Roller'),after=await probe('Iron Head');
 for(const turn of [1,2])assert(turnLines(before.publicProtocol,turn).includes('|-fail|p1a: Bronzong'));
 assert(turnLines(after.publicProtocol,1).some(l=>l.startsWith('|-damage|p2a: Snorlax|')));
});
test('repeated Future Sight fails while Zen Headbutt attacks without a pending slot',async()=>{
 const before=await probe('Future Sight'),after=await probe('Zen Headbutt');
 assert(turnLines(before.publicProtocol,1).some(l=>l.includes('|move: Future Sight')));
 assert(turnLines(before.publicProtocol,2).includes('|-fail|p1a: Bronzong'));
 assert(turnLines(after.publicProtocol,1).some(l=>l.startsWith('|-damage|p2a: Snorlax|')));
 assert(!turnLines(after.publicProtocol,2).includes('|-fail|p1a: Bronzong'));
});
