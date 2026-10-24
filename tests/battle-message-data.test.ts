import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMessageEntries,currentBattleMessage,currentBattleDialogue} from '../src/web/battle-message-data';

test('damage and remaining HP stay in history while current dialogue holds the effectiveness message',()=>{
 const entries=battleMessageEntries(['|turn|1','|move|p1a: Gengar|Shadow Ball|p2a: Arbok','|-supereffective|p2a: Arbok','|-damage|p2a: Arbok|10/200']);
 assert.equal(currentBattleMessage(entries),'효과가 굉장했다!');
 assert.match(entries.at(-1)!.text,/HP가 줄었다.*남은 HP 5%/);
 assert.ok(entries.every(entry=>entry.turn===1));
});
test('resistance is retained and neutral damage does not create a health announcement',()=>{
 const lines=['|turn|2','|move|p1a: Gengar|Shadow Ball|p2a: Arbok'];
 const move=battleMessageEntries(lines).at(-1)!.text;
 assert.equal(currentBattleMessage(battleMessageEntries([...lines,'|-damage|p2a: Arbok|10/200'])),move);
 assert.equal(currentBattleMessage(battleMessageEntries([...lines,'|-resisted|p2a: Arbok','|-damage|p2a: Arbok|10/200'])),'효과가 별로인 듯하다…');
});
test('fainting, status and action prompts remain available and multiline history has unique keys',()=>{
 const entries=battleMessageEntries(['|turn|1','|-status|p1a: Gengar|psn','|-damage|p1a: Gengar|0 fnt','|faint|p1a: Gengar']);
 assert.match(currentBattleMessage(entries),/쓰러졌다/);
 assert.equal(currentBattleMessage(entries,'거북왕, 무엇을 할까요?'),'거북왕, 무엇을 할까요?');
 assert.equal(new Set(entries.map(entry=>entry.key)).size,entries.length);
});
test('healing keeps its action text while numerical remaining HP stays in the record',()=>{
 const entries=battleMessageEntries(['|turn|1','|-heal|p1a: Gengar|150/200']);
 assert.match(entries.at(-1)!.text,/남은 HP 75%/);
 assert.match(currentBattleMessage(entries),/HP가 회복/);
 assert.doesNotMatch(currentBattleMessage(entries),/남은 HP|%/);
});
test('critical feedback has its own gold tone and normal prompts clear that emphasis',()=>{
 const entries=battleMessageEntries(['|move|p1a: Gengar|Shadow Ball|p2a: Arbok','|-crit|p2a: Arbok','|-damage|p2a: Arbok|10/200']);
 assert.deepEqual(currentBattleDialogue(entries),{text:'급소에 맞았다!',tone:'critical'});
 assert.deepEqual(currentBattleDialogue(entries,'팬텀, 무엇을 할까요?'),{text:'팬텀, 무엇을 할까요?',tone:'normal'});
});
test('all six statuses use tailored initial, ongoing and recovery dialogue',()=>{
 for(const [status,initial] of Object.entries({psn:'독이 퍼지기 시작',tox:'맹독이 퍼지기 시작',brn:'화상을 입었다',par:'마비되었다',slp:'잠에 빠졌다',frz:'얼어붙었다'})){
  const entries=battleMessageEntries([`|-status|p1a: Gengar|${status}`]);assert.ok(currentBattleMessage(entries).includes(initial),status);
  assert.doesNotMatch(currentBattleMessage(battleMessageEntries([`|-curestatus|p1a: Gengar|${status}`])),/상태이상/);
 }
 assert.match(currentBattleMessage(battleMessageEntries(['|-damage|p1a: Gengar|80/100 psn|[from] psn'])),/몸에 독이 퍼지고 있다/);
 assert.match(currentBattleMessage(battleMessageEntries(['|-damage|p1a: Gengar|80/100 tox|[from] psn'])),/맹독이 퍼지고 있다/);
 assert.match(currentBattleMessage(battleMessageEntries(['|-damage|p1a: Gengar|80/100 brn|[from] brn'])),/화상 때문에 괴로워/);
 for(const [status,phrase] of Object.entries({par:'움직일 수 없다',slp:'깊이 잠들어 있다',frz:'얼어붙어 움직일 수 없다'}))assert.match(currentBattleMessage(battleMessageEntries([`|cant|p1a: Gengar|${status}`])),new RegExp(phrase));
 assert.match(currentBattleMessage(battleMessageEntries(['|-start|p1a: Gengar|confusion'])),/혼란에 빠졌다/);
});
test('ability protection and absorption stay in history without repeating the popup in dialogue',()=>{
 assert.equal(battleMessageEntries(['|-ability|p2a: Gengar|Levitate'])[0].dialogueText,null);
 assert.equal(battleMessageEntries(['|-immune|p2a: Gengar|[from] ability: Levitate'])[0].dialogueText,null);
 const absorb=battleMessageEntries(['|-heal|p2a: Lapras|75/100|[from] ability: Water Absorb|[of] p1a: Gengar']);
 assert.ok(absorb.every(entry=>entry.dialogueText===null));
 assert.ok(absorb.some(entry=>entry.text.includes('남은 HP 75%')));
});


test('popup explanations are omitted while survival, stat and status results keep their meaning',()=>{
 for(const line of [
  '|-immune|p2a: Solrock|[from] ability: Levitate',
  '|-ability|p2a: Gyarados|Intimidate',
  '|-enditem|p1a: Gengar|Sitrus Berry|[eat]',
  '|-heal|p1a: Gengar|75/100|[from] item: Sitrus Berry',
  '|-heal|p1a: Gengar|81/100|[from] item: Leftovers',
  '|-damage|p1a: Gengar|71/100|[from] item: Life Orb',
 ]){
  const entries=battleMessageEntries([line]);assert.ok(entries.length,line);assert.ok(entries.every(e=>e.dialogueText===null),line);assert.ok(entries.some(e=>e.text.length>0));
 }
 for(const line of ['|-ability|p2a: Golem|Sturdy','|-enditem|p2a: Golem|Focus Sash']){
  const entries=battleMessageEntries([line]);assert.match(currentBattleMessage(entries),/간신히 버텼다/);assert.doesNotMatch(currentBattleMessage(entries),/옹골참|기합의띠/);assert.match(entries[0].text,/옹골참|기합의띠/);
 }
 const stat=battleMessageEntries(['|-unboost|p1a: Gengar|atk|1|[from] ability: Intimidate|[of] p2a: Gyarados']);
 assert.match(currentBattleMessage(stat),/공격이 떨어졌다/);assert.doesNotMatch(currentBattleMessage(stat),/위협/);assert.match(stat[0].text,/위협/);
 const status=battleMessageEntries(['|-status|p1a: Gengar|psn|[from] ability: Poison Point|[of] p2a: Nidoqueen']);assert.match(currentBattleMessage(status),/독이 퍼지기 시작/);
 for(const event of ['-immune','-fail','-miss','-crit','-supereffective','-resisted'])assert.ok(battleMessageEntries([`|${event}|p2a: Golem`])[0].dialogueText);
});
