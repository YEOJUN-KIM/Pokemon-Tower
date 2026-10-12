import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
test('dex gender setting saves free and reaches the battle HP symbol',async({page,context})=>{
  const suffix=randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');let token='';
  try{const owner='gender-'+suffix;token=(await new Accounts(store.db).register('gender_'+suffix,'gender-password',owner,undefined)).token;store.ensurePlayer(owner);const entry=store.trainingCollection(owner).find(e=>e.species==='Charizard')!;store.train(owner,'Charizard',entry.revision,{...entry.profile,gender:'M'});}finally{store.close();}
  await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/pokedex');await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.getByRole('button',{name:'능력치 조정',exact:true}).click();await page.getByRole('tab',{name:'성격·특성·테라스탈',exact:true}).click();
  await page.getByRole('button',{name:'성별 선택',exact:true}).click();await page.getByRole('dialog',{name:'성별 선택',exact:true}).getByRole('button',{name:'♀ 암컷',exact:true}).click();await page.getByRole('button',{name:'0P로 설정 저장',exact:true}).click();
  await expect.poll(async()=>{const data=await page.request.get('/api/battle?view=collection').then(r=>r.json());return data.training.find((e:any)=>e.species==='Charizard').profile.gender;}).toBe('F');
  const response=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'start',selected:starters,rule:'basic'}});expect(response.ok(),await response.text()).toBe(true);
  await page.goto('/battle');await expect(page.locator('.player-health .pokemon-gender')).toHaveText('♀');await expect(page.locator('.team-panel')).not.toContainText('나의 팀');
  await expect(page.getByRole('group',{name:'내 남은 포켓몬 3 / 3',exact:true}).locator('.pokeball')).toHaveCount(3);
  const before=await page.request.get('/api/battle').then(r=>r.json());
  await page.keyboard.press('x');const menu=page.getByRole('dialog',{name:'배틀 메뉴',exact:true});
  await expect(menu.locator('.dex-action-options button')).toHaveText(['계속하기','도전 포기','포켓몬 도감','설정','타이틀']);
  await menu.getByRole('button',{name:'포켓몬 도감',exact:true}).click();await expect(page).toHaveURL("http://127.0.0.1:3001/pokedex?from=battle");
  await expect(page.getByRole('link',{name:'← 배틀로 돌아가기',exact:true})).toBeVisible();
  await page.keyboard.press('x');await expect(page).toHaveURL("http://127.0.0.1:3001/battle");await expect(page.locator('.player-health .pokemon-gender')).toHaveText('♀');
  const after=await page.request.get('/api/battle').then(r=>r.json());expect(after.battle.id).toBe(before.battle.id);expect(after.battle.requestId).toBe(before.battle.requestId);expect(after.tower.run.floor).toBe(before.tower.run.floor);
  await page.screenshot({path:'test-results/platinum-hp-gender.png',fullPage:true});
});
