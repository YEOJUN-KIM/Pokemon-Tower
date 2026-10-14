import {test} from 'node:test';
import assert from 'node:assert/strict';
import {revealedRare,strongerRare,trainerMusic,arenaTheme} from '../src/web/encounter-presentation';
import {prototypeTrainers} from '../src/data/tower-trainers';
import {musicScores,musicFiles,musicNames,musicTrackLevels} from '../src/web/music-score';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

test('music only follows publicly revealed opponents, including illusion replacement',()=>{
  assert.equal(revealedRare(['|switch|p1a: Mewtwo|Mewtwo, L50|100/100'],'Pidgeot'),null);
  assert.equal(revealedRare(['|teampreview|','|poke|p2|Mewtwo, L50|'],'Pidgeot'),null);
  assert.equal(revealedRare(['|switch|p2a: Articuno|Articuno, L50|100/100'],'Pidgeot'),'rare');
  assert.equal(revealedRare(['|replace|p2a: Mew|Mew, L50|100/100']),'rare');
  assert.equal(revealedRare(['|switch|p2a: Mewtwo|Mewtwo, L50|100/100'],'Pidgeot'),'rare');
  assert.equal(strongerRare('rare','rare'),'rare');
  assert.equal(strongerRare('rare',null),'rare');
});
test('saved bosses select roles and floors change scenery without depending on opponent type',()=>{
  assert.equal(trainerMusic(prototypeTrainers[5].boss),'gym');assert.equal(trainerMusic(prototypeTrainers[10].boss),'champion');
  assert.equal(trainerMusic({...prototypeTrainers[5].boss,role:'villain'}),'villain');
  assert.deepEqual([1,4,8,10].map(f=>arenaTheme(f,10)),['meadow','hall','night','summit']);
  assert.equal(arenaTheme(5,30,'champion'),'summit');assert.equal(arenaTheme(4,30,'villain'),'facility');
});
test('six distinct CC0 recordings and two original result cues, with shared gym/champion music',()=>{
  const scores=Object.values(musicScores);assert.equal(scores.length,2);assert.equal(new Set(scores.map(s=>JSON.stringify(s.melody))).size,2);
  assert.equal(Object.keys(musicNames).length,9);assert.equal(new Set(Object.values(musicFiles)).size,6);
  assert.equal(musicFiles.champion,musicFiles.gym);assert.equal(musicTrackLevels.champion,musicTrackLevels.gym);
  const sources=JSON.parse(readFileSync('public/audio/music-sources.json','utf8'));assert.equal(sources.length,7);const hashes=new Set<string>();
  for(const source of sources){assert.equal(source.license,'CC0-1.0');const bytes=readFileSync(source.path);assert.equal(bytes.length,source.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);hashes.add(source.sha256);assert.equal(musicFiles[source.id as keyof typeof musicFiles],source.path.replace('public',''));}assert.equal(hashes.size,6);
  for(const score of scores){if(!score)throw Error('Missing score');assert.equal(score.melody.length%32,0);assert.equal(score.chords.length,4);assert.ok(score.bpm>0);}
});
