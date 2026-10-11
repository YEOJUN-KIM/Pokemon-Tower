import test from 'node:test';
import assert from 'node:assert/strict';
import {assertFreshCourses} from '../scripts/lib/course-freshness';
const course=(id:string,offset=0)=>({id,theme:'kanto',organization:'rocket',encounters:Array.from({length:100},(_,i)=>({floor:i+1,seed:[offset+i,0,0,0],enemy:'packed'}))});
test('new names cannot conceal reuse of old course content or seeds',()=>{
 const old=course('old');assert.throws(()=>assertFreshCourses([{...old,id:'renamed'}],[old]),/content/);
 const changed=course('changed');changed.encounters[0].enemy='different';assert.throws(()=>assertFreshCourses([changed],[old]),/seed/);
});
test('fresh course audit rejects intra-cohort duplicate seeds and broken floor order',()=>{
 const a=course('a',1000),b=course('b',2000);assert.equal(assertFreshCourses([a,b],[course('old')]).newBattleSeeds,200);
 b.encounters[0].seed=[1000,0,0,0];assert.throws(()=>assertFreshCourses([a,b],[]),/seed/);
 a.encounters[0].floor=2;assert.throws(()=>assertFreshCourses([a],[]),/Nonsequential/);
});
