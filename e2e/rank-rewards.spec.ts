import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import {rankRewardFixture} from '../tests/rank-reward-fixture';
import {finishChallengerBattle} from '../tests/challenger-fixture';
import {challengerDefinition} from '../src/data/challengers';
import {npcSamples} from '../src/data/npc-samples';
import {snapshotRankReward} from '../src/server/challenger-rewards';

test.beforeEach(()=>{const s=new TowerStore('.data/e2e.sqlite');try{s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();}finally{s.close();}});
for(const width of [1280,390])test(`rank previews hide rewards and Master exposes three actual choices only after victory at ${width}`,async({page,context})=>{
 const owner='rr_'+randomBytes(8).toString('hex'),f=rankRewardFixture('master',[.7,0],'.data/e2e.sqlite',owner),{store,run,event}=f;
 try{
  const auth=await new Accounts(store.db).register(owner,'rank-rewards-password',owner,undefined);
  const defs=(['normal','elite','master'] as const).map((rank,index)=>({...challengerDefinition(npcSamples[index],rank,20),...snapshotRankReward(store.db,run,rank,()=>0)}));
  defs[2]={...f.candidate,id:defs[2].id};store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify(defs),event.id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:900});await page.goto('/battle');
  const cards=page.getByTestId('challenger-candidates');for(const [index,preview] of ['소소한 보상','희귀한 보상','특별한 보상'].entries()){await page.keyboard.press(String(index+1));await expect(page.getByTestId('challenger-detail')).toContainText(preview);}await expect(page.getByTestId('challenger-detail')).not.toContainText('티켓');
  await expect(cards).not.toContainText('코인');await expect(cards).not.toContainText('티켓');await expect(cards).not.toContainText('1,500');
  mkdirSync('artifacts/qa/screenshots/rank-rewards',{recursive:true});await page.screenshot({path:`artifacts/qa/screenshots/rank-rewards/previews-${width}.png`});
  await cards.locator(`[data-challenger=${defs[2].id}]`).click();await page.getByRole('button',{name:'도전한다',exact:true}).click();await expect.poll(()=>store.view(owner).run!.state).toBe('battle');
  finishChallengerBattle(store,store.currentBattle(owner)!.id);await page.reload();const modal=page.getByTestId('reward-modal');await expect(modal).toBeVisible();
  await expect(modal.getByRole('button',{name:'슈퍼레어 알 티켓 1장',exact:true})).toBeVisible();await expect(modal.getByRole('button',{name:'확인',exact:true})).toBeDisabled();
  await expect(modal).toContainText('성장 포인트 1,500P');await expect(modal).toContainText('다이맥스밴드');
  await page.screenshot({path:`artifacts/qa/screenshots/rank-rewards/master-${width}.png`});
  await modal.getByRole('button',{name:'슈퍼레어 알 티켓 1장',exact:true}).click();await expect(modal).toContainText('선택 완료');await page.reload();await expect(modal).toContainText('선택 완료');
  const payload={type:'event-reward-select',runId:run,eventId:event.id,selectionId:'master-reward',candidateId:'eggs',effects:[{kind:'growth-points',amount:999999}]};
  const replies=await Promise.all([1,2].map(()=>page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:payload})));expect(replies.every(r=>r.ok())).toBe(true);expect(store.permanentView(owner).rewardEggTickets!.superRare).toBe(1);
  await modal.getByRole('button',{name:'확인',exact:true}).click();await expect(modal).toHaveCount(0);
  await page.goto('/upgrades');await page.getByRole('tab',{name:'알 뽑기',exact:true}).click();const ticket=page.getByRole('button',{name:/슈퍼레어 알 티켓.*1개 부화/});await expect(ticket).toBeVisible();await ticket.click();await expect(page.getByRole('dialog').filter({hasText:'부화'})).toBeVisible();expect(store.permanentView(owner).rewardEggTickets?.superRare??0).toBe(0);
 }finally{store.close();}
});
for(const [category,draw] of [['vitamin',.55],['epic',.8],['machine',.9]] as const)test(`Elite ${category}: automatic reward, usable inventory and no vitamin shop`,async({page,context})=>{
 const owner='ri_'+randomBytes(8).toString('hex'),f=rankRewardFixture('elite',[draw,0,0],'.data/e2e.sqlite',owner),{store,run,event,candidate}=f;
 try{
  const auth=await new Accounts(store.db).register(owner,'rank-rewards-password',owner,undefined);
  store.chooseEvent(owner,run,event.id,candidate.id);finishChallengerBattle(store,store.currentBattle(owner)!.id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width:390,height:844});await page.goto('/battle');
  const modal=page.getByTestId('reward-modal');await expect(modal).toBeVisible();await expect(modal).toContainText('희귀한 보상');await expect(modal.getByRole('button',{name:'선택하기 >'})).toHaveCount(0);
  await page.screenshot({path:`artifacts/qa/screenshots/rank-rewards/elite-${category}.png`});await modal.getByRole('button',{name:'확인',exact:true}).click();
  const entry=store.view(owner).run!.rewardInventory![0],inventory=page.getByRole('region',{name:'보상 보관함'}); // section's accessible name
  await expect(inventory).toBeVisible();await inventory.getByRole('button',{name:new RegExp(entry.label)}).click();const choice=entry.choices[0],label=store.view(owner).run!.roster.includes(choice.id)?({'Charizard':'리자몽','Blastoise':'거북왕','Venusaur':'이상해꽃'} as Record<string,string>)[choice.id]:choice.label;
  await inventory.getByRole('button',{name:label,exact:true}).click();await expect(inventory).toHaveCount(0);expect(store.view(owner).run!.rewardInventory!.length).toBe(0);
  store.db.prepare("UPDATE runs SET floor=21,state='select' WHERE id=?").run(run);await page.reload();await page.getByTestId('maintenance-shop').click();await expect(page.getByRole('button',{name:'육성',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'지닌 도구',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'기술머신',exact:true})).toBeVisible();
 }finally{store.close();}
});
