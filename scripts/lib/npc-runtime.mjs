import assert from 'node:assert/strict';

/** The reviewed source is authoritative; the runtime file is only a projection. */
export function projectNpcRuntime(source){
 const keys=new Set();
 return source.samples.map(s=>{
  const key=`${s.id}:${s.allFloors?'all':s.stage}`;
  assert.ok(!keys.has(key),`Duplicate NPC template: ${key}`);keys.add(key);
  assert.ok(s.allFloors?s.select&&s.team.length>=3&&s.team.length<=6:s.team.length===3,`Invalid NPC candidate count: ${key}`);
  assert.equal(new Set(s.team.map(p=>p.species)).size,s.team.length,`Duplicate NPC member: ${key}`);
  assert.ok(!s.ace||s.team.some(p=>p.species===s.ace),`Missing ace: ${key}`);
  assert.ok(!s.signature||s.team.some(p=>p.species===s.signature.species),`Missing gimmick carrier: ${key}`);
  assert.ok((s.required??[]).every(name=>s.team.some(p=>p.species===name)),`Missing required member: ${key}`);
  for(const p of s.team){
   assert.equal(p.profile.moves.length,4,`Invalid move count: ${key}/${p.species}`);
   for(const n of Object.values(p.profile.ivs))assert.ok(Number.isInteger(n)&&n>=0&&n<=31,`Invalid IV: ${key}`);
   const points=Object.values(p.profile.evs);
   assert.ok(points.every(n=>Number.isInteger(n)&&n>=0&&n<=32)&&points.reduce((a,b)=>a+b,0)<=66,`Invalid training points: ${key}`);
  }
  return {id:s.id,stage:s.stage,...(s.allFloors?{allFloors:true,select:s.select,required:s.required}:{}),role:s.role,ace:s.ace,signature:s.signature,gimmickEnabled:s.gimmickEnabled,legendaryMinFloor:s.legendaryMinFloor,team:s.team.map(p=>({species:p.species,item:p.item,gigantamax:p.gigantamax,profile:p.profile}))};
 });
}
