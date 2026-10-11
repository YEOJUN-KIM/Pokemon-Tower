import test from 'node:test';
import assert from 'node:assert/strict';
import {immuneLossSignals} from '../scripts/lib/immune-loss-signals';

const team=[{species:'Espeon',moves:['Psychic'],ability:'Synchronize'},{species:'Gyarados',moves:['Crunch'],ability:'Intimidate'}];
test('diagnostics distinguish a bench answer from an answer that has already fainted',()=>{
 const prefix=['|switch|p1a: Espeon|Espeon, L50|100/100','|switch|p2a: Shedinja|Shedinja, L50|100/100'];
 const immune='|-immune|p2a: Shedinja|[from] ability: Wonder Guard';
 assert.equal(immuneLossSignals(team,[...prefix,immune])['static-answer-only-on-bench'],1);
 const killed=['|switch|p1a: Gyarados|Gyarados, L50|100/100','|faint|p1a: Gyarados','|switch|p1a: Espeon|Espeon, L50|100/100'];
 assert.equal(immuneLossSignals(team,[...prefix,...killed,immune])['no-static-direct-answer-among-survivors'],1);
});
test('Bug tera invalidates the original Dark answer to Wonder Guard',()=>{
 const lines=['|switch|p1a: Espeon|Espeon, L50|100/100','|switch|p2a: Shedinja|Shedinja, L50|100/100','|-terastallize|p2a: Shedinja|Bug','|-immune|p2a: Shedinja|[from] ability: Wonder Guard'];
 assert.equal(immuneLossSignals(team,lines)['no-static-direct-answer-among-survivors'],1);
});
test('unsupported public abilities are grouped even when an alternate attack exists',()=>{
 const coal=[{species:'Torkoal',moves:['Flamethrower','Earth Power'],ability:'White Smoke'}];
 const signals=immuneLossSignals(coal,['|switch|p1a: Torkoal|Torkoal, L50|100/100','|switch|p2a: Dachsbun|Dachsbun, L50|100/100','|-immune|p2a: Dachsbun|[from] ability: Well-Baked Body']);
 assert.equal(signals['public-ability-outside-current-policy-list'],1);assert.equal(signals['static-answer-on-current-pokemon'],1);
});
