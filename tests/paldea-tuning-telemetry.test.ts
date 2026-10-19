import test from 'node:test';
import assert from 'node:assert/strict';
import {paldeaTuningTelemetry} from '../scripts/lib/paldea-tuning-telemetry';
import {packTeam} from '../src/data/teams';
import type {BattleLog} from '../src/battle/run';

test('telemetry counts Charge-origin Electromorphosis and heal/immune Water Absorb evidence once per turn',()=>{
 const log:BattleLog={schemaVersion:1,engineVersion:'fixture',format:'fixture',seed:[1,2,3,4],teams:{p1:packTeam(['Lapras','Garchomp','Venusaur']),p2:packTeam(['Bellibolt','Clodsire','Magnezone'])},decisions:[],publicProtocol:[
  '|switch|p2a: Bellibolt|Bellibolt, L50|100/100','|turn|1',
  '|-start|p2a: Bellibolt|Charge|Earth Power|[from] ability: Electromorphosis',
  '|-start|p2a: Bellibolt|Charge|Earth Power|[from] ability: Electromorphosis',
  '|switch|p2a: Clodsire|Clodsire, L50|50/100',
  '|-heal|p2a: Clodsire|75/100|[from] ability: Water Absorb|[of] p1a: Lapras',
  '|turn|2','|-immune|p2a: Clodsire|[from] ability: Water Absorb',
 ],winner:'Tower AI',turns:2};
 const result=paldeaTuningTelemetry(log);assert.equal(result.mons.Bellibolt.electromorphosis,1);assert.equal(result.mons.Clodsire.waterAbsorb,2);assert.equal(result.mons.Clodsire.healing,25);
});
