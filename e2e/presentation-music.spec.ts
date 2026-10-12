import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters,packTeam} from '../src/data/teams';
import {prototypeTrainers} from '../src/data/tower-trainers';
import {musicNames,musicFiles} from '../src/web/music-score';

test('music waits for loading, crossfades and mutes all overlapping tracks',async({page})=>{
  await page.addInitScript(()=>{
    const meter=window as unknown as {voices:{player:HTMLMediaElement;master:GainNode}[];edges:Map<AudioNode,AudioNode>};
    meter.voices=[];meter.edges=new Map();
    const sourceConnect=MediaElementAudioSourceNode.prototype.connect;
    MediaElementAudioSourceNode.prototype.connect=(function(this:MediaElementAudioSourceNode,...args:[AudioNode|AudioParam,number?,number?]){
      if(args[0] instanceof GainNode)meter.voices.push({player:this.mediaElement,master:args[0]});
      return Reflect.apply(sourceConnect,this,args);
    }) as typeof sourceConnect;
    const gainConnect=GainNode.prototype.connect;
    GainNode.prototype.connect=(function(this:GainNode,...args:[AudioNode|AudioParam,number?,number?]){
      if(args[0] instanceof AudioNode)meter.edges.set(this,args[0]);return Reflect.apply(gainConnect,this,args);
    }) as typeof gainConnect;
  });
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/audio/bgm/reward-victory-v2.mp3',async route=>{await gate;await route.continue();});
  await page.goto('/settings');await page.getByLabel('전체 음소거').uncheck();await page.getByRole('button',{name:'BGM 들어보기',exact:true}).click();
  const snapshot=()=>page.evaluate(()=>{
    const meter=window as unknown as {voices:{player:HTMLMediaElement;master:GainNode}[];edges:Map<AudioNode,AudioNode>};
    return meter.voices.map(v=>({paused:v.player.paused,time:v.player.currentTime,volume:v.master.gain.value,fade:(meter.edges.get(v.master) as GainNode).gain.value}));
  });
  await expect.poll(async()=> (await snapshot())[0]?.time ?? 0).toBeGreaterThan(.4);
  await page.getByRole('button',{name:'미리듣기 곡',exact:true}).click();await page.getByRole('dialog',{name:'미리듣기 곡',exact:true}).getByRole('button',{name:musicNames['reward' as keyof typeof musicNames],exact:true}).click();await page.waitForTimeout(300);
  const loading=await snapshot();expect(loading[0].paused).toBe(false);expect(loading[0].fade).toBeCloseTo(1,2);expect(loading[1].fade).toBe(0);
  release();
  await expect.poll(async()=> (await snapshot())[1]?.time ?? 0).toBeGreaterThan(.15);
  const overlap=await snapshot();expect(overlap[0].paused).toBe(false);expect(overlap[0].fade).toBeGreaterThan(0);expect(overlap[0].fade).toBeLessThan(1);expect(overlap[1].fade).toBeGreaterThan(0);expect(overlap[1].fade).toBeLessThan(1);
  await page.getByLabel('전체 음소거').check();
  await expect.poll(async()=> (await snapshot()).every(v=>v.volume<.001)).toBe(true);
  await page.getByLabel('전체 음소거').uncheck();
  await page.getByRole('button',{name:'미리듣기 곡',exact:true}).click();await page.getByRole('dialog',{name:'미리듣기 곡',exact:true}).getByRole('button',{name:musicNames['gym' as keyof typeof musicNames],exact:true}).click();await page.getByRole('button',{name:'미리듣기 곡',exact:true}).click();await page.getByRole('dialog',{name:'미리듣기 곡',exact:true}).getByRole('button',{name:musicNames['villain' as keyof typeof musicNames],exact:true}).click();await page.getByRole('button',{name:'미리듣기 곡',exact:true}).click();await page.getByRole('dialog',{name:'미리듣기 곡',exact:true}).getByRole('button',{name:musicNames['clear' as keyof typeof musicNames],exact:true}).click();
  await page.getByRole('button',{name:'미리듣기 정지'}).click();
  await expect.poll(async()=> (await snapshot()).every(v=>v.paused)).toBe(true);
});

