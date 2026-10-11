import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditProfile,auditTeam,directAnswer} from '../scripts/lib/sample-audit';

const original=JSON.parse(readFileSync('artifacts/support-recheck-climb-cases.json','utf8'));
const corrected=JSON.parse(readFileSync('artifacts/support-corrected-climb-cases.json','utf8'));
test('bulk audit detects real physical/special sample errors and keeps source immutable',()=>{
 const before=JSON.stringify(original);
 const az=original.find((c:any)=>c.id==='klefki-screen').profiles.Azumarill;
 const coal=original.find((c:any)=>c.id==='room-control').profiles.Torkoal;
 assert(auditProfile('Azumarill',az).some(i=>i.kind==='training-category-mismatch'));
 assert(auditProfile('Torkoal',coal).some(i=>i.kind==='training-category-mismatch'));
 for(const c of corrected)for(const n of c.team)assert(!auditProfile(n,c.profiles[n]).some(i=>i.kind==='training-category-mismatch'));
 assert.equal(JSON.stringify(original),before);
});
test('team-wide coverage catches Wonder Guard gap and validates its legal correction',()=>{
 const a=original.find((c:any)=>c.id==='espeon-screen'),b=corrected.find((c:any)=>c.id==='espeon-screen');
 assert(auditTeam(a.team,a.profiles,['Shedinja']).gaps.some(g=>g.ability==='Wonder Guard'));
 assert.deepEqual(auditTeam(b.team,b.profiles,['Shedinja']).gaps,[]);
});
test('offline diagnostic covers Well-Baked Body beyond the current policy, with bypass exception',()=>{
 const p=structuredClone(corrected.find((c:any)=>c.id==='room-control').profiles.Torkoal);
 p.moves=['Flamethrower','Earth Power'];
 assert.deepEqual(directAnswer('Torkoal',p,'Dachsbun','Well-Baked Body').map(a=>a.move),['Earth Power']);
 p.ability='Mold Breaker';assert.equal(directAnswer('Torkoal',p,'Dachsbun','Well-Baked Body').length,2);
});
test('Foul Play is not treated as an attacker whose own attack investment must rise',()=>{
 const p=structuredClone(corrected.find((c:any)=>c.id==='klefki-screen').profiles.Klefki);
 p.moves=['Foul Play','Reflect','Light Screen','Thunder Wave'];p.evs={hp:32,atk:0,def:2,spa:32,spd:0,spe:0};
 assert(!auditProfile('Klefki',p).some(i=>i.kind==='training-category-mismatch'));
});
