import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile} from '../src/server/training';
import {ownedSettingMoves,withStatPoints,totalPoints,pointMaximum,withSettingMove,settingForms} from '../src/web/pokemon-settings-model';
test('settings point changes respect individual and shared limits without mutating the draft',()=>{
 const initial=defaultProfile('Charizard'),hp=withStatPoints(initial,'hp',99),attack=withStatPoints(hp,'atk',32),defense=withStatPoints(attack,'def',99);
 assert.equal(initial.evs.hp,0);assert.equal(hp.evs.hp,32);assert.equal(defense.evs.def,2);assert.equal(totalPoints(defense),66);assert.equal(pointMaximum(defense,'spe'),0);assert.equal(withStatPoints(defense,'spe',32).evs.spe,0);assert.equal(withStatPoints(defense,'hp',-1).evs.hp,0);assert.equal(withStatPoints(defense,'hp',NaN),defense);
});
test('move choices include only distinct owned, learnable moves',()=>{
 const entry={unlockedMoves:['Surf','Surf','Fly','Earthquake'],learnableMoves:['Surf','Earthquake','Ice Beam']};assert.deepEqual(ownedSettingMoves(entry as Parameters<typeof ownedSettingMoves>[0]),['Surf','Earthquake']);
});

test('equipped moves swap without duplicates, holes or draft mutation',()=>{
 const initial={...defaultProfile('Charizard'),moves:['Flamethrower','Air Slash','Dragon Pulse','Slash']};
 const changed=withSettingMove(initial,0,'Air Slash');assert.deepEqual(changed.moves,['Air Slash','Flamethrower','Dragon Pulse','Slash']);assert.equal(initial.moves[0],'Flamethrower');assert.equal(new Set(changed.moves).size,4);
 assert.equal(withSettingMove(initial,0,'Flamethrower'),initial);assert.equal(withSettingMove(initial,4,'Surf'),initial);
 assert.deepEqual(withSettingMove({...initial,moves:['Flamethrower','Air Slash']},2,'Flamethrower').moves,['Air Slash','Flamethrower']);
});
test('collection form choices reuse equipment metadata and preserve fixed origin forms',()=>{
 const option=(species:string)=>({species}) as NonNullable<Parameters<typeof settingForms>[0]['formOptions']>[number];
 const entry={formOptions:['Ogerpon','Ogerpon-Wellspring','Ogerpon-Hearthflame','Ogerpon-Cornerstone','Dialga-Origin','Shaymin-Sky','Arceus-Fire'].map(option)};
 assert.deepEqual(settingForms(entry as Parameters<typeof settingForms>[0]).map(f=>f.species),['Ogerpon','Dialga-Origin','Shaymin-Sky']);
});