test('all music previews produce audio and respect mute, volume and leaving settings',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const meter=window as unknown as {audioStarts:number;bgmPlayers:HTMLMediaElement[];bgmGains:GainNode[]};meter.audioStarts=0;meter.bgmPlayers=[];meter.bgmGains=[];
    const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.src.includes('/audio/bgm/') && !meter.bgmPlayers.includes(this))meter.bgmPlayers.push(this);return play.call(this);};
    const connect=MediaElementAudioSourceNode.prototype.connect;MediaElementAudioSourceNode.prototype.connect=(function(this:MediaElementAudioSourceNode,...args:[AudioNode|AudioParam,number?,number?]){if(args[0] instanceof GainNode)meter.bgmGains.push(args[0]);return Reflect.apply(connect,this,args);}) as typeof connect;
    const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){meter.audioStarts++;return original.call(this);};
  });
  await page.goto('/settings');await expect(page.getByRole('heading',{name:'소리',exact:true})).toBeVisible();
  await page.getByLabel('전체 음소거').uncheck();await page.getByRole('button',{name:'BGM 들어보기',exact:true}).click();
  for(const track of Object.keys(musicNames)){
    const before=await page.evaluate(()=>(window as unknown as {audioStarts:number}).audioStarts);
    await page.getByRole('button',{name:'미리듣기 곡',exact:true}).click();await page.getByRole('dialog',{name:'미리듣기 곡',exact:true}).getByRole('button',{name:musicNames[track as keyof typeof musicNames],exact:true}).click();await expect(page.locator('body')).toHaveAttribute('data-music-track',track);
    if(track in musicFiles){
      await expect.poll(()=>page.evaluate(()=>{const player=(window as unknown as {bgmPlayers:HTMLMediaElement[]}).bgmPlayers.at(-1);return !!player && !player.paused && player.readyState>=2 && player.currentTime>0;})).toBe(true);
      const state=await page.evaluate(()=>{const player=(window as unknown as {bgmPlayers:HTMLMediaElement[]}).bgmPlayers.at(-1)!;return {src:new URL(player.src).pathname,loop:player.loop,time:player.currentTime};});
      expect(state.src).toBe(musicFiles[track as keyof typeof musicFiles]);expect(state.loop).toBe(true);
      await expect.poll(()=>page.evaluate(()=>(window as unknown as {bgmPlayers:HTMLMediaElement[]}).bgmPlayers.at(-1)!.currentTime)).toBeGreaterThan(state.time);
    }else await expect.poll(()=>page.evaluate(()=>(window as unknown as {audioStarts:number}).audioStarts)).toBeGreaterThan(before);
  }
  await page.getByRole('button',{name:'미리듣기 곡',exact:true}).click();await page.getByRole('dialog',{name:'미리듣기 곡',exact:true}).getByRole('button',{name:musicNames['trainer' as keyof typeof musicNames],exact:true}).click();
  await page.getByLabel('BGM 크기').fill('65');
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {bgmGains:GainNode[]}).bgmGains.at(-1)?.gain.value)).toBeCloseTo(.65,2);
  await page.getByLabel('전체 음소거').check();await page.waitForTimeout(300);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {bgmGains:GainNode[]}).bgmGains.at(-1)?.gain.value)).toBeLessThan(.001);
  const muted=await page.evaluate(()=>(window as unknown as {audioStarts:number}).audioStarts);await page.waitForTimeout(350);
  expect(await page.evaluate(()=>(window as unknown as {audioStarts:number}).audioStarts)).toBe(muted);
  await page.getByLabel('전체 음소거').uncheck();await page.getByRole('button',{name:'미리듣기 정지'}).click();await expect(page.locator('body')).not.toHaveAttribute('data-music-track',/./);
  await page.getByRole('button',{name:'BGM 들어보기',exact:true}).click();await page.goto('/');await expect(page.locator('body')).not.toHaveAttribute('data-music-track',/./);await expect.poll(()=>page.evaluate(()=>(window as unknown as {bgmPlayers:HTMLMediaElement[]}).bgmPlayers.every(p=>p.paused))).toBe(true);expect(errors).toEqual([]);
});

test('floor backgrounds and gym, champion, villain and rare music render in actual battles',async({page,context})=>{
  const cases=[{floor:1,scene:'meadow',track:'trainer'},{floor:4,scene:'hall',track:'trainer'},{floor:5,scene:'hall',track:'gym',boss:prototypeTrainers[5].boss},{floor:8,scene:'night',track:'trainer'},{floor:10,scene:'summit',track:'champion',boss:prototypeTrainers[10].boss},{floor:4,scene:'facility',track:'villain',boss:{...prototypeTrainers[5].boss,role:'villain' as const}},{floor:1,scene:'meadow',track:'rare',enemy:'Mewtwo'}];
  for(const item of cases){
    const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
    try{store.ensurePlayer(owner);const id=store.start(owner,starters);store.db.prepare('UPDATE runs SET floor=?, total_floors=10 WHERE id=?').run(item.floor,store.battle(id).run_id);store.db.prepare('UPDATE battles SET floor=?,opponent_team=?,boss=? WHERE id=?').run(item.floor,packTeam([item.enemy ?? 'Unown','Wobbuffet','Ditto']),item.boss ? JSON.stringify(item.boss) : null,id);}finally{store.close();}
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');
    await expect(page.getByTestId('action-grid')).toBeVisible();await expect(page.locator('.arena')).toHaveAttribute('data-scenery',item.scene);await expect(page.locator('body')).toHaveAttribute('data-music-track',item.track);
    await expect(page.locator('.player-position .pokemon-image-frame')).toHaveAttribute('data-framing-ready','true');await expect(page.locator('.enemy-position .pokemon-image-frame')).toHaveAttribute('data-framing-ready','true');
    for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
      await page.setViewportSize(viewport);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:`test-results/scenery-${item.scene}-${item.track}-${viewport.width}.png`,fullPage:true});
    }
    if(item.enemy){await page.reload();await expect(page.locator('body')).toHaveAttribute('data-music-track','rare');}
  }
});

test('reward, defeat and final clear screens use distinct music and stop on retry',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),store=new TowerStore('.data/e2e.sqlite');try{const owner=playerKey(token);store.ensurePlayer(owner);store.start(owner,starters);}finally{store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  const response=await page.request.get('/api/battle'),original=await response.json();
  for(const [state,track] of [['recruit','reward'],['lost','defeat'],['cleared','clear']] as const){
    const data=structuredClone(original);data.tower.run.state=state;data.battle.status='complete';data.battle.winner=state==='lost' ? 'Tower AI' : 'Player';data.battle.actions=[];
    await page.route('**/api/battle',route=>route.fulfill({json:data}));await page.goto('/battle');await expect(page.locator('body')).toHaveAttribute('data-music-track',track);
    if(state==='lost'){await page.getByRole('button',{name:'새 도전 준비',exact:true}).click();await expect(page.getByTestId('dex-list')).toBeVisible();await expect(page.locator('body')).not.toHaveAttribute('data-music-track',/./);}
    if(state==='cleared'){await page.getByRole('button',{name:'새로운 팀으로 다시 도전'}).click();await expect(page.getByTestId('dex-list')).toBeVisible();await expect(page.locator('body')).not.toHaveAttribute('data-music-track',/./);}
    await page.unroute('**/api/battle');
  }
});
