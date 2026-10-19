import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile} from '../src/server/training';
import {ownedSettingMoves,withStatPoints,totalPoints,pointMaximum} from '../src/web/pokemon-settings-model';
test('settings point changes respect individual and shared limits without mutating the draft',()=>{
 const initial=defaultProfile('Charizard'),hp=withStatPoints(initial,'hp',99),attack=withStatPoints(hp,'atk',32),defense=withStatPoints(attack,'def',99);
 assert.equal(initial.evs.hp,0);assert.equal(hp.evs.hp,32);assert.equal(defense.evs.def,2);assert.equal(totalPoints(defense),66);assert.equal(pointMaximum(defense,'spe'),0);assert.equal(withStatPoints(defense,'spe',32).evs.spe,0);assert.equal(withStatPoints(defense,'hp',-1).evs.hp,0);assert.equal(withStatPoints(defense,'hp',NaN),defense);
});
test('move choices include only distinct owned, learnable moves',()=>{
 const entry={unlockedMoves:['Surf','Surf','Fly','Earthquake'],learnableMoves:['Surf','Earthquake','Ice Beam']};assert.deepEqual(ownedSettingMoves(entry as Parameters<typeof ownedSettingMoves>[0]),['Surf','Earthquake']);
});
