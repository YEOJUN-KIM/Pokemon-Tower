import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {NextRequest} from 'next/server';
import {POST} from '../src/app/api/battle/route';
import {getTowerService,playerKey,type TowerService} from '../src/server/tower-service';
import {TowerStore} from '../src/server/tower-store';
import type {EggMachineHatchRequest} from '../src/data/egg-machine-tuning';

test('permanent API forwards tuning, owns prices, rejects invalid settings, and preserves receipt identity',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'egg-tuning-api-'));
  const previousPath=process.env.TOWER_DB_PATH,previousOrigin=process.env.TOWER_ORIGIN;
  process.env.TOWER_DB_PATH=join(directory,'save.sqlite');
  process.env.TOWER_ORIGIN='http://127.0.0.1:3001';
  const service=getTowerService(),token=randomBytes(32).toString('hex'),owner=playerKey(token);
  const globalService=globalThis as typeof globalThis & {towerPersistentService?:TowerService;towerPersistentServiceVersion?:number};
  const request=(body:Record<string,unknown>)=>POST(new NextRequest('http://127.0.0.1:3001/api/battle',{
    method:'POST',headers:{origin:'http://127.0.0.1:3001',host:'127.0.0.1:3001','content-type':'application/json',cookie:`tower_session=${token}`},
    body:JSON.stringify(body),
  }));
  const body:EggMachineHatchRequest={type:'permanent',requestId:randomUUID(),action:'hatch',product:'egg',count:1};
  try{
    service.store.ensurePlayer(owner);
    service.store.db.prepare('UPDATE players SET growth_points=2000 WHERE id=?').run(owner);
    const basic=await request(body);assert.equal(basic.status,200);
    assert.equal(service.store.view(owner).growthPoints,1800);
    const focused={...body,requestId:randomUUID(),tuning:{kind:'region',region:'hoenn'}};
    // Untrusted top-level economic settings are ignored. Nested overrides are
    // rejected by the tuning validator; neither can affect the server's price.
    const first=await request({...focused,price:1,focusChance:1,eggKind:'shiny'});
    assert.equal(first.status,200);
    const saved=await first.json();assert.equal(service.store.view(owner).growthPoints,1550);
    const retry=await request({...focused,tuning:{region:'hoenn',kind:'region'}});
    assert.equal(retry.status,200);assert.deepEqual(await retry.json(),saved);
    assert.equal(service.store.view(owner).growthPoints,1550);
    assert.equal((await request({...focused,tuning:{kind:'type',pokemonType:'Fire'}})).status,409);
    assert.equal((await request({...focused,tuning:{kind:'none'}})).status,409);
    for(const tuning of [null,{kind:'region',region:'missing'},{kind:'type',pokemonType:'missing'},
      {kind:'event',eventId:'missing'},{kind:'region'}, {kind:'fake'},
      {kind:'region',region:'hoenn',price:1},{kind:'type',pokemonType:'Fire',weight:999},
    ]){
      const response=await request({...body,requestId:randomUUID(),tuning});
      assert.equal(response.status,400);assert.ok((await response.json()).error);
    }
    assert.equal(service.store.view(owner).growthPoints,1550);
    const normalRetry=await request({...body,tuning:{kind:'none'}});
    assert.equal(normalRetry.status,200);assert.equal(service.store.view(owner).growthPoints,1550);
    const fire=await request({...body,requestId:randomUUID(),tuning:{kind:'type',pokemonType:'Fire'}});
    assert.equal(fire.status,200);assert.equal(service.store.view(owner).growthPoints,1300);
  }finally{
    await service.dispose();service.store.close();
    if(globalService.towerPersistentService===service){delete globalService.towerPersistentService;delete globalService.towerPersistentServiceVersion;}
    if(previousPath===undefined)delete process.env.TOWER_DB_PATH;else process.env.TOWER_DB_PATH=previousPath;
    if(previousOrigin===undefined)delete process.env.TOWER_ORIGIN;else process.env.TOWER_ORIGIN=previousOrigin;
    rmSync(directory,{recursive:true,force:true});
  }
});

test('a focused paid receipt survives closing and reopening the database without another draw or payment',()=>{
  const directory=mkdtempSync(join(tmpdir(),'egg-tuning-receipt-')),path=join(directory,'save.sqlite');
  let store=new TowerStore(path,()=>0);
  const tuning={kind:'type',pokemonType:'Flying'} as const,id=randomUUID();
  try{
    store.ensurePlayer('p');store.db.prepare('UPDATE players SET growth_points=2500 WHERE id=?').run('p');
    const result=store.permanentAction('p',id,'hatch','egg',10,null,'machine',tuning);
    const before=store.view('p'),training=store.trainingCollection('p');
    store.close();store=new TowerStore(path,()=>{throw Error('Receipt replay must not draw');});
    assert.deepEqual(store.permanentAction('p',id,'hatch','egg',10,null,'machine',tuning),result);
    assert.deepEqual(store.view('p'),before);assert.deepEqual(store.trainingCollection('p'),training);
    assert.equal(store.view('p').growthPoints,0);
    assert.throws(()=>store.permanentAction('p',id,'hatch','egg',10,null,'machine',{kind:'none'}),/같은 요청/);
  }finally{store.close();rmSync(directory,{recursive:true,force:true});}
});
