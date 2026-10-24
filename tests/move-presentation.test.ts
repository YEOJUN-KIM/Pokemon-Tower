import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moveInfo} from '../src/data/move-info';
import {movePresentation,movePresentations,movePresentationPresets,movePresentationReview} from '../src/web/move-presentation';
import {sharedVfxCatalog} from '../src/web/shared-vfx';
import {moveAnimationPlan} from '../src/web/move-animation-plan';
import {presentationFrames} from '../src/web/battle-presentation';
import {battleMessageEntries,currentBattleMessage} from '../src/web/battle-message-data';
import {playbackDuration} from '../src/web/playback-settings';
import {effectLayers} from '../src/web/sound-design';
import type {BattleView} from '../src/web/contracts';

const before:BattleView={id:'rank',requestId:1,status:'waiting',turn:1,team:[{species:'Lucario',condition:'100/100',active:true}],opponent:{species:'Blastoise',condition:'100/100'},actions:[],messages:['|turn|1'],winner:null,error:null};
const frames=(...lines:string[])=>presentationFrames(before,{...before,messages:[...before.messages,...lines]});
const dialogue=(messages:string[])=>currentBattleMessage(battleMessageEntries(messages));

test('registered catalog, assignments, presets and generated requirement inventory agree',()=>{
 assert.deepEqual(Object.keys(movePresentations).sort(),Object.keys(moveInfo).sort());
 for(const name of Object.keys(moveInfo)){
  assert.ok(Object.hasOwn(movePresentationPresets,movePresentations[name]),name);
  const p=movePresentation(name);
  for(const vfx of [p.mainVfx,p.impactVfx])assert.ok(vfx==='None'||Object.hasOwn(sharedVfxCatalog,vfx),`${name}: ${vfx}`);
  assert.ok(p.duration>p.impactAt&&p.impactAt>=0&&p.duration<=1100,name);
  assert.ok(p.rationale.length>5,name);
 }
 assert.ok(Object.keys(movePresentationReview).every(name=>Object.hasOwn(moveInfo,name)));
 const manifest=JSON.parse(readFileSync('docs/assets/manifests/move-presentation-requirements.json','utf8'));
 assert.equal(manifest.registered,Object.keys(moveInfo).length);
 assert.equal(manifest.mapped,Object.keys(movePresentations).length);
 for(const row of manifest.vfx)assert.deepEqual(row.moves,Object.keys(moveInfo).filter(name=>{const p=movePresentation(name);return p.mainVfx===row.id||p.impactVfx===row.id;}).sort());
});

test('same-type techniques have different semantic motions and shared requirements',()=>{
 assert.equal(movePresentation('Earthquake').screenEffect,'ShakeLarge');
 assert.equal(movePresentation('Earthquake').mainVfx,'None');
 assert.equal(movePresentation('Double Team').pokemonMotion,'Clone');
 assert.equal(moveAnimationPlan('Double Team').particles.length,0);
 assert.equal(movePresentation('Quick Attack').pokemonMotion,'FastDash');
 assert.equal(movePresentation('Tackle').pokemonMotion,'Dash');
 assert.equal(movePresentation('Growl').specialSequence,'SoundWave');
 assert.equal(movePresentation('Thunder').mainVfx,'ElectricBolt');
 assert.equal(movePresentation('Thunderbolt').mainVfx,'ElectricBurst');
 assert.equal(movePresentation('Thunder Shock').mainVfx,'ElectricBolt');
 assert.equal(moveAnimationPlan('Thunderbolt').lightning,false);
 assert.equal(moveAnimationPlan('Thunder').lightning,true);
 assert.equal(movePresentation('Flamethrower').mainVfx,'FireStream');
 assert.equal(movePresentation('Air Slash').pokemonMotion,'None');
 assert.equal(movePresentation('Air Slash').mainVfx,'Slash');
 assert.equal(movePresentation('Horn Leech').mainVfx,'None');
 assert.notDeepEqual(effectLayers('move','normal',{cue:'Voice'}),effectLayers('move','normal',{cue:'Rush'}));
});

test('Close Combat drops play once and keep each message and result in sequence at every speed',()=>{
 const result=frames('|move|p1a: Lucario|Close Combat|p2a: Blastoise','|-damage|p2a: Blastoise|80/100','|-unboost|p1a: Lucario|def|1','|-unboost|p1a: Lucario|spd|1');
 assert.deepEqual(result.map(f=>f.motion?.kind??null),['move','hit','stat-down',null]);
 assert.match(dialogue(result[2].view.messages),/방어가 떨어졌다!/);
 assert.match(dialogue(result[3].view.messages),/특수방어가 떨어졌다!/);
 assert.equal(result[2].motion?.label,undefined);
 assert.equal(result[0].view.opponent?.condition,'100/100');
 assert.equal(result[1].view.opponent?.condition,'80/100');
 assert.equal(before.opponent?.condition,'100/100');
 for(const speed of [1,2,4] as const)for(const frame of result.slice(2))assert.ok(playbackDuration(frame.duration,speed,false,dialogue(frame.view.messages),{important:frame.important,minimumDuration:frame.minimumDuration})>=450);
});

test('mixed rank batch deduplicates directions per actor, then resets for separate moves and causes',()=>{
 const result=frames('|-unboost|p1a: Lucario|def|1','|-unboost|p1a: Lucario|spd|1','|-boost|p1a: Lucario|atk|2','|-boost|p1a: Lucario|spa|2','|-boost|p1a: Lucario|spe|2','|-boost|p2a: Blastoise|atk|1');
 assert.deepEqual(result.filter(f=>f.motion).map(f=>[f.motion?.side,f.motion?.kind]),[['player','stat-down'],['player','stat-up'],['enemy','stat-up']]);
 assert.match(dialogue(result[2].view.messages),/공격이 크게 올랐다!/);
 const repeated=frames('|-boost|p1a: Lucario|atk|1','|move|p1a: Lucario|Swords Dance|p1a: Lucario','|-boost|p1a: Lucario|atk|2');
 assert.equal(repeated.filter(f=>f.motion?.kind==='stat-up').length,2);
 const sources=frames('|-boost|p1a: Lucario|atk|1|[from] ability: Download','|-boost|p1a: Lucario|spe|1|[from] ability: Speed Boost');
 assert.equal(sources.filter(f=>f.motion?.kind==='stat-up').length,2);
});

test('every rank stat shares direction effects; silent and capped changes do not animate',()=>{
 for(const event of ['-boost','-unboost']){
  const result=frames(...['atk','def','spa','spd','spe','accuracy','evasion'].map(stat=>`|${event}|p1a: Lucario|${stat}|1`));
  assert.equal(result.filter(f=>f.motion).length,1);
  assert.equal(result.filter(f=>dialogue(f.view.messages)).length,7);
 }
 assert.ok(frames('|-boost|p1a: Lucario|atk|0','|-unboost|p1a: Lucario|def|1|[silent]','|-fail|p1a: Lucario|unboost').every(f=>f.motion===null));
});
