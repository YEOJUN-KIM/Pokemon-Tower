import {test} from 'node:test';
import assert from 'node:assert/strict';
import {battleTrainer,trainerSamples} from '../src/web/trainer-samples';
import {prototypeTrainers} from '../src/data/tower-trainers';

test('normal trainer samples vary by saved battle and fixed bosses retain their identity',()=>{
  const results=Array.from({length:100},(_,i)=>battleTrainer(`saved-battle-${i}`));
  assert.equal(new Set(results.map(trainer=>trainer.id)).size,trainerSamples.length);
  assert.deepEqual(battleTrainer('same-battle'),battleTrainer('same-battle'));
  assert.equal(battleTrainer('same-battle',prototypeTrainers[5].boss),prototypeTrainers[5].boss);
  assert.equal(battleTrainer('same-battle',prototypeTrainers[10].boss),prototypeTrainers[10].boss);
});
