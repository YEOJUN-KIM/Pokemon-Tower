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
test('ability protection and absorption identify the owner and keep numerical healing in history',()=>{
 assert.equal(currentBattleMessage(battleMessageEntries(['|-ability|p2a: Gengar|Levitate'])),'상대 팬텀의 부유!');
 assert.equal(currentBattleMessage(battleMessageEntries(['|-immune|p2a: Gengar|[from] ability: Levitate'])),'상대 팬텀에게는 효과가 없다!');
 const absorb=battleMessageEntries(['|-heal|p2a: Lapras|75/100|[from] ability: Water Absorb|[of] p1a: Gengar']);
 assert.equal(currentBattleMessage(absorb),'상대 라프라스에게는 효과가 없다!');
 assert.ok(absorb.some(entry=>entry.text.includes('남은 HP 75%')));
});
